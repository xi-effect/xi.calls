import { useEffect } from 'react';
import { Track } from 'livekit-client';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { findPinnedTrackRef, useCallStore } from '@xipkg/calls-store';

/**
 * Снимает закрепление при завершении демонстрации экрана
 */
export const useScreenShareCleanup = (tracks: TrackReferenceOrPlaceholder[]) => {
  const pinnedTrack = useCallStore((state) => state.pinnedTrack);
  const clearPinnedTrack = useCallStore((state) => state.clearPinnedTrack);

  useEffect(() => {
    if (!pinnedTrack || pinnedTrack.source !== Track.Source.ScreenShare) return;

    const pinnedRef = findPinnedTrackRef(tracks, pinnedTrack);
    const isActive =
      pinnedRef?.publication?.isSubscribed &&
      pinnedRef.publication.source === Track.Source.ScreenShare;

    if (!isActive) {
      clearPinnedTrack();
    }
  }, [tracks, pinnedTrack, clearPinnedTrack]);

  useEffect(() => {
    const handleTrackUnpublished = (source: Track.Source, isSubscribed: boolean) => {
      if (source !== Track.Source.ScreenShare || isSubscribed) return;
      if (pinnedTrack?.source === Track.Source.ScreenShare) {
        clearPinnedTrack();
      }
    };

    const unsubscribedHandlers = tracks.flatMap((track) => {
      const publication = track.publication;
      if (!publication || publication.source !== Track.Source.ScreenShare) return [];

      const handler = () => handleTrackUnpublished(publication.source, publication.isSubscribed);
      publication.on('unsubscribed', handler);
      return [{ publication, handler }];
    });

    return () => {
      unsubscribedHandlers.forEach(({ publication, handler }) => {
        publication.off('unsubscribed', handler);
      });
    };
  }, [tracks, pinnedTrack, clearPinnedTrack]);
};
