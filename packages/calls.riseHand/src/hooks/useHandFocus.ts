import { useEffect } from 'react';
import { Track } from 'livekit-client';
import { useCallStore } from '@xipkg/calls-store';
import { useRoom } from '@xipkg/calls-providers';
import { useMaybeLayoutContext } from '@livekit/components-react';

export const useHandFocus = () => {
  const { raisedHands } = useCallStore();
  const { room } = useRoom();
  const layoutContext = useMaybeLayoutContext();

  useEffect(() => {
    if (!room || raisedHands.length === 0 || !layoutContext?.pin.dispatch) return;

    const earliestHand = raisedHands.reduce((earliest, current) =>
      current.timestamp < earliest.timestamp ? current : earliest,
    );

    const participant = room.getParticipantByIdentity(earliestHand.participantId);

    if (participant) {
      const cameraTrack = Array.from(participant.videoTrackPublications.values()).find(
        (track) => track.source === 'camera',
      );

      if (cameraTrack) {
        layoutContext.pin.dispatch({
          msg: 'set_pin',
          trackReference: {
            participant,
            source: Track.Source.Camera,
            publication: cameraTrack,
          },
        });
      }
    }
  }, [raisedHands, room, layoutContext]);
};
