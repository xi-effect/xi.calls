import { useEffect, useRef } from 'react';
import type { LocalAudioTrack } from 'livekit-client';
import { useUserChoicesStore } from '@xipkg/calls-store';

type MicGainGraph = {
  ctx: AudioContext;
  gain: GainNode;
  source: MediaStreamAudioSourceNode;
  sourceTrack: MediaStreamTrack;
  gainedTrack: MediaStreamTrack;
};

async function swapTrackMedia(audioTrack: LocalAudioTrack, nextTrack: MediaStreamTrack) {
  try {
    await audioTrack.replaceTrack(nextTrack, { userProvidedTrack: true });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // PreJoin / preview: трек ещё не опубликован, RTCRtpSender нет
    if (!message.toLowerCase().includes('unpublished')) {
      throw error;
    }
  }

  // setMediaStreamTrack в LK private, но доступен в runtime для unpublished preview
  const setMediaStreamTrack = (
    audioTrack as unknown as {
      setMediaStreamTrack?: (track: MediaStreamTrack, force?: boolean) => Promise<void>;
    }
  ).setMediaStreamTrack;

  if (typeof setMediaStreamTrack === 'function') {
    await setMediaStreamTrack.call(audioTrack, nextTrack, true);
    return;
  }

  throw new Error('Unable to apply microphone volume: no replaceTrack/setMediaStreamTrack');
}

/**
 * Применяет microphoneVolume (0..1) к локальному аудиотреку через GainNode.
 * Обновление громкости — только gain.value; граф пересобирается при смене трека.
 */
export function useMicrophoneVolume(audioTrack: LocalAudioTrack | null | undefined) {
  const volume = useUserChoicesStore((s) => s.microphoneVolume ?? 1);
  const graphRef = useRef<MicGainGraph | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!audioTrack) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const sourceTrack = audioTrack.mediaStreamTrack;
        if (!sourceTrack || sourceTrack.readyState === 'ended') return;

        const ctx = new AudioContextCtor();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const source = ctx.createMediaStreamSource(new MediaStream([sourceTrack]));
        const gain = ctx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, volumeRef.current));
        const dest = ctx.createMediaStreamDestination();
        source.connect(gain);
        gain.connect(dest);

        const gainedTrack = dest.stream.getAudioTracks()[0];
        if (!gainedTrack) {
          await ctx.close().catch(() => undefined);
          return;
        }

        await swapTrackMedia(audioTrack, gainedTrack);
        if (cancelled) {
          await swapTrackMedia(audioTrack, sourceTrack).catch(() => undefined);
          gainedTrack.stop();
          source.disconnect();
          gain.disconnect();
          await ctx.close().catch(() => undefined);
          return;
        }

        graphRef.current = { ctx, gain, source, sourceTrack, gainedTrack };
      } catch (error) {
        console.error('Failed to apply microphone volume:', error);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      const current = graphRef.current;
      graphRef.current = null;
      if (!current) return;

      void (async () => {
        try {
          if (current.sourceTrack.readyState === 'live') {
            await swapTrackMedia(audioTrack, current.sourceTrack);
          }
        } catch {
          /* ignore */
        }
        try {
          current.source.disconnect();
          current.gain.disconnect();
        } catch {
          /* ignore */
        }
        try {
          current.gainedTrack.stop();
        } catch {
          /* ignore */
        }
        await current.ctx.close().catch(() => undefined);
      })();
    };
  }, [audioTrack]);

  useEffect(() => {
    const gain = graphRef.current?.gain;
    if (!gain) return;
    const next = Math.max(0, Math.min(1, volume));
    gain.gain.setTargetAtTime(next, gain.context.currentTime, 0.02);
  }, [volume]);
}
