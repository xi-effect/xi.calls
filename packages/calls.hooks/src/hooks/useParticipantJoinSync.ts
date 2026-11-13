import { useEffect, useCallback } from 'react';
import { RoomEvent, RemoteParticipant } from 'livekit-client';
import {
  isSharedMaterialPath,
  navigateToSharedMaterial,
  useRoom,
  useCalls,
  useCallsNavigation,
  type SharedMaterialKindT,
} from '@xipkg/calls-providers';
import { useCallStore } from '@xipkg/calls-store';
import { useLiveKitDataChannel, useLiveKitDataChannelListener } from './useLiveKitDataChannel';

const STATE_REQUEST_MESSAGE_TYPE = 'state_request';
const STATE_RESPONSE_MESSAGE_TYPE = 'state_response';

type StateRequestPayload = {
  participantId: string;
};

type StateResponsePayload = {
  mode: 'compact' | 'full';
  boardId?: string;
  classroom?: string;
  contentKind?: SharedMaterialKindT;
};

/**
 * Хук для синхронизации состояния при подключении новых участников
 * - Репетитор отправляет текущее состояние новым участникам, если он в compact mode на доске
 * - Новые участники могут запросить текущее состояние у репетитора
 */
export const useParticipantJoinSync = () => {
  const { room } = useRoom();
  const navigation = useCallsNavigation();
  const { sendMessageToParticipant } = useLiveKitDataChannel();
  const { auth } = useCalls();
  const { data: user } = auth.useCurrentUser();
  const isTutor = user?.default_layout === 'tutor';
  const mode = useCallStore((state) => state.mode);
  const activeBoardId = useCallStore((state) => state.activeBoardId);
  const activeMaterialKind = useCallStore((state) => state.activeMaterialKind);
  const activeClassroom = useCallStore((state) => state.activeClassroom);
  const updateStore = useCallStore((state) => state.updateStore);

  // Обработка запроса состояния от нового участника
  const handleStateRequest = useCallback(
    (message: { type: string; payload: unknown }) => {
      try {
        if (message.type === STATE_REQUEST_MESSAGE_TYPE && isTutor) {
          const payload = message.payload as StateRequestPayload;

          // Валидируем payload
          if (!payload || typeof payload !== 'object' || !payload.participantId) {
            console.error('❌ Invalid state request payload:', payload);
            return;
          }

          // Если репетитор в compact mode на доске, отправляем состояние новому участнику
          if (mode === 'compact' && activeBoardId) {
            const responsePayload: StateResponsePayload = {
              mode: 'compact',
              boardId: activeBoardId,
              classroom: activeClassroom,
              contentKind: activeMaterialKind ?? 'board',
            };

            sendMessageToParticipant(
              payload.participantId,
              STATE_RESPONSE_MESSAGE_TYPE,
              responsePayload,
            );
          }
        }
      } catch (error) {
        console.error('❌ Error handling state request:', error);
      }
    },
    [isTutor, mode, activeBoardId, activeMaterialKind, activeClassroom, sendMessageToParticipant],
  );

  // Обработка ответа на запрос состояния (для новых участников)
  const handleStateResponse = useCallback(
    (message: { type: string; payload: unknown }) => {
      try {
        if (message.type === STATE_RESPONSE_MESSAGE_TYPE && !isTutor) {
          const payload = message.payload as StateResponsePayload;

          // Валидируем payload
          if (!payload || typeof payload !== 'object') {
            console.error('❌ Student: Invalid state response payload:', payload);
            return;
          }

          if (!payload.mode || !['compact', 'full'].includes(payload.mode)) {
            console.error('❌ Student: Invalid mode value in state response:', payload.mode);
            return;
          }

          // Получаем текущий режим и состояние доски
          const currentMode = useCallStore.getState().mode;
          const currentActiveBoardId = useCallStore.getState().activeBoardId;
          const isOnMaterialPage = isSharedMaterialPath(window.location.pathname);

          // Если студент уже в full mode и НЕ на доске, проверяем, был ли он на доске ранее
          // Если был activeBoardId (студент был на доске и переключился на full),
          // то НЕ переключаем его обратно на доску
          // Если НЕТ activeBoardId (студент только что подключился), то переключаемся на доску
          const wasOnBoard = currentActiveBoardId !== undefined;

          if (currentMode === 'full' && !isOnMaterialPage && wasOnBoard) {
            // Студент сам переключился на full mode с доски - игнорируем ответ о compact mode
            return;
          }

          // Если репетитор в compact mode на доске, переключаемся на эту доску
          if (payload.mode === 'compact' && payload.boardId) {
            const contentKind = payload.contentKind === 'note' ? 'note' : 'board';
            const classroomId = payload.classroom || activeClassroom;

            updateStore('mode', 'compact');
            updateStore('activeBoardId', payload.boardId);
            updateStore('activeMaterialKind', contentKind);
            updateStore('activeClassroom', classroomId);

            navigateToSharedMaterial(navigation, payload.boardId, classroomId, contentKind, {
              search: classroomId ? { call: classroomId } : undefined,
            });
          }
        }
      } catch (error) {
        console.error('❌ Student: Error handling state response:', error);
      }
    },
    [isTutor, updateStore, navigation, activeClassroom],
  );

  // Объединенный обработчик для всех сообщений состояния
  const handleDataMessage = useCallback(
    (message: { type: string; payload: unknown }) => {
      if (message.type === STATE_REQUEST_MESSAGE_TYPE) {
        handleStateRequest(message);
      } else if (message.type === STATE_RESPONSE_MESSAGE_TYPE) {
        handleStateResponse(message);
      }
    },
    [handleStateRequest, handleStateResponse],
  );

  // Слушаем сообщения о запросе и ответе состояния
  useLiveKitDataChannelListener(handleDataMessage);

  // Отслеживание подключения новых участников (для репетитора)
  useEffect(() => {
    if (!room || !isTutor) {
      return;
    }

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      // Пропускаем локального участника
      if (participant.identity === room.localParticipant?.identity) {
        return;
      }

      // Если репетитор в compact mode на доске, отправляем состояние новому участнику
      if (mode === 'compact' && activeBoardId) {
        // Небольшая задержка, чтобы убедиться, что участник полностью подключен
        setTimeout(() => {
          const responsePayload: StateResponsePayload = {
            mode: 'compact',
            boardId: activeBoardId,
            classroom: activeClassroom,
            contentKind: activeMaterialKind ?? 'board',
          };

          sendMessageToParticipant(
            participant.identity,
            STATE_RESPONSE_MESSAGE_TYPE,
            responsePayload,
          );
        }, 1500);
      }
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    // Функция для отправки состояния всем подключенным участникам
    const sendStateToAllParticipants = () => {
      if (room.state !== 'connected' || mode !== 'compact' || !activeBoardId) {
        return;
      }

      const existingParticipants = Array.from(room.remoteParticipants.values());

      existingParticipants.forEach((participant) => {
        if (participant.identity !== room.localParticipant?.identity) {
          const responsePayload: StateResponsePayload = {
            mode: 'compact',
            boardId: activeBoardId,
            classroom: activeClassroom,
            contentKind: activeMaterialKind ?? 'board',
          };

          sendMessageToParticipant(
            participant.identity,
            STATE_RESPONSE_MESSAGE_TYPE,
            responsePayload,
          );
        }
      });
    };

    // Проверяем уже подключенных участников при монтировании хука
    if (room.state === 'connected') {
      const existingParticipants = Array.from(room.remoteParticipants.values());
      existingParticipants.forEach((participant) => {
        if (participant.identity !== room.localParticipant?.identity) {
          handleParticipantConnected(participant);
        }
      });
    }

    // Также отправляем состояние при изменении mode или activeBoardId
    // (на случай, если репетитор переключился на доску после подключения студентов)
    if (room.state === 'connected' && mode === 'compact' && activeBoardId) {
      // Небольшая задержка для стабильности
      const timeoutId = setTimeout(() => {
        sendStateToAllParticipants();
      }, 500);

      return () => {
        room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
        clearTimeout(timeoutId);
      };
    }

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [
    room,
    isTutor,
    mode,
    activeBoardId,
    activeMaterialKind,
    activeClassroom,
    sendMessageToParticipant,
  ]);

  // Запрос состояния при подключении (для новых участников, не репетиторов)
  useEffect(() => {
    if (!room || isTutor) return;

    const requestState = () => {
      if (room.state !== 'connected') {
        return;
      }

      // Всегда запрашиваем состояние при подключении
      // Защита от автоматического переключения обратно на доску реализована в handleStateResponse
      const localParticipant = room.localParticipant;
      if (!localParticipant) {
        return;
      }

      // Находим репетитора среди участников
      const participants = Array.from(room.remoteParticipants.values());

      if (participants.length === 0) {
        return;
      }

      const tutor = participants.find((p) => {
        try {
          if (!p.metadata || p.metadata.trim() === '') {
            return false;
          }
          const metadata = JSON.parse(p.metadata);
          return metadata?.default_layout === 'tutor';
        } catch {
          return false;
        }
      });

      // Если репетитор не найден по метаданным, отправляем запрос всем участникам
      if (!tutor && participants.length > 0) {
        const requestPayload: StateRequestPayload = {
          participantId: localParticipant.identity,
        };

        participants.forEach((participant) => {
          sendMessageToParticipant(
            participant.identity,
            STATE_REQUEST_MESSAGE_TYPE,
            requestPayload,
          );
        });
        return;
      }

      if (tutor) {
        const requestPayload: StateRequestPayload = {
          participantId: localParticipant.identity,
        };

        sendMessageToParticipant(tutor.identity, STATE_REQUEST_MESSAGE_TYPE, requestPayload);
      }
    };

    // Если комната уже подключена, запрашиваем сразу
    if (room.state === 'connected') {
      const timeoutId = setTimeout(() => {
        requestState();
      }, 2000); // Задержка 2 секунды после подключения

      return () => {
        clearTimeout(timeoutId);
      };
    }

    // Подписываемся на событие изменения состояния подключения
    const handleConnectionStateChanged = (state: string) => {
      if (state === 'connected') {
        setTimeout(() => {
          requestState();
        }, 2000);
      }
    };

    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
    };
  }, [room, isTutor, sendMessageToParticipant, mode]);
};
