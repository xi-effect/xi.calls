import { useState, useEffect, useMemo } from 'react';
import { RemoteTrackPublication, Track } from 'livekit-client';
import { useTracks } from '@livekit/components-react';
import { applyPinsFirst, useCallStore } from '@xipkg/calls-store';
import { useClassroomPins, useScreenShareCleanup, useSortedTracks } from '@xipkg/calls-hooks';
import { useRoom } from '@xipkg/calls-providers';

export const useCompactNavigation = () => {
  const { room } = useRoom();
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);

  const participants = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    {
      onlySubscribed: false,
    },
  );

  useScreenShareCleanup(participants);

  // VideoGrid при уходе в compact размонтируется. Если плитки ещё и сами
  // отписываются по IntersectionObserver, удалённые камеры остаются
  // isSubscribed=false — а CompactCall рисует VideoTrack только для
  // подписанных треков. Локальная камера от этого не страдает.
  // Не трогаем подписки, пока комната не connected: setSubscribed в момент
  // publish/reconnect на локальном 1.8.x срывает SDP (negotiation timed out).
  useEffect(() => {
    if (room.state !== 'connected') return;

    participants.forEach((trackRef) => {
      const publication = trackRef.publication;
      if (
        publication instanceof RemoteTrackPublication &&
        publication.kind === Track.Kind.Video &&
        publication.isEnabled &&
        !publication.isSubscribed
      ) {
        publication.setSubscribed(true);
      }
    });
  }, [participants, room]);

  const baseSorted = useSortedTracks(participants, 1);
  const { pins } = useClassroomPins();

  const sorted = useMemo(() => applyPinsFirst(baseSorted, pins), [baseSorted, pins]);
  const screenShareStageIdentity = useCallStore((state) => state.screenShareStageIdentity);

  // На весь экран уже выведена демонстрация — в панели остаются камеры участников.
  const visibleSorted = useMemo(() => {
    if (!screenShareStageIdentity) return sorted;
    return sorted.filter((trackRef) => trackRef.source !== Track.Source.ScreenShare);
  }, [screenShareStageIdentity, sorted]);

  const currentParticipant = visibleSorted[currentParticipantIndex] || null;
  const totalParticipants = visibleSorted.length;

  const canGoNext = currentParticipantIndex < totalParticipants - 1;
  const canGoPrev = currentParticipantIndex > 0;

  const goToNext = () => {
    if (canGoNext) {
      setCurrentParticipantIndex((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (canGoPrev) {
      setCurrentParticipantIndex((prev) => prev - 1);
    }
  };

  const goToParticipant = (index: number) => {
    if (index >= 0 && index < totalParticipants) {
      setCurrentParticipantIndex(index);
    }
  };

  useEffect(() => {
    if (currentParticipantIndex >= totalParticipants && totalParticipants > 0) {
      setCurrentParticipantIndex(Math.max(0, totalParticipants - 1));
    }
  }, [totalParticipants, currentParticipantIndex]);

  const pinsKey = pins.map((pin) => `${pin.userId}:${pin.source}`).join(',');

  useEffect(() => {
    if (pins.length > 0) {
      setCurrentParticipantIndex(0);
    }
  }, [pinsKey, pins.length]);

  useEffect(() => {
    if (!screenShareStageIdentity) return;
    setCurrentParticipantIndex(0);
  }, [screenShareStageIdentity]);

  return {
    currentParticipant,
    participants: visibleSorted,
    currentIndex: currentParticipantIndex,
    totalParticipants,
    canGoNext,
    canGoPrev,
    goToNext,
    goToPrev,
    goToParticipant,
  };
};
