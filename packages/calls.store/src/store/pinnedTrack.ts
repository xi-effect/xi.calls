import { Track } from 'livekit-client';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';

export type PinnedTrackT = {
  participantIdentity: string;
  source: Track.Source;
};

export function matchesPinnedTrack(
  track: TrackReferenceOrPlaceholder,
  pinned: PinnedTrackT,
): boolean {
  return (
    track.participant.identity === pinned.participantIdentity && track.source === pinned.source
  );
}

export function findPinnedTrackRef(
  tracks: TrackReferenceOrPlaceholder[],
  pinned: PinnedTrackT | null,
): TrackReferenceOrPlaceholder | undefined {
  if (!pinned) return undefined;
  return tracks.find((track) => matchesPinnedTrack(track, pinned));
}

export function toPinnedTrack(track: TrackReferenceOrPlaceholder): PinnedTrackT {
  return {
    participantIdentity: track.participant.identity,
    source: track.source ?? Track.Source.Camera,
  };
}

/** Перемещает закреплённый трек на первое место в переданном списке */
export function applyPinFirst(
  tracks: TrackReferenceOrPlaceholder[],
  pinned: PinnedTrackT | null,
): TrackReferenceOrPlaceholder[] {
  if (!pinned) return tracks;
  const pinnedRef = findPinnedTrackRef(tracks, pinned);
  if (!pinnedRef) return tracks;
  return [pinnedRef, ...tracks.filter((track) => track !== pinnedRef)];
}

/** Участник для главной плитки focus-сетки (без учёта локального pin) */
export function pickDefaultFocusTrack(
  tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder | undefined {
  const screenShare = tracks.find(
    (track) => track.source === Track.Source.ScreenShare && track.publication?.isSubscribed,
  );
  if (screenShare) return screenShare;
  return tracks.find((track) => track.source === Track.Source.Camera);
}
