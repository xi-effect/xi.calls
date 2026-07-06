import { useLocalParticipant } from '@livekit/components-react';
import { LocalVideoTrack } from 'livekit-client';
import { Chat } from '@xipkg/calls-chat';
import { UpBar, VideoGrid, CallsOnboarding } from '@xipkg/calls-ui';
import { useCallStore } from '@xipkg/calls-store';
import { useVideoBlur } from '@xipkg/calls-hooks';
import { useHandFocus } from '@xipkg/calls-risehand';
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
  // Получаем видео трек для применения блюра
  const { cameraTrack } = useLocalParticipant();
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;

  // Применяем блюр только в полном режиме
  const mode = useCallStore((state) => state.mode);
  const videoTrackForBlur = mode === 'full' ? videoTrack : null;
  useVideoBlur(videoTrackForBlur);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CallsOnboarding />
      <div className="shrink-0">
        <UpBar />
      </div>
      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-4 overflow-hidden sm:px-4">
        <div className="flex min-h-0 w-full min-w-0 flex-1 justify-center text-center text-gray-100">
          <VideoGrid />
        </div>
        <Chat />
      </div>
      <BottomBar />
    </div>
  );
};
