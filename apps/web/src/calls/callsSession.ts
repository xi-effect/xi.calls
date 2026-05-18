import type { CallsSessionPortT } from 'calls.providers';
import { useChatStore } from 'calls.chat';

export const callsSessionPort: CallsSessionPortT = {
  clearConferenceUiState: () => {
    const chat = useChatStore.getState();
    chat.updateStore('isChatOpen', false);
    chat.updateStore('chatMessages', []);
    chat.updateStore('unreadMessagesCount', 0);
  },
};
