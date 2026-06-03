import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useLocalParticipant,
  usePersistentUserChoices,
  useTrackToggle,
} from '@livekit/components-react';
import { Track, LocalAudioTrack, LocalVideoTrack, RemoteAudioTrack } from 'livekit-client';
import { Account, SoundTwo, Users } from '@xipkg/icons';
import { Button } from '@xipkg/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import { cn } from '@xipkg/utils';
import { useCallStore, type CompactViewModeT } from '@xipkg/calls-store';
import { useCompactNavigation } from '../hooks/useCompactNavigation';
import { ParticipantTile, DevicesBar, DisconnectButton, ScreenShareButton } from '@xipkg/calls-ui';
import { RaiseHandButton } from '@xipkg/calls-risehand';
import { CompactNavigationControls } from './CompactNavigationControls';
import { CompactMultiViewControls } from './CompactMultiViewControls';
import { CompactCallCollapsedBar } from './CompactCallCollapsedBar';
import {
  PIP_RESERVED_HEIGHT_PX,
  PIP_TILE_HEIGHT_16_9_PX,
  TILE_GAP_PX,
  getNextCompactViewMode,
} from '../constants';

/**
 * Минимальная высота окна PiP, необходимая для отображения n полных плиток
 * вместе с панелью управления и всеми отступами.
 */
function requiredPipHeight(n: number): number {
  return PIP_RESERVED_HEIGHT_PX + n * PIP_TILE_HEIGHT_16_9_PX + Math.max(0, n - 1) * TILE_GAP_PX;
}

type PiPCompactCallPropsT = {
  pipWindow: Window;
};

