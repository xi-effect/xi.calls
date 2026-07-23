import { useDisconnectButton } from '@livekit/components-react';
import { Endcall } from '@xipkg/icons';
import { useCallStore } from '@xipkg/calls-store';
import { Button } from '@xipkg/button';
import { cn } from '@xipkg/utils';

export const DisconnectButton = ({ className }: { className?: string }) => {
  const { buttonProps } = useDisconnectButton({});

  const updateStore = useCallStore((state) => state.updateStore);

  const handleDisconnect = () => {
    buttonProps.onClick?.();
    updateStore('isStarted', false);
    updateStore('connect', false);
  };

  return (
    <Button
      variant="none"
      type="button"
      disabled={buttonProps.disabled}
      onClick={handleDisconnect}
      className={cn(
        'bg-background-surface hover:bg-status-error-background flex h-10 w-10 flex-row items-center justify-center rounded-[16px] p-0',
        className,
      )}
      data-umami-event="call-disconnect"
    >
      <Endcall className="fill-icon-danger" />
    </Button>
  );
};
