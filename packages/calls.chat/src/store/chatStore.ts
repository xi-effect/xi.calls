import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChatMessageT = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
};

export type useChatStoreT = {
  isChatOpen: boolean;
  chatMessages: ChatMessageT[];
  unreadMessagesCount: number;
  addChatMessage: (message: ChatMessageT) => void;
  clearUnreadMessages: () => void;
  updateStore: (type: keyof useChatStoreT, value: unknown) => void;
};

export const useChatStore = create<useChatStoreT>()(
  persist(
    (set, get) => ({
      isChatOpen: false,
      chatMessages: [],
      unreadMessagesCount: 0,
      updateStore: (type: keyof useChatStoreT, value: unknown) => set({ [type]: value }),

      addChatMessage: (message: ChatMessageT) => {
        const { isChatOpen, unreadMessagesCount, chatMessages } = get();

        // Проверяем, нет ли уже сообщения с таким ID (дедупликация)
        const messageExists = chatMessages.some((msg) => msg.id === message.id);
        if (messageExists) {
          return;
        }

        set((state) => ({
          chatMessages: [...state.chatMessages, message],
          unreadMessagesCount: isChatOpen ? unreadMessagesCount : unreadMessagesCount + 1,
        }));
      },

      clearUnreadMessages: () => set({ unreadMessagesCount: 0 }),
    }),
    {
      name: 'chat-store',
      version: 1,
    },
  ),
);
