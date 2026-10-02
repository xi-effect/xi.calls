import { create } from 'zustand';

export type LessonRecordingPresenceT = {
  active: boolean;
  startedAt: number | null;
  publisherIdentity: string | null;
};

type LessonRecordingStoreT = LessonRecordingPresenceT & {
  apply: (
    presence: Omit<LessonRecordingPresenceT, 'publisherIdentity'>,
    publisherIdentity: string | null,
  ) => void;
  clearPublisher: (identity: string) => void;
  reset: () => void;
};

const idle: LessonRecordingPresenceT = {
  active: false,
  startedAt: null,
  publisherIdentity: null,
};

/** Состояние «преподаватель записывает урок». Не персистится: после перезагрузки его заново присылает комната. */
export const useLessonRecordingStore = create<LessonRecordingStoreT>()((set, get) => ({
  ...idle,
  apply: (presence, publisherIdentity) =>
    set({
      active: presence.active,
      startedAt: presence.active ? presence.startedAt : null,
      publisherIdentity: presence.active ? publisherIdentity : null,
    }),
  clearPublisher: (identity) => {
    if (get().publisherIdentity !== identity) return;
    set(idle);
  },
  reset: () => set(idle),
}));
