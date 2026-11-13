import {
  ControlBarProps,
  useLocalParticipant,
  usePersistentUserChoices,
  useTrackToggle,
  useTracks,
} from '@livekit/components-react';
import { LocalAudioTrack, LocalVideoTrack, Track } from 'livekit-client';
import { useCallback, useRef, useState } from 'react';
import {
  DisconnectButton,
  LessonRecordButton,
  ScreenShareButton,
  WhiteBoardButton,
  DevicesBar,
} from '@xipkg/calls-ui';
import { useCannotUseDevice, useDeviceMenuGroups } from '@xipkg/calls-hooks';
import { ChatButton, useChatStore } from '@xipkg/calls-chat';
import { openPermissionsDialog, useCallStore, useFocusModeStore } from '@xipkg/calls-store';
import { cn } from '@xipkg/utils';
import {
  ArrowLeft,
  CameraOff,
  Conference,
  Grid,
  Microphone,
  MicrophoneOff,
  RedLine,
  Speaker,
  SpeakerHorizontal,
  FileSmall,
  WhiteBoard,
} from '@xipkg/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import { Button } from '@xipkg/button';
import {
  navigateToSharedMaterial,
  useRoom,
  useCalls,
  useCallsNavigation,
} from '@xipkg/calls-providers';
import { useCallBackNavigation } from '@xipkg/calls-hooks';
import { ONBOARDING_IDS } from '@xipkg/calls-config';
import { RaiseHandButton } from '@xipkg/calls-risehand';
import { ReactionButton } from '@xipkg/calls-reactions';
import { Settings } from '@xipkg/calls-ui';
import { useMedia } from '@xipkg/calls-utils';
import { MobileCommandSheet } from './MobileCommandSheet';
import { MobileDeviceDrawer } from './MobileDeviceDrawer';
import { MobileMediaButton } from './MobileMediaButton';
import { useTranslation } from 'react-i18next';

