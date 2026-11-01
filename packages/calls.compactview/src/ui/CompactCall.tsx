import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  useLocalParticipant,
  usePersistentUserChoices,
  useTrackToggle,
} from '@livekit/components-react';
import { LocalAudioTrack, LocalVideoTrack, Track } from 'livekit-client';
import { useCallStore, type CompactViewModeT } from '@xipkg/calls-store';
import { useClassroomPins, useDeviceMenuGroups } from '@xipkg/calls-hooks';
import { useCompactAvailableHeight, useCompactNavigation } from '../hooks';
import { useVideoBlur, useSyncModeToOthers } from '@xipkg/calls-hooks';
import { useRoom, useCalls, useCallsNavigation } from '@xipkg/calls-providers';
import { usePiP } from '../providers';
import { usePhoneLayout } from '@xipkg/calls-utils';
import { CompactCallVideoArea } from './CompactCallVideoArea';
import { CompactCallBottomBar } from './CompactCallBottomBar';
import {
  COMPACT_BOTTOM_BAR_PX,
  COMPACT_PANEL_WIDTH_PX,
  COMPACT_VIDEO_AREA_MARGIN_PX,
  EXPANDED_VIDEO_PADDING_VERTICAL_PX,
  TILE_GAP_PX,
  TILE_HEIGHT_16_9_PX,
  getNextCompactViewMode,
} from '../constants';

