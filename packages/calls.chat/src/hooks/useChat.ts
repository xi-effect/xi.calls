import { useCallback } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useLiveKitDataChannel, useLiveKitDataChannelListener } from '@xipkg/calls-hooks';
import { useRoom } from '@xipkg/calls-providers';
import { useSoundEffectsStore } from '@xipkg/calls-store';
import { playSound } from '@xipkg/calls-utils';
import { sanitizeChatContent } from '../editor/sanitizeContent';
import { useChatStore } from '../store';
import type { ChatMessageT } from '../types';

const CHAT_MESSAGE_TYPE = 'chat_message';
const CHAT_MESSAGE_DELETE_TYPE = 'chat_message_delete';

type ChatMessagePayload = ChatMessageT;

type ChatMessageDeletePayload = {
  id: string;
  senderId: string;
};

export const useChat = () => {
  const { sendMessage } = useLiveKitDataChannel();
  const { addChatMessage, removeChatMessage, clearUnreadMessages, updateStore } = useChatStore();
  const chatSoundVolume = useSoundEffectsStore((s) => s.chatMessageVolume);
  const { room } = useRoom();

  // Получаем информацию о текущем участнике из LiveKit
  const getCurrentParticipantInfo = useCallback(() => {
    if (!room?.localParticipant) {
      return {
        senderId: 'unknown',
        senderName: 'Unknown User',
      };
    }

    const participant = room.localParticipant;

    try {
      // Парсим метаданные участника
      const metadata = participant.metadata;
      if (metadata) {
        const userInfo = JSON.parse(metadata);
        return {
          senderId: userInfo?.user_id || userInfo?.id || participant.identity,
          senderName:
            userInfo?.display_name ||
            userInfo?.name ||
            userInfo?.username ||
            participant.name ||
            participant.identity,
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse participant metadata:', error);
    }

    // Fallback на стандартные поля LiveKit
    return {
      senderId: participant.identity,
      senderName: participant.name || participant.identity,
    };
  }, [room]);

  const handleChatMessage = useCallback(
    (message: { type: string; payload: unknown }) => {
      if (message.type === CHAT_MESSAGE_TYPE) {
        const payload = message.payload as ChatMessagePayload;

        // Проверяем, что это не наше собственное сообщение
        const currentParticipantInfo = getCurrentParticipantInfo();
        if (payload.senderId === currentParticipantInfo.senderId) {
          return;
        }

        addChatMessage({
          ...payload,
          content: sanitizeChatContent(payload.content),
        });
        playSound('chatMessage', chatSoundVolume);
        return;
      }

      if (message.type === CHAT_MESSAGE_DELETE_TYPE) {
        const payload = message.payload as ChatMessageDeletePayload;
        if (!payload?.id || !payload?.senderId) return;

        // Удаляем только если автор удаления совпадает с автором сообщения —
        // чужой клиент не может удалить чужие сообщения через поддельный payload.
        const existing = useChatStore.getState().chatMessages.find((msg) => msg.id === payload.id);
        if (!existing) return;
        if (String(existing.senderId) !== String(payload.senderId)) return;

        removeChatMessage(payload.id);
      }
    },
    [addChatMessage, removeChatMessage, getCurrentParticipantInfo, chatSoundVolume],
  );

  // Слушаем сообщения чата
  useLiveKitDataChannelListener(handleChatMessage);

  const sendChatMessage = useCallback(
    (text: string, content?: JSONContent) => {
      if (!text.trim()) return;

      const participantInfo = getCurrentParticipantInfo();
      const sanitizedContent = sanitizeChatContent(content);
      const message: ChatMessagePayload = {
        id: `${Date.now()}-${Math.random()}`,
        text: text.trim(),
        ...(sanitizedContent ? { content: sanitizedContent } : {}),
        senderId: participantInfo.senderId,
        senderName: participantInfo.senderName,
        timestamp: Date.now(),
      };

      // Добавляем сообщение в локальный store отправителя
      addChatMessage(message);

      // Отправляем через DataChannel
      sendMessage(CHAT_MESSAGE_TYPE, message);
    },
    [sendMessage, getCurrentParticipantInfo, addChatMessage],
  );

  const deleteChatMessage = useCallback(
    (messageId: string) => {
      const existing = useChatStore.getState().chatMessages.find((msg) => msg.id === messageId);
      if (!existing) return;

      const participantInfo = getCurrentParticipantInfo();
      if (String(existing.senderId) !== String(participantInfo.senderId)) return;

      const payload: ChatMessageDeletePayload = {
        id: messageId,
        senderId: participantInfo.senderId,
      };

      // Optimistic: сразу убираем у себя, затем broadcast для остальных
      removeChatMessage(messageId);
      sendMessage(CHAT_MESSAGE_DELETE_TYPE, payload);
    },
    [sendMessage, getCurrentParticipantInfo, removeChatMessage],
  );

  const toggleChat = useCallback(() => {
    updateStore('isChatOpen', !useChatStore.getState().isChatOpen);
    clearUnreadMessages();
  }, [updateStore, clearUnreadMessages]);

  const openChat = useCallback(() => {
    updateStore('isChatOpen', true);
    clearUnreadMessages();
  }, [updateStore, clearUnreadMessages]);

  const closeChat = useCallback(() => {
    updateStore('isChatOpen', false);
  }, [updateStore]);

  return {
    sendChatMessage,
    deleteChatMessage,
    toggleChat,
    openChat,
    closeChat,
  };
};
