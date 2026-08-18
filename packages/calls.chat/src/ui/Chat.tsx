import { useRef, useEffect } from 'react';
import type { JSONContent } from '@tiptap/core';
import { Button } from '@xipkg/button';
import { Close, Trash } from '@xipkg/icons';
import { UserProfile } from '@xipkg/userprofile';
import { ScrollArea } from '@xipkg/scrollarea';
import { Modal, ModalContent, ModalTitle } from '@xipkg/modal';
import { useTranslation } from 'react-i18next';
import { useChat } from '../hooks';
import { useCalls } from '@xipkg/calls-providers';
import { useChatStore } from '../store';
import { cn, useMediaQuery } from '@xipkg/utils';
import { ChatComposer } from './ChatComposer';
import { ChatMessageContent } from './ChatMessageContent';

type ChatProps = {
  /** В компакт-режиме: классы позиционирования (как у CompactCall: top-16 bottom-4 left-4 и т.д.) */
  compactPositionClassName?: string;
  /** Встроить чат в родителя (PiP): без fixed/modal, на всю доступную высоту */
  embedded?: boolean;
};

export const Chat = ({ compactPositionClassName, embedded = false }: ChatProps = {}) => {
  const { t, i18n } = useTranslation('calls');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendChatMessage, deleteChatMessage, closeChat } = useChat();
  const { chatMessages, isChatOpen } = useChatStore();
  const { data: currentUser } = useCalls().auth.useCurrentUser();
  const timeLocale = i18n.language?.startsWith('ru')
    ? 'ru-RU'
    : i18n.language?.startsWith('en')
      ? 'en-US'
      : i18n.language;

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

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

  const handleSendMessage = (text: string, content?: JSONContent) => {
    sendChatMessage(text, content);
    requestAnimationFrame(() => {
      scrollToBottom('smooth');
    });
  };

  const isMobile = useMediaQuery('(max-width: 639px)');
  if (!isChatOpen) return null;

  const chatPanelClassName =
    'border-border-default bg-background-surface flex min-h-0 flex-col overflow-hidden rounded-2xl border p-4 pr-1';

  const chatContent = (
    <>
      {/* Заголовок */}
      <div className="border-border-default flex shrink-0 items-center justify-between pr-3">
        <h3 className="text-text-primary text-lg font-medium">{t('chat.title')}</h3>
        <Button size="icon" variant="none" onClick={closeChat}>
          <Close className="h-6 w-6" aria-label={t('chat.close')} />
        </Button>
      </div>

      {/* Сообщения */}
      <ScrollArea className="h-full min-h-0 flex-1 py-2 pr-3">
        <div className="space-y-4">
          {chatMessages.length === 0 ? (
            <div className="text-text-secondary text-center">
              <p>{t('chat.empty')}</p>
            </div>
          ) : (
            chatMessages.map((message) => {
              const isOwnMessage = Number(message.senderId) === Number(currentUser?.id);
              return (
                <div
                  key={message.id}
                  className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
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
                        {new Date(message.timestamp).toLocaleTimeString(timeLocale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="relative">
                      <ChatMessageContent
                        text={message.text}
                        content={message.content}
                        className={cn(
                          'cursor-text rounded-lg px-3 py-2 select-text',
                          isOwnMessage
                            ? 'bg-action-primary-background-disabled'
                            : 'bg-background-page',
                        )}
                      />
                      {isOwnMessage && (
                        <Button
                          type="button"
                          size="icon"
                          variant="none"
                          className="bg-background-surface border-border-default absolute -top-2 -left-2 h-7 w-7 rounded-full border p-1 opacity-100 shadow-sm sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                          onClick={() => deleteChatMessage(message.id)}
                          aria-label={t('chat.deleteAria')}
                        >
                          <Trash className="fill-icon-secondary h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <ChatComposer placeholder={t('chat.placeholder')} onSend={handleSendMessage} />
    </>
  );

  if (embedded) {
    return <div className={cn(chatPanelClassName, 'h-full min-h-0 w-full')}>{chatContent}</div>;
  }

  if (isMobile) {
    return (
      <Modal open={isChatOpen} onOpenChange={(open) => !open && closeChat()}>
        <ModalContent
          className="border-border-default bg-background-surface flex h-[85dvh] max-h-[85dvh] w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-2xl border p-4 pr-1"
          aria-describedby={undefined}
        >
          <ModalTitle className="sr-only">{t('chat.title')}</ModalTitle>
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
