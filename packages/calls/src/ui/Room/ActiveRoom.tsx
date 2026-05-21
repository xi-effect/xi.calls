import { useLocalParticipant } from '@livekit/components-react';
import { LocalVideoTrack } from 'livekit-client';
import { Chat } from '@xipkg/calls-chat';
import { UpBar, VideoGrid, CallsOnboarding } from '@xipkg/calls-ui';
import { useCallStore, useFeaturesStore } from '@xipkg/calls-store';
import { useVideoBlur, useParticipantJoinSync } from '@xipkg/calls-hooks';
import { useHandFocus } from '@xipkg/calls-risehand';
import { BottomBar } from '../Bottom/BottomBar';
import '@xipkg/calls-ui/video-security.css';

export const ActiveRoom = () => {
  const { chat: isChatEnabled } = useFeaturesStore((s) => s.features);

  // Автоматический фокус на участниках с поднятыми руками
  useHandFocus();
  // Синхронизация состояния при подключении новых участников
  useParticipantJoinSync();
  // Получаем видео трек для применения блюра
  const { cameraTrack } = useLocalParticipant();
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;

  // Применяем блюр только в полном режиме
  const mode = useCallStore((state) => state.mode);
  const videoTrackForBlur = mode === 'full' ? videoTrack : null;
  useVideoBlur(videoTrackForBlur);

  return (
    <div id="videoConferenceContainer" className="bg-gray-0 h-full">
      <div className="flex h-full flex-col justify-stretch">
        <CallsOnboarding />
        <UpBar />
        <div className="flex h-full items-center justify-center gap-4 overflow-hidden p-4">
          <div className="flex h-full w-full justify-center text-center text-gray-100">
            <VideoGrid />
          </div>
          {isChatEnabled && <Chat />}
        </div>
        <BottomBar />
      </div>
    </div>
  );
};
