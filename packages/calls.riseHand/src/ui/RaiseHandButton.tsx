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
        'bg-background-surface hover:bg-background-page text-text-primary relative m-0 rounded-xl p-0',
        !className && 'h-10 w-10',
        isHandRaised && 'text-text-link',
        className,
      )}
      data-umami-event="call-raise-hand"
      data-umami-event-state={isHandRaised ? 'lower' : 'raise'}
      disabled={isPending}
    >
      <Hand className={cn('h-6 w-6', isHandRaised ? 'fill-icon-brand' : 'fill-icon-primary')} />
    </Button>
  );
};
