import { useState, useRef, useEffect } from 'react';
import { Button } from '@xipkg/button';
import { Textarea } from '@xipkg/textarea';
import { Send, Close } from '@xipkg/icons';
import { UserProfile } from '@xipkg/userprofile';
import { ScrollArea } from '@xipkg/scrollarea';
import { Modal, ModalContent, ModalTitle } from '@xipkg/modal';
import { useChat } from '../hooks';
import { useCalls } from '@xipkg/calls-providers';
import { useChatStore } from '../store';
import { cn, useMediaQuery } from '@xipkg/utils';
import { parseLinks } from '../utils/chat';

type ChatProps = {
  /** В компакт-режиме: классы позиционирования (как у CompactCall: top-16 bottom-4 left-4 и т.д.) */
  compactPositionClassName?: string;
};

export const Chat = ({ compactPositionClassName }: ChatProps = {}) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendChatMessage, closeChat } = useChat();
  const { chatMessages, isChatOpen } = useChatStore();
  const { data: currentUser } = useCalls().auth.useCurrentUser();

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
    }
  }, [isChatOpen]);

  // Автоматическая прокрутка при получении новых сообщений
  useEffect(() => {
    if (isChatOpen && chatMessages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom('smooth');
      });
    }
  }, [chatMessages.length, isChatOpen]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendChatMessage(messageText);
      setMessageText('');
      requestAnimationFrame(() => {
        scrollToBottom('smooth');
      });
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDownSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter без Shift - отправка сообщения
    // Shift+Enter - перенос строки (разрешаем стандартное поведение)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Если Shift+Enter, не предотвращаем стандартное поведение - будет перенос строки
  };

  const isMobile = useMediaQuery('(max-width: 639px)');
  if (!isChatOpen) return null;

  const chatContent = (
    <>
      {/* Заголовок */}
      <div className="border-border-default flex items-center justify-between pr-3">
        <h3 className="text-text-primary text-lg font-medium">Чат</h3>
        <Button size="icon" variant="none" onClick={closeChat}>
          <Close className="h-6 w-6" aria-label="Закрыть чат" />
        </Button>
      </div>

      {/* Сообщения */}
      <ScrollArea className="min-h-0 flex-1 py-2 pr-3">
        <div className="space-y-4">
          {chatMessages.length === 0 ? (
            <div className="text-text-secondary text-center">
              <p>Начните общение в чате</p>
            </div>
          ) : (
            chatMessages.map((message) => {
              const isOwnMessage = Number(message.senderId) === Number(currentUser?.id);
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="text-text-primary flex max-w-[90%] flex-col gap-1 rounded-lg select-text">
                    <div className="text-text-primary flex flex-row items-center gap-1 text-xs font-medium">
                      {!isOwnMessage && (
                        <UserProfile
                          size="s"
                          userId={Number(message.senderId)}
                          text={message.senderName}
                          src={`https://api.sovlium.ru/files/users/${message.senderId}/avatar.webp`}
                        />
                      )}
                      <div
                        className={`text-xs-base ${isOwnMessage ? 'text-text-disabled ml-auto' : 'text-text-secondary'}`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'cursor-text rounded-lg px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap select-text',
                        isOwnMessage
                          ? 'bg-action-primary-background-disabled'
                          : 'bg-background-page',
                      )}
                    >
                      {parseLinks(message.text)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Поле ввода */}
      <div className="flex items-end gap-2 pr-3">
        <div className="border-border-default flex max-h-40 w-full flex-1 items-center rounded-xl border pl-4">
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Напишите сообщение..."
            className="my-3 max-h-32 min-w-full rounded-none border-none p-0 pr-2"
            onKeyDown={handleKeyDownSendMessage}
          />
          <div className="pr-1">
            <Button
              size="icon"
              variant="primary"
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="rounded-xl p-2"
            >
              <Send
                className={cn(
                  'fill-action-primary-text group-hover:fill-action-primary-text h-6 w-6',
                  !messageText.trim() && 'fill-icon-secondary',
                )}
              />
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Modal open={isChatOpen} onOpenChange={(open) => !open && closeChat()}>
        <ModalContent
          className="border-border-default bg-background-surface flex h-[85dvh] max-h-[85dvh] w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-2xl border p-4 pr-1"
          aria-describedby={undefined}
        >
          <ModalTitle className="sr-only">Чат</ModalTitle>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{chatContent}</div>
        </ModalContent>
      </Modal>
    );
  }

  if (compactPositionClassName) {
    return (
      <div
        className={cn(
          'border-border-default bg-background-surface fixed z-100 flex min-h-0 w-[328px] flex-col overflow-hidden rounded-2xl border p-4 pr-1 shadow-lg',
          compactPositionClassName,
        )}
      >
        {chatContent}
      </div>
    );
  }

  return (
    <div className="bg-background-surface border-border-default sm:border-border-default fixed flex h-full min-h-0 w-full max-w-none min-w-[328px] flex-col overflow-hidden rounded-2xl border p-4 pr-1 sm:relative sm:max-w-[328px]">
      {chatContent}
    </div>
  );
};
