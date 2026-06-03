import { Hand } from '@xipkg/icons';
import { useParticipantInfo } from '@livekit/components-react';
import { Participant } from 'livekit-client';

type RaisedHandIndicatorPropsT = {
  participant: Participant;
  compact?: boolean; // Для компактного отображения в метаданных
};

export const RaisedHandIndicator = ({
  participant,
  compact = false,
}: RaisedHandIndicatorPropsT) => {
  const { metadata } = useParticipantInfo({ participant });
  const isHandRaised = JSON.parse(metadata || '{}').is_hand_raised;

  if (!isHandRaised) return null;

  if (compact) {
    return (
      <div className="bg-brand-100 text-brand-0 flex h-6 w-6 items-center justify-center rounded-lg">
        <Hand className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="bg-gray-0/80 text-brand-0 flex h-8 w-8 items-center justify-center rounded-2xl">
      <Hand className="h-6 w-6" />
    </div>
  );
};
