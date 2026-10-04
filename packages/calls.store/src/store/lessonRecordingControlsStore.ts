import { create } from 'zustand';

export type LessonRecordingPhaseT = 'idle' | 'starting' | 'recording' | 'stopping';

export type LessonRecordingSessionT = {
  visible: boolean;
  phase: LessonRecordingPhaseT;
  startedAt: number | null;
  start: () => void;
  stop: () => void;
};

const noop = () => undefined;

const idle: LessonRecordingSessionT = {
  visible: false,
  phase: 'idle',
  startedAt: null,
  start: noop,
  stop: noop,
};

type LessonRecordingControlsStoreT = LessonRecordingSessionT & {
  /** true, пока хост (xi.tutor) сам ведёт запись. В демо xi.calls хоста нет. */
  hosted: boolean;
  setSession: (session: LessonRecordingSessionT) => void;
  reset: () => void;
};

/** Хост (xi.tutor) отдаёт сюда запуск записи. Без хоста кнопка пишет урок сама. */
export const useLessonRecordingControlsStore = create<LessonRecordingControlsStoreT>()((set) => ({
  ...idle,
  hosted: false,
  setSession: (session) => set({ ...session, hosted: true }),
  reset: () => set({ ...idle, hosted: false }),
}));
