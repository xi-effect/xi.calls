import { Track } from 'livekit-client';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';

/** Стабильный идентификатор участника для закрепления в рамках кабинета */
export type PinnedParticipantT = {
  userId: string;
  source: Track.Source;
};

/** @deprecated Используйте PinnedParticipantT */
export type PinnedTrackT = PinnedParticipantT;

export function getParticipantUserId(participant: { identity: string; metadata?: string }): string {
  if (participant.metadata) {
    try {
      const meta = JSON.parse(participant.metadata) as {
        user_id?: string | number;
        id?: string | number;
      };
      if (meta?.user_id != null) return String(meta.user_id);
      if (meta?.id != null) return String(meta.id);
    } catch {
      /* metadata is not JSON */
    }
  }
  return participant.identity;
}

export function toPinnedParticipant(track: TrackReferenceOrPlaceholder): PinnedParticipantT {
  return {
    userId: getParticipantUserId(track.participant),
    source: track.source ?? Track.Source.Camera,
  };
}

/** @deprecated Используйте toPinnedParticipant */
export const toPinnedTrack = toPinnedParticipant;

export function matchesPinnedParticipant(
  track: TrackReferenceOrPlaceholder,
  pinned: PinnedParticipantT,
): boolean {
  return (
    getParticipantUserId(track.participant) === pinned.userId && track.source === pinned.source
  );
}

/** @deprecated Используйте matchesPinnedParticipant */
export const matchesPinnedTrack = matchesPinnedParticipant;

export function findPinnedTrackRef(
  tracks: TrackReferenceOrPlaceholder[],
  pinned: PinnedParticipantT,
): TrackReferenceOrPlaceholder | undefined {
  return tracks.find((track) => matchesPinnedParticipant(track, pinned));
}

/** Перемещает закреплённых участников в начало списка (порядок pin сохраняется) */
export function applyPinsFirst(
  tracks: TrackReferenceOrPlaceholder[],
  pins: PinnedParticipantT[],
): TrackReferenceOrPlaceholder[] {
  if (!pins.length) return tracks;

  const pinnedRefs: TrackReferenceOrPlaceholder[] = [];
  const seen = new Set<TrackReferenceOrPlaceholder>();

  for (const pin of pins) {
    const ref = findPinnedTrackRef(tracks, pin);
    if (ref && !seen.has(ref)) {
      pinnedRefs.push(ref);
      seen.add(ref);
    }
  }

  if (!pinnedRefs.length) return tracks;
  return [...pinnedRefs, ...tracks.filter((track) => !seen.has(track))];
}

export function applyPinFirst(
  tracks: TrackReferenceOrPlaceholder[],
  pinned: PinnedParticipantT | null,
): TrackReferenceOrPlaceholder[] {
  return applyPinsFirst(tracks, pinned ? [pinned] : []);
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
