import { useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { Chat } from '@xipkg/calls-chat';
import { UpBar, VideoGrid, CallsOnboarding, TutorCallGuide } from '@xipkg/calls-ui';
import { useCallStore, useFocusModeStore } from '@xipkg/calls-store';
import { useMedia } from '@xipkg/calls-utils';
import { cn } from '@xipkg/utils';
import {
  useMicrophoneVolume,
  useNoiseCancellation,
  useVideoBlur,
  useVoiceEnhancement,
} from '@xipkg/calls-hooks';
import { useRoom } from '@xipkg/calls-providers';
import { useHandFocus } from '@xipkg/calls-risehand';
import { ReactionsOverlay } from '@xipkg/calls-reactions';
import { BottomBar } from '../Bottom/BottomBar';
import '@xipkg/calls-ui/video-security.css';
import '@xipkg/calls-ui/grid.css';

export const ActiveRoom = () => {
  // Автоматический фокус на участниках с поднятыми руками
  useHandFocus();
  // useParticipantJoinSync/useParticipantSounds уже монтируются один раз в CompactView,
  // который является обязательной обёрткой над Call (см. docs/migrations). Раньше они
  // дублировались и здесь, из-за чего на full-режиме параллельно работали два независимых
  // экземпляра синхронизации — двойные data-channel рассылки при смене режима/участников
  // усиливали "шторм" сообщений в момент перехода на доску.
  const { room } = useRoom();
  const isMobile = useMedia('(max-width: 720px)');
  const setFocusMode = useFocusModeStore((state) => state.setFocusMode);

  useEffect(() => {
    return () => setFocusMode(false);
  }, [setFocusMode]);
  const { cameraTrack, microphoneTrack } = useLocalParticipant();
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;
  const audioTrack = microphoneTrack?.track as LocalAudioTrack | undefined;

  // Применяем блюр только в полном режиме (в compact — CompactCall)
  const mode = useCallStore((state) => state.mode);
  const screenShareStageIdentity = useCallStore((state) => state.screenShareStageIdentity);
  const videoTrackForBlur = mode === 'full' ? videoTrack : null;
  useVideoBlur(videoTrackForBlur);
  // WASM подключается только после входа в комнату: PreJoin и публикация обычного
  // микрофона не зависят от загрузки тяжёлого lazy chunk.
  useVoiceEnhancement({ localAudioTrack: audioTrack, manageTrack: true });
  // Громкость mic и NC — всегда, пока идёт звонок (ActiveRoom смонтирован и в compact).
  useMicrophoneVolume(audioTrack);
  useNoiseCancellation(room);

  // Демонстрация на весь экран: интерфейс звонка скрыт, хуки комнаты остаются.
  if (screenShareStageIdentity) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CallsOnboarding />
      <TutorCallGuide surface="conference" />
      {isMobile ? null : (
        <div className="shrink-0">
          <UpBar />
        </div>
      )}
      <div
        className={cn(
          'flex min-h-0 flex-1 items-stretch justify-center gap-4 overflow-hidden sm:px-4',
          isMobile && 'pt-[env(safe-area-inset-top)]',
        )}
      >
        <div className="text-text-primary relative flex min-h-0 w-full min-w-0 flex-1 justify-center">
          <VideoGrid />
          <ReactionsOverlay />
        </div>
        <Chat />
      </div>
      <BottomBar />
    </div>
  );
};
