import { useEffect, useRef, useState } from 'react';
import type { LocalAudioTrack } from 'livekit-client';
import { useUserChoicesStore } from '@xipkg/calls-store';
import { MicrophoneGainProcessor } from './microphoneGainProcessor';
import {
  claimMicProcessorSlot,
  currentMicProcessorOwner,
  releaseMicProcessorSlot,
  subscribeMicProcessorSlot,
} from './micProcessorOwnership';

const GAIN_PROCESSOR_OWNER = 'xi-microphone-gain';

function getOrCreateAudioContext(audioTrack: LocalAudioTrack): AudioContext | undefined {
  // В комнате Room сам проставляет общий audioContext на LocalAudioTrack (см.
  // Room.acquireAudioContext -> localParticipant.setAudioContext). В PreJoin трек создаётся
  // без комнаты, поэтому audioContext там ещё не установлен — LiveKit в этом случае
  // ЗАПРЕЩАЕТ setProcessor() (бросает ошибку), значит нужно создать контекст сами.
  const existing = (audioTrack as unknown as { audioContext?: AudioContext }).audioContext;
  if (existing) return existing;

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return undefined;

  const ctx = new AudioContextCtor();
  audioTrack.setAudioContext(ctx);
  return ctx;
}

/**
 * Применяет microphoneVolume (0..1) к локальному аудиотреку через GainNode, оформленный как
 * штатный LiveKit TrackProcessor (см. microphoneGainProcessor.ts) — тот же механизм, на
 * котором работают Krisp/virtual background. Это даёт два принципиальных отличия от ручной
 * подмены трека через replaceTrack():
 *
 * 1. LiveKit сам вызывает processor.restart() при КАЖДОЙ замене реального
 *    MediaStreamTrack (mute/unmute-триггерный reacquire, смена устройства и т.п.) — граф
 *    больше не может остаться висеть на протухшем источнике незаметно для остального кода.
 * 2. Процессор сам следит за своим здоровьем (вотчдог на входном/выходном AnalyserNode) и
 *    при необходимости откатывается на сырой трек — звук не пропадает даже если сам Web
 *    Audio graph «завис» (известный баг браузеров: ctx.state остаётся "running", хотя
 *    рендер-тред фактически не работает после сворачивания вкладки).
 *
 * ВАЖНО: граф создаётся ТОЛЬКО когда громкость отличается от значения по умолчанию (1).
 * Этот хук монтируется в ActiveRoom, PreJoin и SoundAndVideoSettings; большинство звонков
 * никогда не трогают пользовательскую громкость, так что для них Web Audio API вообще не
 * задействуется.
 */
export function useMicrophoneVolume(audioTrack: LocalAudioTrack | null | undefined) {
  const volume = useUserChoicesStore((s) => s.microphoneVolume ?? 1);
  const processorRef = useRef<MicrophoneGainProcessor | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const hasCustomVolume = volume !== 1;
  const [processorSlotRevision, setProcessorSlotRevision] = useState(0);

  useEffect(() => {
    if (!audioTrack) return;
    return subscribeMicProcessorSlot(audioTrack, () => {
      if (currentMicProcessorOwner(audioTrack) !== GAIN_PROCESSOR_OWNER) {
        setProcessorSlotRevision((revision) => revision + 1);
      }
    });
  }, [audioTrack]);

  useEffect(() => {
    if (!audioTrack || !hasCustomVolume) return;

    let cancelled = false;

    const setup = async () => {
      try {
        // Слот процессора на треке общий с useNoiseCancellation (Krisp) — если тот уже
        // владеет слотом, не отбираем и не трогаем track.setProcessor() вообще: громкость
        // в этом случае не применится, но звук останется целым (не гоняемся за чужим
        // слотом и не сносим чужой процессор).
        if (!claimMicProcessorSlot(audioTrack, GAIN_PROCESSOR_OWNER)) {
          console.warn(
            'useMicrophoneVolume: слот processor уже занят (вероятно, Krisp), громкость не применена',
          );
          return;
        }

        const ctx = getOrCreateAudioContext(audioTrack);
        if (!ctx) {
          releaseMicProcessorSlot(audioTrack, GAIN_PROCESSOR_OWNER);
          return;
        }

        const processor = new MicrophoneGainProcessor(() => volumeRef.current);
        await audioTrack.setProcessor(processor);
        if (cancelled) {
          await audioTrack.stopProcessor().catch(() => undefined);
          releaseMicProcessorSlot(audioTrack, GAIN_PROCESSOR_OWNER);
          return;
        }

        processorRef.current = processor;
      } catch (error) {
        console.error('Failed to apply microphone volume:', error);
        releaseMicProcessorSlot(audioTrack, GAIN_PROCESSOR_OWNER);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      const current = processorRef.current;
      processorRef.current = null;
      if (!current) return;

      // stopProcessor() — штатный метод LiveKit: он гарантированно возвращает на sender
      // сырой _mediaStreamTrack (applyConstraints + forced setMediaStreamTrack), независимо
      // от внутреннего состояния нашего графа.
      if (audioTrack.getProcessor() === current) {
        void audioTrack.stopProcessor().catch((error) => {
          console.error('Failed to restore original microphone track:', error);
        });
      }
      releaseMicProcessorSlot(audioTrack, GAIN_PROCESSOR_OWNER);
    };
  }, [audioTrack, hasCustomVolume, processorSlotRevision]);

  useEffect(() => {
    processorRef.current?.setVolume(volume);
  }, [volume]);
}
