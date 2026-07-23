import { Button } from '@xipkg/button';
import { Chat } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';

type ChatButtonProps = {
  /** Дополнительные классы (например, для компактной панели: h-8 w-8 rounded-xl) */
  className?: string;
};

export const ChatButton = ({ className }: ChatButtonProps) => {
  const { toggleChat } = useChat();
  const { isChatOpen, unreadMessagesCount } = useChatStore();

  return (
    <Button
      size="icon"
      variant="none"
      onClick={toggleChat}
      className={cn(
        'bg-background-surface hover:bg-background-page text-text-primary relative m-0 rounded-xl p-0',
        !className && 'h-10 w-10 min-w-10',
        isChatOpen && 'text-text-link',
        className,
      )}
      data-umami-event="call-toggle-chat"
      data-umami-event-state={isChatOpen ? 'close' : 'open'}
    >
      <Chat className={cn('h-6 w-6', isChatOpen ? 'fill-icon-brand' : 'fill-icon-primary')} />
      {unreadMessagesCount > 0 && (
        <div className="text-text-danger bg-action-primary-background-pressed absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
          {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
        </div>
      )}
    </Button>
  );
};
