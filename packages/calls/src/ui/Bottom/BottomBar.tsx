import {
  ControlBarProps,
  useLocalParticipant,
  useMediaDeviceSelect,
  usePersistentUserChoices,
  useTrackToggle,
} from '@livekit/components-react';
import { LocalAudioTrack, LocalVideoTrack, Track } from 'livekit-client';
import { useCallback, useMemo } from 'react';
import { DisconnectButton, ScreenShareButton, WhiteBoardButton, DevicesBar } from '@xipkg/calls-ui';
import { useSwitchDevice, useResolvedActiveDeviceId } from '@xipkg/calls-hooks';
import { ChatButton, useChatStore } from '@xipkg/calls-chat';
import { useCallStore } from '@xipkg/calls-store';
import { cn } from '@xipkg/utils';
import { excludeOsDefaultDevices } from '@xipkg/calls-utils';
import { WhiteBoard } from '@xipkg/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import { Button } from '@xipkg/button';
import { useRoom, useCalls, useCallsNavigation } from '@xipkg/calls-providers';
import { RaiseHandButton } from '@xipkg/calls-risehand';
import { ReactionButton } from '@xipkg/calls-reactions';
import { useTranslation } from 'react-i18next';

export const BottomBar = ({ saveUserChoices = true }: ControlBarProps) => {
  const { t } = useTranslation('calls');
  const {
    userChoices: { audioDeviceId, videoDeviceId },
    saveAudioInputEnabled,
    saveVideoInputEnabled,
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
  } = usePersistentUserChoices({
    preventSave: !saveUserChoices,
  });

  const { isMicrophoneEnabled, isCameraEnabled, microphoneTrack, cameraTrack } =
    useLocalParticipant();

  const audioTrack = microphoneTrack?.track as LocalAudioTrack | undefined;
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;

  const { devices: rawAudioDevices, activeDeviceId: activeAudioDeviceId } = useMediaDeviceSelect({
    kind: 'audioinput',
  });
  const { devices: rawVideoDevices, activeDeviceId: activeVideoDeviceId } = useMediaDeviceSelect({
    kind: 'videoinput',
  });
  const audioDevices = useMemo(() => excludeOsDefaultDevices(rawAudioDevices), [rawAudioDevices]);
  const videoDevices = useMemo(() => excludeOsDefaultDevices(rawVideoDevices), [rawVideoDevices]);

  const { switchDeviceHandler: handleSelectAudioDevice, pendingDeviceId: pendingAudioDeviceId } =
    useSwitchDevice({
      track: audioTrack,
      activeDeviceId: activeAudioDeviceId,
      saveDeviceId: saveAudioInputDeviceId,
      saveEnabled: saveAudioInputEnabled,
      errorMessage: 'Failed to switch microphone device',
    });

  const { switchDeviceHandler: handleSelectVideoDevice, pendingDeviceId: pendingVideoDeviceId } =
    useSwitchDevice({
      track: videoTrack,
      activeDeviceId: activeVideoDeviceId,
      saveDeviceId: saveVideoInputDeviceId,
      saveEnabled: saveVideoInputEnabled,
      errorMessage: 'Failed to switch camera device',
    });

  const resolvedAudioDeviceId = useResolvedActiveDeviceId(audioDevices, activeAudioDeviceId, {
    track: audioTrack,
    pendingDeviceId: pendingAudioDeviceId,
    fallbackDeviceId: audioDeviceId,
  });
  const resolvedVideoDeviceId = useResolvedActiveDeviceId(videoDevices, activeVideoDeviceId, {
    track: videoTrack,
    pendingDeviceId: pendingVideoDeviceId,
    fallbackDeviceId: videoDeviceId,
  });

  const microphoneToggle = useTrackToggle({
    source: Track.Source.Microphone,
    onChange: (enabled: boolean, isUserInitiated: boolean) => {
      if (isUserInitiated) {
        saveAudioInputEnabled(enabled);
      }
    },
  });

  const cameraToggle = useTrackToggle({
    source: Track.Source.Camera,
    onChange: (enabled: boolean, isUserInitiated: boolean) => {
      if (isUserInitiated) {
        saveVideoInputEnabled(enabled);
      }
    },
  });

  const handleMicrophoneToggle = useCallback(
    async (enabled: boolean) => {
      await microphoneToggle.toggle(enabled);
    },
    [microphoneToggle],
  );

  const handleCameraToggle = useCallback(
    async (enabled: boolean) => {
      await cameraToggle.toggle(enabled);
    },
    [cameraToggle],
  );

  const { isChatOpen } = useChatStore();
  const { mode, activeBoardId, activeClassroom, token } = useCallStore();
  const updateStore = useCallStore((state) => state.updateStore);
  const { room } = useRoom();
  const navigation = useCallsNavigation();

  const { useCurrentUser } = useCalls().auth;
  const { data: user } = useCurrentUser();
  const isTutor = user?.default_layout === 'tutor';

  const showBackToBoardButton =
    mode === 'full' &&
    activeBoardId &&
    activeClassroom &&
    room &&
    token &&
    room.state === 'connected';

  const handleBackToBoard = () => {
    if (!activeBoardId || !activeClassroom) {
      return;
    }

    if (!room || !token || room.state !== 'connected') {
      return;
    }

    updateStore('localFullView', false);
    updateStore('mode', 'compact');

    navigation.navigateToClassroomBoard(activeClassroom, activeBoardId);
  };

  return (
    <div
      className={cn(
        'relative w-full shrink-0 pb-[max(0px,env(safe-area-inset-bottom))]',
        isChatOpen && 'max-sm:invisible',
      )}
    >
      <div className="flex w-full flex-row justify-between p-4 pt-1">
        <div className="flex flex-row items-center gap-4">
          <div className="bg-background-surface border-border-default flex h-[48px] w-[48px] items-center justify-center rounded-[16px] border p-1">
            <ReactionButton />
          </div>
        </div>
        <div className="flex flex-row gap-4">
          <div className="bg-background-surface border-border-default flex h-[48px] w-[92px] items-center justify-center gap-1 rounded-[16px] border">
            <DevicesBar
              microTrack={audioTrack}
              microEnabled={isMicrophoneEnabled}
              microTrackToggle={{
                showIcon: true,
                source: Track.Source.Microphone,
                onChange: handleMicrophoneToggle,
                devices: audioDevices,
                activeDeviceId: resolvedAudioDeviceId,
                onSelectDevice: handleSelectAudioDevice,
              }}
              videoTrack={videoTrack}
              videoEnabled={isCameraEnabled}
              videoTrackToggle={{
                showIcon: true,
                source: Track.Source.Camera,
                onChange: handleCameraToggle,
                devices: videoDevices,
                activeDeviceId: resolvedVideoDeviceId,
                onSelectDevice: handleSelectVideoDevice,
              }}
              className="relative"
            />
          </div>
          <div className="bg-background-surface border-border-default flex h-[48px] items-center justify-center gap-1 rounded-[16px] border p-1">
            <ScreenShareButton />
            {isTutor && <WhiteBoardButton />}
            <ChatButton />
            <RaiseHandButton />
          </div>
        </div>
        <div className="relative flex flex-row items-center justify-center gap-4">
          {showBackToBoardButton && (
            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Button
                  size="m"
                  variant="default"
                  onClick={handleBackToBoard}
                  className="bg-action-primary-background-pressed hover:bg-action-primary-background-default absolute top-1 left-[-132px] m-0 h-10 w-[128px] rounded-xl px-2"
                  data-umami-event="call-back-to-board"
                >
                  <WhiteBoard className="fill-action-primary-text h-5 w-5" />
                  <span className="text-text-on-accent ml-2">{t('bottomBar.toBoard')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                {t('bottomBar.toBoardTooltip')}
              </TooltipContent>
            </Tooltip>
          )}
          <div className="bg-background-surface border-border-default flex h-[48px] w-[48px] items-center justify-center gap-1 rounded-[16px] border p-1">
            <DisconnectButton />
          </div>
        </div>
      </div>
    </div>
  );
};
