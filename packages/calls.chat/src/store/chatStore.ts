import { create } from 'zustand';

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

// Чат передаётся только через LiveKit DataChannel (P2P/broadcast в рамках текущего звонка),
// серверной истории сообщений нет. Раньше стор персистился в localStorage без привязки
// к конкретному звонку — сообщения предыдущего звонка «утекали» в следующий на том же
// устройстве (и только у того пользователя, у кого localStorage не был очищен штатным
// disconnect-флоу). Стор намеренно НЕ персистится: чат живёт только в памяти на время
// звонка и одинаково пуст у всех при входе в новый звонок.
export const useChatStore = create<useChatStoreT>()((set, get) => ({
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
}));
