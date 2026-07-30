import { create } from 'zustand';

export type FloatingReactionT = {
  id: string;
  emoji: string;
  senderId: string;
  senderName: string;
  timestamp: number;
};

export type ParticipantReactionT = {
  emoji: string;
  timestamp: number;
};

// Максимум одновременных всплывающих реакций на экране: если реагирует сразу много
// участников, лишние (самые старые) вытесняются, чтобы не разрастался DOM/анимации.
// С учётом пачки (~4 смайлика на одну реакцию) лимит повыше, чтобы не срезать чужие пачки
const MAX_FLOATING_REACTIONS = 48;

/** Как долго держится короткая метка реакции на плитке участника */
export const PARTICIPANT_REACTION_TTL_MS = 3000;

type useReactionsStoreT = {
  /** Очередь всплывающих реакций для оверлея поверх сетки видео */
  floatingReactions: FloatingReactionT[];
  /** Последняя активная реакция участника — для бейджа на плитке */
  participantReactions: Record<string, ParticipantReactionT>;

  addFloatingReaction: (reaction: FloatingReactionT) => void;
  /** Добавить несколько пузырьков одним апдейтом — иначе N set() рвут анимации на каждом рендере */
  addFloatingReactions: (reactions: FloatingReactionT[]) => void;
  removeFloatingReaction: (id: string) => void;
  setParticipantReaction: (participantId: string, emoji: string, timestamp: number) => void;
  clearParticipantReaction: (participantId: string) => void;
  clearAllReactions: () => void;
};

export const useReactionsStore = create<useReactionsStoreT>()((set, get) => ({
  floatingReactions: [],
  participantReactions: {},

  addFloatingReaction: (reaction: FloatingReactionT) => {
    get().addFloatingReactions([reaction]);
  },

  addFloatingReactions: (reactions: FloatingReactionT[]) => {
    if (reactions.length === 0) return;

    const { floatingReactions } = get();
    const existingIds = new Set(floatingReactions.map((item) => item.id));
    const unique = reactions.filter((reaction) => !existingIds.has(reaction.id));
    if (unique.length === 0) return;

    const next = [...floatingReactions, ...unique];
    const trimmed =
      next.length > MAX_FLOATING_REACTIONS
        ? next.slice(next.length - MAX_FLOATING_REACTIONS)
        : next;

    set({ floatingReactions: trimmed });
  },

  removeFloatingReaction: (id: string) =>
    set((state) => ({
      floatingReactions: state.floatingReactions.filter((item) => item.id !== id),
    })),

  setParticipantReaction: (participantId: string, emoji: string, timestamp: number) =>
    set((state) => {
      const existing = state.participantReactions[participantId];
      // Не откатываем более свежую реакцию более старым (например, задержанным) сообщением
      if (existing && existing.timestamp > timestamp) {
        return state;
      }

      return {
        participantReactions: {
          ...state.participantReactions,
          [participantId]: { emoji, timestamp },
        },
      };
    }),

  clearParticipantReaction: (participantId: string) =>
    set((state) => {
      if (!(participantId in state.participantReactions)) return state;
      const next = { ...state.participantReactions };
      delete next[participantId];
      return { participantReactions: next };
    }),

  clearAllReactions: () => set({ floatingReactions: [], participantReactions: {} }),
}));
