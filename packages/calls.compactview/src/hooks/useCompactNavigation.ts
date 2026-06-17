import { useState, useEffect, useMemo } from 'react';
import { Track } from 'livekit-client';
import { useTracks } from '@livekit/components-react';
import { applyPinsFirst } from '@xipkg/calls-store';
import { useClassroomPins, useScreenShareCleanup, useSortedTracks } from '@xipkg/calls-hooks';

export const useCompactNavigation = () => {
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

  const baseSorted = useSortedTracks(participants, 1);
  const { pins } = useClassroomPins();

  const sorted = useMemo(() => applyPinsFirst(baseSorted, pins), [baseSorted, pins]);

  const currentParticipant = sorted[currentParticipantIndex] || null;
  const totalParticipants = sorted.length;

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

  return {
    currentParticipant,
    participants: sorted,
    currentIndex: currentParticipantIndex,
    totalParticipants,
    canGoNext,
    canGoPrev,
    goToNext,
    goToPrev,
    goToParticipant,
  };
};
