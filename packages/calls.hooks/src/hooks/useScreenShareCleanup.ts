import { useEffect, useMemo } from 'react';
import { Track } from 'livekit-client';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { findPinnedTrackRef, toPinnedParticipant, useCallStore } from '@xipkg/calls-store';
import { useClassroomPins } from './useClassroomPins';

/**
 * Снимает pin демонстрации экрана из сохранённых pin кабинета при её завершении.
 * Обычные camera-pin между созвонами сохраняются.
 */
export const useScreenShareCleanup = (tracks: TrackReferenceOrPlaceholder[]) => {
  const { classroomId, pins } = useClassroomPins();
  const removePinnedParticipant = useCallStore((state) => state.removePinnedParticipant);

  const screenSharePins = useMemo(
    () => pins.filter((pin) => pin.source === Track.Source.ScreenShare),
    [pins],
  );

  const screenSharePinsKey = screenSharePins.map((pin) => `${pin.userId}:${pin.source}`).join(',');

  useEffect(() => {
    if (!classroomId || !screenSharePins.length) return;

    screenSharePins.forEach((pin) => {
      const pinnedRef = findPinnedTrackRef(tracks, pin);
      const isActive =
        pinnedRef?.publication?.isSubscribed &&
        pinnedRef.publication.source === Track.Source.ScreenShare;

      if (!isActive) {
        removePinnedParticipant(pin, classroomId);
      }
    });
  }, [tracks, classroomId, screenSharePins, screenSharePinsKey, removePinnedParticipant]);

  useEffect(() => {
    if (!classroomId) return;

    const handleTrackUnpublished = (track: TrackReferenceOrPlaceholder) => {
      if (
        track.publication?.source !== Track.Source.ScreenShare ||
        track.publication.isSubscribed
      ) {
        return;
      }
      removePinnedParticipant(toPinnedParticipant(track), classroomId);
    };

    const unsubscribedHandlers = tracks.flatMap((track) => {
      const publication = track.publication;
      if (!publication || publication.source !== Track.Source.ScreenShare) return [];

      const handler = () => handleTrackUnpublished(track);
      publication.on('unsubscribed', handler);
      return [{ publication, handler }];
    });

    return () => {
      unsubscribedHandlers.forEach(({ publication, handler }) => {
        publication.off('unsubscribed', handler);
      });
    };
  }, [tracks, classroomId, removePinnedParticipant]);
};
