import React from 'react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { isEqualTrackRef, isTrackReference, isWeb, log } from '@livekit/components-core';
import { RoomEvent, Track } from 'livekit-client';
import {
  LayoutContextProvider,
  VideoConferenceProps,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
} from '@livekit/components-react';
import { ParticipantTile } from '../Participant';
import { calcMaxTilesPerPage, CarouselContainer, GridLayout } from './VideoGridLayout';
import { applyPinsFirst, useCallStore } from '@xipkg/calls-store';
import { useClassroomPins, useSortedTracks, useSize } from '@xipkg/calls-hooks';
import '../../styles/grid.css';

const GRID_GAP = 8;

const MIN_TILE_H = 200;

function pickDefaultFocusTrack(
  tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder | undefined {
  const screenShare = tracks.find(
    (track) => track.source === Track.Source.ScreenShare && track.publication?.isSubscribed,
  );
  if (screenShare) return screenShare;
  return tracks.find((track) => track.source === Track.Source.Camera);
}

function useFirstPageSize(
  containerSize: { width: number; height: number },
  layoutMode: 'grid' | 'horizontal' | 'vertical',
  trackCount: number,
): number {
  return React.useMemo(() => {
    if (!containerSize.width || !containerSize.height || trackCount === 0) return 0;

    if (layoutMode === 'grid') {
      return Math.min(
        calcMaxTilesPerPage(containerSize.width, containerSize.height, GRID_GAP, MIN_TILE_H),
        trackCount,
      );
    }

    if (layoutMode === 'vertical') {
      const thumbHeight = Math.max(120, Math.min(200, containerSize.height / 4));
      return Math.max(1, Math.floor(containerSize.height / (thumbHeight + GRID_GAP)));
    }

    const thumbHeight = 144;
    const itemWidth = Math.max(100, Math.min(180, thumbHeight * (16 / 9)));
    return Math.max(1, Math.floor(containerSize.width / (itemWidth + GRID_GAP)));
  }, [containerSize.width, containerSize.height, layoutMode, trackCount]);
}

export const VideoGrid = ({ ...props }: VideoConferenceProps) => {
  const lastAutoFocusedScreenShareTrack = React.useRef<TrackReferenceOrPlaceholder | null>(null);
  const hadScreenShareRef = React.useRef(false);

  const carouselType = useCallStore((state) => state.carouselType);
  const { pins } = useClassroomPins();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    {
      updateOnlyOn: [RoomEvent.ActiveSpeakersChanged],
      onlySubscribed: false,
    },
  );

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const hasScreenShare = screenShareTracks.some((track) => track.publication.isSubscribed);
  const participantCount = tracks.filter((track) => track.source === Track.Source.Camera).length;
  const canUseFocusLayout = hasScreenShare || participantCount > 2;
  const effectiveCarouselType: 'grid' | 'horizontal' | 'vertical' = canUseFocusLayout
    ? carouselType
    : 'grid';

  const contentRef = React.useRef<HTMLDivElement>(null);
  const contentSize = useSize(contentRef as React.RefObject<HTMLDivElement>);

  const firstPageSize = useFirstPageSize(contentSize, effectiveCarouselType, tracks.length);

  const baseSortedTracks = useSortedTracks(tracks, firstPageSize);

  const layoutContext = useCreateLayoutContext();

  const sortedTracks = React.useMemo(
    () => applyPinsFirst(baseSortedTracks, pins),
    [baseSortedTracks, pins],
  );

  const focusTrackFromLayout = usePinnedTracks(layoutContext)?.[0];

  const stageTrack = React.useMemo(
    () => focusTrackFromLayout ?? pickDefaultFocusTrack(baseSortedTracks),
    [focusTrackFromLayout, baseSortedTracks],
  );

  /** Список плиток карусели: без главной сцены, с учётом локального pin */
  const carouselTracks = React.useMemo(() => {
    const listTracks = baseSortedTracks.filter((track) => !isEqualTrackRef(track, stageTrack));
    return applyPinsFirst(listTracks, pins);
  }, [baseSortedTracks, stageTrack, pins]);

  React.useEffect(() => {
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      log.debug('Auto set screen share focus:', { newScreenShareTrack: screenShareTracks[0] });
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
      )
    ) {
      log.debug('Auto clearing screen share focus.');
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;
    }
    if (focusTrackFromLayout && !isTrackReference(focusTrackFromLayout)) {
      const updatedFocusTrack = tracks.find(
        (tr) =>
          tr.participant.identity === focusTrackFromLayout.participant.identity &&
          tr.source === focusTrackFromLayout.source,
      );
      if (updatedFocusTrack !== focusTrackFromLayout && isTrackReference(updatedFocusTrack)) {
        layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: updatedFocusTrack });
      }
    }
  }, [screenShareTracks, focusTrackFromLayout, layoutContext.pin, tracks]);

  React.useEffect(() => {
    if (!canUseFocusLayout && carouselType !== 'grid') {
      useCallStore
        .getState()
        .updateStore('preferredFocusLayout', carouselType as 'horizontal' | 'vertical');
      useCallStore.getState().updateStore('carouselType', 'grid');
    }
  }, [canUseFocusLayout, carouselType]);

  React.useEffect(() => {
    const screenShareJustStarted = hasScreenShare && !hadScreenShareRef.current;
    hadScreenShareRef.current = hasScreenShare;

    if (!screenShareJustStarted || carouselType !== 'grid') return;

    const { preferredFocusLayout } = useCallStore.getState();
    useCallStore.getState().updateStore('carouselType', preferredFocusLayout);
  }, [hasScreenShare, carouselType]);

  return (
    <div className="relative flex h-full min-h-0 w-full justify-center" {...props}>
      {isWeb() && (
        <LayoutContextProvider value={layoutContext}>
          <div
            ref={contentRef}
            className={`flex h-full min-h-0 w-full ${
              effectiveCarouselType === 'grid'
                ? 'items-center justify-center'
                : 'items-stretch justify-center'
            }`}
          >
            {effectiveCarouselType === 'grid' ? (
              <div className="h-full w-full min-w-0">
                <GridLayout tracks={sortedTracks}>
                  <ParticipantTile
                    style={{
                      flexDirection: 'column',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                    }}
                  />
                </GridLayout>
              </div>
            ) : (
              <div className="h-full max-h-full min-h-0 w-full overflow-hidden">
                <CarouselContainer stageTrack={stageTrack} carouselTracks={carouselTracks} />
              </div>
            )}
          </div>
        </LayoutContextProvider>
      )}
    </div>
  );
};
