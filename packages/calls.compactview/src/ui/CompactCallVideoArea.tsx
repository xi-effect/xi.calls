import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import type { CompactViewModeT } from '@xipkg/calls-store';
import { Button } from '@xipkg/button';
import { ChevronUp, External } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { usePiP } from '../providers';
import { CompactCallCollapsedBar } from './CompactCallCollapsedBar';
import { CompactNavigationControls } from './CompactNavigationControls';
import { CompactMultiViewControls } from './CompactMultiViewControls';
import { ParticipantTile, ParticipantPinToggle, tileOverlayButtonClassName } from '@xipkg/calls-ui';
import { TILE_GAP_PX, TILE_HEIGHT_16_9_PX } from '../constants';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';

type CompactCallVideoAreaProps = {
  isMobile: boolean;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  withOutShadows: boolean;
  dragAttributes?: object;
  dragListeners?: object;
  /** Режим вида на десктопе */
  compactViewMode: CompactViewModeT;
  currentParticipant: TrackReferenceOrPlaceholder | null;
  currentAudioTrack:
    | import('livekit-client').RemoteAudioTrack
    | import('livekit-client').LocalAudioTrack
    | null;
  totalParticipants: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  multiVisibleParticipants: TrackReferenceOrPlaceholder[];
  multiTileHeightPx: number;
  multiCanPrev: boolean;
  multiCanNext: boolean;
  onMultiPrev: () => void;
  onMultiNext: () => void;
  onAudioExpand: () => void;
};

export function CompactCallVideoArea({
  isMobile,
  isCollapsed,
  onCollapsedChange,
  withOutShadows,
  dragAttributes = {},
  dragListeners = {},
  compactViewMode,
  currentParticipant,
  currentAudioTrack,
  totalParticipants,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  currentIndex,
  multiVisibleParticipants,
  multiTileHeightPx,
  multiCanPrev,
  multiCanNext,
  onMultiPrev,
  onMultiNext,
  onAudioExpand,
}: CompactCallVideoAreaProps) {
  const pip = usePiP();
  const showPiPButton = pip?.isSupported && !!currentParticipant;

  /**
   * На десктопе в basic-режиме выносим Pin (и опционально PiP) в оверлей над плиткой.
   * Это позволяет показывать Pin всегда, даже если PiP не поддерживается.
   */
  const showDesktopOverlay = !isMobile && compactViewMode === 'basic' && !!currentParticipant;

  /** В expanded-режиме Pin первой плитки и PiP в одном оверлее — иначе кнопки накладываются */
  const firstMultiParticipant = multiVisibleParticipants[0] ?? null;
  const showExpandedOverlay =
    !isMobile && compactViewMode === 'expanded' && !!firstMultiParticipant;

  const overlayTrackRef = showDesktopOverlay
    ? currentParticipant
    : showExpandedOverlay
      ? firstMultiParticipant
      : null;
  const showPinPiPOverlay = !!overlayTrackRef;

  const emptyState = (
    <div className="bg-gray-40 flex h-full w-full items-center justify-center text-gray-100">
      <span className="text-sm">Нет участников</span>
    </div>
  );

  if (isMobile && isCollapsed) {
    return (
      <CompactCallCollapsedBar
        participant={currentParticipant?.participant ?? null}
        audioTrack={currentAudioTrack ?? null}
        onExpand={() => onCollapsedChange(false)}
        className={cn('mb-2', withOutShadows ? '' : 'shadow-lg')}
      />
    );
  }

  if (!isMobile && compactViewMode === 'audio') {
    return (
      <CompactCallCollapsedBar
        participant={currentParticipant?.participant ?? null}
        audioTrack={currentAudioTrack ?? null}
        onExpand={onAudioExpand}
        className={cn('mb-2 w-[360px]', withOutShadows ? '' : 'shadow-lg')}
      />
    );
  }

  return (
    <div
      {...(isMobile ? {} : { ...dragAttributes, ...dragListeners })}
      className={cn(
        'group relative mb-2 flex overflow-hidden rounded-2xl',
        withOutShadows ? '' : 'shadow-lg',
        isMobile ? 'h-auto w-full items-center justify-center' : 'w-[360px] cursor-move flex-col',
        !isMobile && compactViewMode === 'basic' && 'shrink-0',
        !isMobile && compactViewMode === 'expanded' && 'h-auto',
      )}
      style={!isMobile && compactViewMode === 'basic' ? { height: TILE_HEIGHT_16_9_PX } : undefined}
    >
      {isMobile ? (
        currentParticipant ? (
          <ParticipantTile
            trackRef={currentParticipant}
            participant={currentParticipant.participant}
            className="h-full w-full"
            hidePinToggle={showDesktopOverlay}
          />
        ) : (
          emptyState
        )
      ) : compactViewMode === 'expanded' ? (
        <div
          className="relative flex flex-col gap-2 overflow-hidden rounded-2xl p-1"
          style={{ gap: TILE_GAP_PX }}
        >
          {multiVisibleParticipants.length === 0
            ? emptyState
            : multiVisibleParticipants.map((trackRef, index) => (
                <div
                  key={`${trackRef.participant.identity}-${trackRef.source}`}
                  className="aspect-video w-full shrink-0 overflow-hidden rounded-xl"
                  style={{ minHeight: multiTileHeightPx }}
                >
                  <ParticipantTile
                    trackRef={trackRef}
                    participant={trackRef.participant}
                    className="h-full w-full [&_video]:object-cover"
                    hidePinToggle={showExpandedOverlay && index === 0}
                  />
                </div>
              ))}
          <CompactMultiViewControls
            canPrev={multiCanPrev}
            canNext={multiCanNext}
            onPrev={onMultiPrev}
            onNext={onMultiNext}
          />
        </div>
      ) : currentParticipant ? (
        <ParticipantTile
          trackRef={currentParticipant}
          participant={currentParticipant.participant}
          className="h-full w-full"
          hidePinToggle={showDesktopOverlay}
        />
      ) : (
        emptyState
      )}

      {/* Оверлей с Pin (и опционально PiP) для basic и expanded на десктопе */}
      {showPinPiPOverlay && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <ParticipantPinToggle trackRef={overlayTrackRef} inline />
          {showPiPButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void pip!.openPiP()}
                  className={tileOverlayButtonClassName}
                  aria-label="Открыть в отдельном окне"
                >
                  <External className="fill-gray-100" style={{ width: 16, height: 16 }} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Открыть в отдельном окне</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {isMobile && (
        <Button
          size="icon"
          variant="none"
          onClick={() => onCollapsedChange(true)}
          className="bg-brand-100 hover:bg-brand-100/80 text-brand-0 absolute top-2 right-2 z-10 h-8 w-8 rounded-xl p-0"
          aria-label="Свернуть"
        >
          <ChevronUp className="fill-brand-0 h-4 w-4" />
        </Button>
      )}

      {totalParticipants > 0 && (isMobile || compactViewMode === 'basic') && (
        <CompactNavigationControls
          canPrev={canGoPrev}
          canNext={canGoNext}
          onPrev={onPrev}
          onNext={onNext}
          currentIndex={currentIndex}
          totalParticipants={totalParticipants}
        />
      )}
    </div>
  );
}
