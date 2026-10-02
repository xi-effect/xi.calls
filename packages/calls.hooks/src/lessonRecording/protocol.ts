/** Тип data-message LiveKit. Формат совпадает с `useLiveKitDataChannel`, чтобы общий слушатель не считал пакет битым. */
export const LESSON_RECORDING_DATA_TYPE = 'lesson_recording';

export type LessonRecordingPayloadT = {
  active: boolean;
  startedAt: number | null;
};

export function parseLessonRecordingPayload(payload: unknown): LessonRecordingPayloadT | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as { active?: unknown; startedAt?: unknown };
  if (typeof record.active !== 'boolean') return null;
  if (record.startedAt !== null && typeof record.startedAt !== 'number') return null;
  return {
    active: record.active,
    startedAt: record.active && typeof record.startedAt === 'number' ? record.startedAt : null,
  };
}