export const BottomBar = ({ saveUserChoices = true }: ControlBarProps) => {
  const { t } = useTranslation('calls');
  const isMobile = useMedia('(max-width: 720px)');
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const devicesOpenedAt = useRef(0);
  const { saveAudioInputEnabled, saveVideoInputEnabled } = usePersistentUserChoices({
    preventSave: !saveUserChoices,
  });

  const { isMicrophoneEnabled, isCameraEnabled, microphoneTrack, cameraTrack } =
    useLocalParticipant();

  const audioTrack = microphoneTrack?.track as LocalAudioTrack | undefined;
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;

  const { microphoneGroups, cameraGroups } = useDeviceMenuGroups();
  const microphoneBlocked = useCannotUseDevice('audioinput');
  const cameraBlocked = useCannotUseDevice('videoinput');

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
  const { mode, activeBoardId, activeMaterialKind, activeClassroom, token } = useCallStore();
  const updateStore = useCallStore((state) => state.updateStore);
  const { room } = useRoom();
  const navigation = useCallsNavigation();

  const calls = useCalls();
  const { useCurrentUser } = calls.auth;
  const { data: user } = useCurrentUser();
  const callId = navigation.getCallId();
  const { data: classroom } = calls.room.useGetClassroom(Number(callId));
  const { leaveToClassroom } = useCallBackNavigation();
  const { focusMode, setFocusMode } = useFocusModeStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const carouselType = useCallStore((state) => state.carouselType);
  const preferredFocusLayout = useCallStore((state) => state.preferredFocusLayout);
  const layoutTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
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

    navigateToSharedMaterial(navigation, activeBoardId, activeClassroom, activeMaterialKind);
  };

  const hasScreenShare = layoutTracks.some(
    (track) =>
      track.publication?.source === Track.Source.ScreenShare && track.publication?.isSubscribed,
  );
  const participantCount = layoutTracks.filter(
    (track) => track.source === Track.Source.Camera,
  ).length;
  const canUseFocusLayout = hasScreenShare || participantCount > 2;

  const toggleLayout = () => {
    const nextType = carouselType === 'grid' && canUseFocusLayout ? preferredFocusLayout : 'grid';
    updateStore('carouselType', nextType);
  };

  const viewIcon =
    carouselType === 'horizontal' ? (
      <Speaker className="fill-icon-primary" />
    ) : carouselType === 'vertical' ? (
      <SpeakerHorizontal className="fill-icon-primary" />
    ) : (
      <Grid className="fill-icon-primary" />
    );

  const mobileControlClass =
    'bg-background-surface border-border-default flex h-12 w-full items-center justify-center rounded-2xl border p-0';

  if (isMobile) {
    return (
      <div
        className={cn(
          'flex w-full shrink-0 flex-col px-4 pt-1 pb-[max(12px,env(safe-area-inset-bottom))]',
          isChatOpen && 'invisible',
        )}
      >
        {classroom?.name ? (
          <p className="text-text-secondary mb-1 truncate text-left text-xs leading-4">
            {classroom.name}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            id={ONBOARDING_IDS.BACK_BUTTON}
            type="button"
            variant="none"
            className={cn(mobileControlClass, 'min-w-0 flex-1')}
            aria-label={t('upBar.backTooltip')}
            data-umami-event="call-back-button"
            onClick={() => {
              if (focusMode) setFocusMode(false);
              leaveToClassroom();
            }}
          >
            <ArrowLeft className="fill-icon-primary" />
          </Button>
          <MobileMediaButton
            label={t('bottomBar.microphone')}
            enabled={isMicrophoneEnabled}
            permissionBlocked={microphoneBlocked}
            audioTrack={audioTrack}
            className={cn(mobileControlClass, 'min-w-0 flex-1')}
            umamiEvent="call-toggle-microphone"
            onToggle={() => {
              if (microphoneBlocked) {
                openPermissionsDialog();
                return;
              }
              void handleMicrophoneToggle(!isMicrophoneEnabled);
            }}
            onLongPress={() => {
              devicesOpenedAt.current = Date.now();
              setDevicesOpen(true);
            }}
          >
            <span className="relative flex h-6 w-6 items-center justify-center">
              {isMicrophoneEnabled && !microphoneBlocked ? (
                <Microphone className="fill-status-success-text h-6 w-6" />
              ) : (
                <>
                  <MicrophoneOff className="fill-icon-primary h-6 w-6" />
                  <RedLine className="fill-icon-danger absolute h-6 w-6" />
                </>
              )}
            </span>
          </MobileMediaButton>
          <MobileMediaButton
            label={t('bottomBar.camera')}
            enabled={isCameraEnabled}
            permissionBlocked={cameraBlocked}
            className={cn(mobileControlClass, 'min-w-0 flex-1')}
            umamiEvent="call-toggle-camera"
            onToggle={() => {
              if (cameraBlocked) {
                openPermissionsDialog();
                return;
              }
              void handleCameraToggle(!isCameraEnabled);
            }}
            onLongPress={() => {
              devicesOpenedAt.current = Date.now();
              setDevicesOpen(true);
            }}
          >
            <span className="relative flex h-6 w-6 items-center justify-center">
              {isCameraEnabled && !cameraBlocked ? (
                <Conference className="fill-status-success-text h-6 w-6" />
              ) : (
                <>
                  <CameraOff className="fill-icon-primary h-6 w-6" />
                  <RedLine className="fill-icon-danger absolute h-6 w-6" />
                </>
              )}
            </span>
          </MobileMediaButton>
          <div className={cn(mobileControlClass, 'min-w-0 flex-1')}>
            <RaiseHandButton className="h-10 w-10" />
          </div>
          <div className="min-w-0 flex-1">
            <MobileCommandSheet
              open={commandsOpen}
              onOpenChange={setCommandsOpen}
              viewIcon={viewIcon}
              viewDisabled={!canUseFocusLayout && carouselType === 'grid'}
              viewLayout={carouselType}
              onToggleView={toggleLayout}
              showBoard={!!isTutor}
              showBackToBoard={Boolean(showBackToBoardButton)}
              onBackToBoard={handleBackToBoard}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        </div>
        <Settings open={settingsOpen} onOpenChange={setSettingsOpen}>
          <span className="sr-only">{t('settings.title')}</span>
        </Settings>
        <MobileDeviceDrawer
          open={devicesOpen}
          onOpenChange={(open) => {
            // Палец ещё на кнопке, когда шит появляется под ним: ближайший
            // pointerup иначе считается кликом по оверлею и сразу закрывает меню.
            if (!open && Date.now() - devicesOpenedAt.current < 500) return;
            setDevicesOpen(open);
          }}
          groups={[...microphoneGroups, ...cameraGroups]}
        />
      </div>
    );
  }

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
                deviceGroups: microphoneGroups,
              }}
              videoTrack={videoTrack}
              videoEnabled={isCameraEnabled}
              videoTrackToggle={{
                showIcon: true,
                source: Track.Source.Camera,
                onChange: handleCameraToggle,
                deviceGroups: cameraGroups,
              }}
              className="relative"
            />
          </div>
          <div className="bg-background-surface border-border-default flex h-[48px] items-center justify-center gap-1 rounded-[16px] border p-1">
            <LessonRecordButton />
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
                  {activeMaterialKind === 'note' ? (
                    <FileSmall className="fill-action-primary-text h-5 w-5" />
                  ) : (
                    <WhiteBoard className="fill-action-primary-text h-5 w-5" />
                  )}
                  <span className="text-text-on-accent ml-2">
                    {t(activeMaterialKind === 'note' ? 'bottomBar.toNote' : 'bottomBar.toBoard')}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                {t(
                  activeMaterialKind === 'note'
                    ? 'bottomBar.toNoteTooltip'
                    : 'bottomBar.toBoardTooltip',
                )}
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
