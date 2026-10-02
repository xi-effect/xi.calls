import { useCallback, useEffect } from 'react';
import { RoomEvent, type RemoteParticipant, type Room } from 'livekit-client';
import { useRoom } from '@xipkg/calls-providers';
import { useLessonRecordingStore, type LessonRecordingPresenceT } from '@xipkg/calls-store';
import {
  LESSON_RECORDING_DATA_TYPE,
  parseLessonRecordingPayload,
  type LessonRecordingPayloadT,
} from '../lessonRecording/protocol';

function publishLessonRecording(room: Room, payload: LessonRecordingPayloadT): void {
  if (room.state !== 'connected') return;
  const message = {
    type: LESSON_RECORDING_DATA_TYPE,
    payload,
    timestamp: Date.now(),
  };
  try {
    room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(message)), {
      reliable: true,
    });
  } catch {
    // Индикатор записи не должен рвать звонок.
  }
}

function resendLocalRecording(room: Room): void {
  const state = useLessonRecordingStore.getState();
  if (!state.active) return;
  if (state.publisherIdentity !== room.localParticipant.identity) return;
  publishLessonRecording(room, { active: true, startedAt: state.startedAt });
}

/**
 * Слушает data channel и заново рассылает состояние тем, кто только что вошёл.
 * Монтировать один раз внутри комнаты, где живёт LiveKit.
 */
export function LessonRecordingPresenceSync(): null {
  const { room } = useRoom();

  useEffect(() => {
    const onData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(payload)) as {
          type?: unknown;
          payload?: unknown;
        };
        if (message?.type !== LESSON_RECORDING_DATA_TYPE) return;
        const parsed = parseLessonRecordingPayload(message.payload);
        if (!parsed) return;
        useLessonRecordingStore.getState().apply(parsed, participant?.identity ?? null);
      } catch {
        // Чужие бинарные пакеты сюда тоже приходят.
      }
    };

    const onLeft = (participant: RemoteParticipant) => {
      useLessonRecordingStore.getState().clearPublisher(participant.identity);
    };

    const onResend = () => resendLocalRecording(room);
    const onDisconnected = () => useLessonRecordingStore.getState().reset();

    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.ParticipantDisconnected, onLeft);
    room.on(RoomEvent.ParticipantConnected, onResend);
    room.on(RoomEvent.Reconnected, onResend);
    room.on(RoomEvent.Disconnected, onDisconnected);

    return () => {
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.ParticipantDisconnected, onLeft);
      room.off(RoomEvent.ParticipantConnected, onResend);
      room.off(RoomEvent.Reconnected, onResend);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room]);

  return null;
}

export function useLessonRecordingPresence(): LessonRecordingPresenceT {
  const active = useLessonRecordingStore((state) => state.active);
  const startedAt = useLessonRecordingStore((state) => state.startedAt);
  const publisherIdentity = useLessonRecordingStore((state) => state.publisherIdentity);
  return { active, startedAt, publisherIdentity };
}

/** Преподаватель сообщает комнате, что локальная запись идёт или остановлена. */
export function usePublishLessonRecording(): (active: boolean, startedAt: number | null) => void {
  const { room } = useRoom();

  return useCallback(
    (active: boolean, startedAt: number | null) => {
      const identity = room.localParticipant?.identity ?? null;
      useLessonRecordingStore.getState().apply({ active, startedAt }, active ? identity : null);
      publishLessonRecording(room, { active, startedAt: active ? startedAt : null });
    },
    [room],
  );
}