export function PiPCompactCall({ pipWindow }: PiPCompactCallPropsT) {
  const compactViewMode = useCallStore((s) => s.compactViewMode);
  const updateStore = useCallStore((s) => s.updateStore);
  const setViewMode = useCallback(
    (mode: CompactViewModeT) => updateStore('compactViewMode', mode),
    [updateStore],
  );
  const nextViewMode = getNextCompactViewMode(compactViewMode);
  const viewModeToggleMeta = {
    expanded: { Icon: Users, label: 'Развёрнутый вид (несколько участников)' },
    audio: { Icon: SoundTwo, label: 'Только аудио' },
    basic: { Icon: Account, label: 'Один участник' },
  }[nextViewMode];
  const ViewModeIcon = viewModeToggleMeta.Icon;
  const [multiScrollIndex, setMultiScrollIndex] = useState(0);
  const [pipSize, setPipSize] = useState({
    width: pipWindow.innerWidth,
    height: pipWindow.innerHeight,
  });

  const { saveAudioInputEnabled, saveVideoInputEnabled } = usePersistentUserChoices();
  const { isMicrophoneEnabled, isCameraEnabled, microphoneTrack, cameraTrack } =
    useLocalParticipant();

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

  const handleMicrophoneToggle = useCallback(() => microphoneToggle.toggle(), [microphoneToggle]);
  const handleCameraToggle = useCallback(() => cameraToggle.toggle(), [cameraToggle]);

  const {
    currentParticipant,
    participants,
    currentIndex,
    totalParticipants,
    canGoNext,
    canGoPrev,
    goToNext,
    goToPrev,
  } = useCompactNavigation();

  // Размер окна PiP:
  useEffect(() => {
    const updateSize = () =>
      setPipSize({ width: pipWindow.innerWidth, height: pipWindow.innerHeight });
    updateSize();
    pipWindow.addEventListener('resize', updateSize);
    return () => pipWindow.removeEventListener('resize', updateSize);
  }, [pipWindow]);

  // Сколько полных плиток (16:9) помещается при текущей высоте окна.
  // Плитка добавляется, только когда есть полное место; убирается сразу, как перестаёт влезать.
  const multiVisibleCount = useMemo(() => {
    let n = 1;
    while (n < totalParticipants && requiredPipHeight(n + 1) <= pipSize.height) {
      n++;
    }
    return n;
  }, [pipSize.height, totalParticipants]);

  const multiVisibleParticipants = useMemo(
    () => participants.slice(multiScrollIndex, multiScrollIndex + multiVisibleCount),
    [participants, multiScrollIndex, multiVisibleCount],
  );
  const multiCanPrev = multiScrollIndex > 0;
  const multiCanNext = multiScrollIndex + multiVisibleCount < totalParticipants;

  const currentAudioTrack = currentParticipant?.participant?.getTrackPublication(
    Track.Source.Microphone,
  )?.track as LocalAudioTrack | RemoteAudioTrack | undefined;

  useEffect(() => {
    if (multiScrollIndex + multiVisibleCount > totalParticipants && totalParticipants > 0) {
      setMultiScrollIndex(Math.max(0, totalParticipants - multiVisibleCount));
    }
  }, [totalParticipants, multiVisibleCount, multiScrollIndex]);

  const emptyState = (
    <div className="bg-gray-40 flex h-full w-full items-center justify-center rounded-2xl text-gray-100">
      <span className="text-sm">Нет участников</span>
    </div>
  );

  const barCn = cn(
    'bg-gray-0 border-gray-20 flex items-center justify-center rounded-2xl border p-0.5',
  );

  return (
    <div className="flex h-full flex-col gap-1 p-1">
      <div className="group relative min-h-0 flex-1 overflow-hidden rounded-2xl">
        {compactViewMode === 'audio' ? (
          <CompactCallCollapsedBar
            participant={currentParticipant?.participant ?? null}
            audioTrack={currentAudioTrack ?? null}
            onExpand={() => setViewMode('basic')}
            className="h-full w-full"
          />
        ) : compactViewMode === 'expanded' ? (
          <div
            className="relative flex h-full flex-col overflow-hidden rounded-2xl p-0.5"
            style={{ gap: TILE_GAP_PX }}
          >
            {multiVisibleParticipants.length === 0
              ? emptyState
              : multiVisibleParticipants.map((trackRef) => (
                  <div
                    key={`${trackRef.participant.identity}-${trackRef.source}`}
                    className="aspect-video w-full shrink-0 overflow-hidden rounded-xl"
                    style={{ minHeight: PIP_TILE_HEIGHT_16_9_PX }}
                  >
                    <ParticipantTile
                      trackRef={trackRef}
                      participant={trackRef.participant}
                      className="h-full w-full [&_video]:object-cover"
                      isFocusToggleDisable
                    />
                  </div>
                ))}
            <CompactMultiViewControls
              canPrev={multiCanPrev}
              canNext={multiCanNext}
              onPrev={() => setMultiScrollIndex((i) => Math.max(0, i - 1))}
              onNext={() =>
                setMultiScrollIndex((i) => Math.min(totalParticipants - multiVisibleCount, i + 1))
              }
            />
          </div>
        ) : currentParticipant ? (
          <>
            <ParticipantTile
              trackRef={currentParticipant}
              participant={currentParticipant.participant}
              className="h-full w-full"
              isFocusToggleDisable
            />
            {totalParticipants > 1 && (
              <CompactNavigationControls
                canPrev={canGoPrev}
                canNext={canGoNext}
                onPrev={goToPrev}
                onNext={goToNext}
                currentIndex={currentIndex}
                totalParticipants={totalParticipants}
              />
            )}
          </>
        ) : (
          emptyState
        )}
      </div>

      <div className="flex h-12 shrink-0 items-center gap-0.5">
        <div className={barCn}>
          <DevicesBar
            className="h-[28px] w-[28px]"
            microTrack={microphoneTrack?.track as LocalAudioTrack}
            microEnabled={isMicrophoneEnabled}
            microTrackToggle={{
              showIcon: true,
              source: Track.Source.Microphone,
              onChange: handleMicrophoneToggle,
            }}
            videoTrack={cameraTrack?.track as unknown as LocalVideoTrack}
            videoEnabled={isCameraEnabled}
            videoTrackToggle={{
              showIcon: true,
              source: Track.Source.Camera,
              onChange: handleCameraToggle,
            }}
          />
        </div>

        <div className={barCn}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="none"
                onClick={() => setViewMode(getNextCompactViewMode(compactViewMode))}
                className="hover:bg-gray-5 h-[28px] w-[28px] rounded-xl p-0 text-gray-100"
                aria-label={viewModeToggleMeta.label}
              >
                <ViewModeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{viewModeToggleMeta.label}</TooltipContent>
          </Tooltip>
        </div>

        <div className={cn(barCn, 'ml-auto')}>
          <ScreenShareButton className="h-[28px] w-[28px]" />
          <RaiseHandButton className="h-[28px] w-[28px]" />
        </div>

        <div className={barCn}>
          <DisconnectButton className="h-[28px] w-[28px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
