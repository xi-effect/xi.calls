import { useLocalParticipant } from '@livekit/components-react';
import { LocalVideoTrack } from 'livekit-client';
import { Chat } from 'calls.chat';
import { UpBar, VideoGrid, CallsOnboarding } from 'calls.ui';
import { useCallStore, useFeaturesStore } from 'calls.store';
import { useVideoBlur, useParticipantJoinSync, useHandFocus } from 'calls.hooks';
import { BottomBar } from '../Bottom/BottomBar';
import 'calls.ui/video-security.css';

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
        <div className="flex h-full items-center justify-center gap-4 overflow-hidden px-4">
          <div className="flex h-auto w-full justify-center text-center text-gray-100">
            <VideoGrid />
          </div>
          {isChatEnabled && <Chat />}
        </div>
        <BottomBar />
      </div>
    </div>
  );
};