export const CompactCall = ({
  saveUserChoices = true,
  withOutShadows = false,
  freeDrag = false,
  stageFrame = null,
}: {
  saveUserChoices?: boolean;
  withOutShadows?: boolean;
  /** Панель тащится целиком в любую точку, в том числе на телефоне */
  freeDrag?: boolean;
  /**
   * Поверх демонстрации. lockCompactModes — только портрет:
   * в альбоме оставляем 16:9 и переключение на «только звук».
   */
  stageFrame?: { width: number; tileHeight: number; lockCompactModes?: boolean } | null;
}) => {
  const isMobile = usePhoneLayout();
  const lockCompactModes = stageFrame?.lockCompactModes === true;
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: freeDrag ? 'screen-share-stage-compact' : 'draggable-call',
    disabled: freeDrag ? false : isMobile,
  });
  const style =
    !freeDrag && isMobile ? undefined : { transform: CSS.Translate.toString(transform) };

  const { saveAudioInputEnabled, saveVideoInputEnabled } = usePersistentUserChoices({
    preventSave: !saveUserChoices,
  });
  const { isMicrophoneEnabled, isCameraEnabled, microphoneTrack, cameraTrack } =
    useLocalParticipant();
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;

  const mode = useCallStore((state) => state.mode);
  useVideoBlur(mode === 'compact' ? videoTrack : null);

  const microphoneToggle = useTrackToggle({
    source: Track.Source.Microphone,
    onChange: (enabled: boolean, isUserInitiated: boolean) => {
      if (isUserInitiated) saveAudioInputEnabled(enabled);
    },
  });
  const cameraToggle = useTrackToggle({
    source: Track.Source.Camera,
    onChange: (enabled: boolean, isUserInitiated: boolean) => {
      if (isUserInitiated) saveVideoInputEnabled(enabled);
    },
  });

  const handleMicrophoneToggle = useCallback(
    (enabled: boolean) => microphoneToggle.toggle(enabled),
    [microphoneToggle],
  );
  const handleCameraToggle = useCallback(
    (enabled: boolean) => cameraToggle.toggle(enabled),
    [cameraToggle],
  );

  const { microphoneGroups, cameraGroups } = useDeviceMenuGroups();

  const compactNavigation = useCompactNavigation();
  const {
    currentParticipant,
    participants,
    currentIndex,
    totalParticipants,
    canGoNext,
    canGoPrev,
    goToNext,
    goToPrev,
  } = compactNavigation;
  const callsNavigation = useCallsNavigation();
  const pip = usePiP();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const compactViewMode = useCallStore((state) => state.compactViewMode);
  const updateStore = useCallStore((state) => state.updateStore);
  const setCompactViewMode = useCallback(
    (mode: CompactViewModeT) => updateStore('compactViewMode', mode),
    [updateStore],
  );
  const [multiScrollIndex, setMultiScrollIndex] = useState(0);

  const currentAudioTrack = currentParticipant?.participant?.getTrackPublication(
    Track.Source.Microphone,
  )?.track as
    | import('livekit-client').RemoteAudioTrack
    | import('livekit-client').LocalAudioTrack
    | undefined;

  const syncModeToOthers = useSyncModeToOthers();
  const activeBoardId = useCallStore((state) => state.activeBoardId);
  const activeClassroom = useCallStore((state) => state.activeClassroom);
  const { room } = useRoom();
  const token = useCallStore((state) => state.token);

  const { data: user } = useCalls().auth.useCurrentUser();

  const isTutor = user?.default_layout === 'tutor';
  const isBoardPage = callsNavigation.pathnameIncludes('/board');
  const isOnBoardPage =
    callsNavigation.params.classroomId === activeClassroom &&
    callsNavigation.params.boardId === activeBoardId;
  const showBackToBoardButton =
    mode === 'compact' && !!activeBoardId && !!activeClassroom && !isOnBoardPage;

  const availableHeight = useCompactAvailableHeight(isBoardPage);

  const multiViewLayout = useMemo(() => {
    const heightForTiles = Math.max(
      0,
      availableHeight -
        COMPACT_BOTTOM_BAR_PX -
        EXPANDED_VIDEO_PADDING_VERTICAL_PX -
        COMPACT_VIDEO_AREA_MARGIN_PX,
    );
    // Плитки имеют aspect-video (16:9), их высота фиксирована шириной контейнера
    const visibleCount = Math.min(
      totalParticipants,
      Math.max(1, Math.floor((heightForTiles + TILE_GAP_PX) / (TILE_HEIGHT_16_9_PX + TILE_GAP_PX))),
    );
    return { visibleCount, tileHeightPx: TILE_HEIGHT_16_9_PX };
  }, [availableHeight, totalParticipants]);

  const { visibleCount: multiVisibleCount, tileHeightPx: multiTileHeightPx } = multiViewLayout;
  const multiCanPrev = multiScrollIndex > 0;
  const multiCanNext = multiScrollIndex + multiVisibleCount < totalParticipants;
  const multiVisibleParticipants = participants.slice(
    multiScrollIndex,
    multiScrollIndex + multiVisibleCount,
  );

  useEffect(() => {
    if (multiScrollIndex + multiVisibleCount > totalParticipants && totalParticipants > 0) {
      setMultiScrollIndex(Math.max(0, totalParticipants - multiVisibleCount));
    }
  }, [totalParticipants, multiVisibleCount, multiScrollIndex]);

  const { pins } = useClassroomPins();

  useEffect(() => {
    if (pins.length > 0) {
      setMultiScrollIndex(0);
    }
  }, [pins.map((pin) => `${pin.userId}:${pin.source}`).join(',')]);

  const handleBackToBoard = useCallback(() => {
    if (!activeBoardId || !activeClassroom) return;
    callsNavigation.navigateToClassroomBoard(activeClassroom, activeBoardId);
  }, [activeBoardId, activeClassroom, callsNavigation]);

  const handleMaximize = useCallback(
    (syncToAll: boolean = false) => {
      pip?.closePiP();
      if (!room || !token || room.state !== 'connected') return;
      const callParam = callsNavigation.search.call;
      const targetCallId =
        (typeof callParam === 'string' ? callParam.replace(/^"|"$/g, '').trim() : '') ||
        activeClassroom ||
        callsNavigation.params.classroomId ||
        callsNavigation.getCallId() ||
        '';
      if (syncToAll && isTutor && activeBoardId && targetCallId) {
        updateStore('localFullView', false);
        updateStore('mode', 'full');
        updateStore('activeBoardId', undefined);
        updateStore('activeClassroom', undefined);
        syncModeToOthers('full', undefined, targetCallId);
      } else {
        updateStore('localFullView', true);
        updateStore('mode', 'full');
      }
      if (targetCallId) {
        callsNavigation.navigateToCall(targetCallId, { replace: true });
      }
    },
    [
      room,
      token,
      callsNavigation,
      activeClassroom,
      isTutor,
      activeBoardId,
      updateStore,
      syncModeToOthers,
      pip,
    ],
  );

  return (
    <div
      ref={setNodeRef}
      {...(freeDrag ? listeners : {})}
      style={{
        ...style,
        ...(isMobile && !freeDrag
          ? {}
          : {
              width: stageFrame?.width ?? COMPACT_PANEL_WIDTH_PX,
              touchAction: 'none' as const,
              maxWidth: '100%',
            }),
      }}
      className={`compact-call-container flex flex-col ${
        isMobile && !freeDrag ? 'w-full' : 'touch-none [&_video]:touch-none'
      } ${freeDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <CompactCallVideoArea
        isCollapsed={isCollapsed}
        onCollapsedChange={setIsCollapsed}
        withOutShadows={withOutShadows}
        dragAttributes={freeDrag ? undefined : (attributes as object)}
        dragListeners={freeDrag ? undefined : (listeners as object)}
        compactViewMode={lockCompactModes ? 'basic' : compactViewMode}
        tileWidth={stageFrame?.width}
        tileHeight={stageFrame?.tileHeight}
        isMobile={stageFrame ? false : isMobile}
        currentParticipant={currentParticipant}
        currentAudioTrack={currentAudioTrack ?? null}
        totalParticipants={totalParticipants}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={goToPrev}
        onNext={goToNext}
        currentIndex={currentIndex}
        multiVisibleParticipants={multiVisibleParticipants}
        multiTileHeightPx={multiTileHeightPx}
        multiCanPrev={multiCanPrev}
        multiCanNext={multiCanNext}
        onMultiPrev={() => setMultiScrollIndex((i) => Math.max(0, i - 1))}
        onMultiNext={() =>
          setMultiScrollIndex((i) => Math.min(totalParticipants - multiVisibleCount, i + 1))
        }
        onAudioExpand={() => setCompactViewMode('basic')}
      />
      <CompactCallBottomBar
        withOutShadows={withOutShadows}
        devices={{
          microTrack: microphoneTrack?.track as LocalAudioTrack,
          microEnabled: isMicrophoneEnabled,
          microTrackToggle: {
            showIcon: true,
            source: Track.Source.Microphone,
            onChange: handleMicrophoneToggle,
            deviceGroups: microphoneGroups,
          },
          videoTrack: cameraTrack?.track as unknown as LocalVideoTrack,
          videoEnabled: isCameraEnabled,
          videoTrackToggle: {
            showIcon: true,
            source: Track.Source.Camera,
            onChange: handleCameraToggle,
            deviceGroups: cameraGroups,
          },
        }}
        isMobile={lockCompactModes || (isMobile && stageFrame == null)}
        stageCompact={lockCompactModes}
        compactViewMode={compactViewMode}
        onViewModeToggle={() => setCompactViewMode(getNextCompactViewMode(compactViewMode))}
        showBackToBoardButton={!!showBackToBoardButton}
        onBackToBoard={handleBackToBoard}
        onMaximize={handleMaximize}
        isTutor={!!isTutor}
      />
    </div>
  );
};
