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
        'bg-gray-0 hover:bg-gray-5 relative m-0 p-0 text-gray-100',
        !className && 'h-10 w-10 min-w-10 rounded-lg',
        isChatOpen && 'text-brand-100',
        className,
      )}
      data-umami-event="call-toggle-chat"
      data-umami-event-state={isChatOpen ? 'close' : 'open'}
    >
      <Chat className={cn('h-5 w-5', isChatOpen ? 'fill-brand-100' : 'fill-gray-100')} />
      {unreadMessagesCount > 0 && (
        <div className="text-red-0 bg-brand-100 absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
          {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
        </div>
      )}
    </Button>
  );
};
