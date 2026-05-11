import { useEffect, useCallback, useMemo, useRef } from 'react';
import { Participant, RoomEvent } from 'livekit-client';
import { useParams, useSearch } from '@tanstack/react-router';
import { useCallStore, useSoundEffectsStore } from 'calls.store';
import { useCalls, useRoom } from 'calls.providers';
import { playSound } from 'common.utils';

export const useRaisedHands = () => {
  const { callId: paramsCallId } = useParams({ strict: false });
  const { call: searchCallId } = useSearch({ strict: false });
  const prevHands = useRef<Record<string, boolean>>({});
  const handRaiseSoundVolume = useSoundEffectsStore((s) => s.handRaiseVolume);

  const callId = paramsCallId ?? searchCallId;
  const { room } = useRoom();
  const { data: user } = useCalls().auth.useCurrentUser();

  const { addRaisedHand, removeRaisedHand } = useCallStore();

  const { updateParticipantMetadata, isPending } = useCalls().updateParticipantMetadata;

  const isHandRaised = useMemo(() => {
    try {
      const parsed = JSON.parse(room?.localParticipant?.metadata ?? '{}');
      return !!parsed.is_hand_raised;
    } catch {
      return false;
    }
  }, [room?.localParticipant?.metadata]);

  const toggleHand = useCallback(async () => {
    if (!room?.localParticipant || !callId) return;

    try {
      await updateParticipantMetadata({
        classroom_id: callId,
        is_hand_raised: !isHandRaised,
        role: user?.defaultLayout,
      });
    } catch (e) {
      console.error('raise hand error', e);
    }
  }, [
    room?.localParticipant,
    callId,
    updateParticipantMetadata,
    isHandRaised,
    user?.defaultLayout,
  ]);

  useEffect(() => {
    if (!room) return;

    const syncParticipant = (participant: Participant) => {
      try {
        const parsed = JSON.parse(participant.metadata || '{}');

        if (!('is_hand_raised' in parsed)) return;

        const prev = prevHands.current[participant.identity];

        if (parsed.is_hand_raised) {
          addRaisedHand({
            participantId: participant.identity,
            participantName: participant.name ?? participant.identity,
            timestamp: Date.now(),
          });

          if (!prev) {
            playSound('handRaise', handRaiseSoundVolume);
          }
        } else {
          removeRaisedHand(participant.identity);
        }
      } catch (e) {
        console.error('metadata parse error', e);
      }
    };

    const handler = (_metadata: string | undefined, participant: Participant) => {
      syncParticipant(participant);
    };

    room.on(RoomEvent.ParticipantMetadataChanged, handler);

    syncParticipant(room.localParticipant);
    room.remoteParticipants.forEach(syncParticipant);

    return () => {
      room.off(RoomEvent.ParticipantMetadataChanged, handler);
    };
  }, [room, addRaisedHand, removeRaisedHand, handRaiseSoundVolume]);

  return {
    toggleHand,
    isHandRaised,
    isPending: isPending,
  };
};
