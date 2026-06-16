import { useEffect } from 'react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { findPinnedTrackRef, useCallStore } from '@xipkg/calls-store';

/** Снимает закрепление, если закреплённый трек больше не доступен */
export function usePinnedTrackCleanup(tracks: TrackReferenceOrPlaceholder[]) {
  const pinnedTrack = useCallStore((state) => state.pinnedTrack);
  const clearPinnedTrack = useCallStore((state) => state.clearPinnedTrack);

  useEffect(() => {
    if (!pinnedTrack) return;
    if (!findPinnedTrackRef(tracks, pinnedTrack)) {
      clearPinnedTrack();
    }
  }, [tracks, pinnedTrack, clearPinnedTrack]);
}
