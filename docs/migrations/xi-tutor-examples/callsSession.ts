/**
 * Эталон для xi.tutor/modules.calls/src/callsSession.ts
 */
import type { CallsSessionPortT } from '@xipkg/calls-providers';
import { useChatStore } from '@xipkg/calls-chat';
import { useReactionsStore } from '@xipkg/calls-store';

export const callsSessionPort: CallsSessionPortT = {
  clearConferenceUiState: () => {
    const chat = useChatStore.getState();
    chat.updateStore('isChatOpen', false);
    chat.updateStore('chatMessages', []);
    chat.updateStore('unreadMessagesCount', 0);

    // Иначе при повторном входе в звонок оверлей заново анимирует старые реакции из стора
    useReactionsStore.getState().clearAllReactions();
  },
};
