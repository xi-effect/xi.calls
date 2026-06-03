import { Button } from '@xipkg/button';
import { Hand } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { useRaisedHands } from '../hooks';

export const RaiseHandButton = ({ className }: { className?: string }) => {
  const { toggleHand, isHandRaised, isPending } = useRaisedHands();

  return (
    <Button
      size="icon"
      variant="none"
      onClick={toggleHand}
      className={cn(
        'bg-gray-0 hover:bg-gray-5 relative m-0 rounded-xl p-0 text-gray-100',
        !className && 'h-10 w-10',
        isHandRaised && 'text-brand-100',
        className,
      )}
      data-umami-event="call-raise-hand"
      data-umami-event-state={isHandRaised ? 'lower' : 'raise'}
      disabled={isPending}
    >
      <Hand className={cn('h-6 w-6', isHandRaised ? 'fill-brand-100' : 'fill-gray-100')} />
    </Button>
  );
};
