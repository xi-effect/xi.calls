import { useEffect, useCallback } from 'react';
import { RoomEvent, RemoteParticipant } from 'livekit-client';
import { useRoom } from 'calls.providers';

type DataMessage = {
  type: string;
  payload: unknown;
  timestamp: number;
};

type UseLiveKitDataChannelReturn = {
  sendMessage: (type: string, payload: unknown) => void;
  sendMessageToParticipant: (participantId: string, type: string, payload: unknown) => void;
};

export const useLiveKitDataChannel = (): UseLiveKitDataChannelReturn => {
  const { room } = useRoom();

  const sendMessage = useCallback(
    (type: string, payload: unknown) => {
      if (!room) {
        console.warn('⚠️ Room is not available for sending data message');
        return;
      }

      // Проверяем, что комната подключена
      if (room.state !== 'connected') {
        console.warn(
          '⚠️ Room is not connected, cannot send data message. Current state:',
          room.state,
        );
        return;
      }

      // Проверяем, что localParticipant существует
      if (!room.localParticipant) {
        console.warn('⚠️ Local participant is not available');
        return;
      }

      const message: DataMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };

      try {
        // Валидируем данные перед отправкой
        const messageString = JSON.stringify(message);
        if (messageString.length > 16384) {
          // LiveKit ограничение на размер сообщения
          console.error('❌ Data message too large:', messageString.length, 'bytes');
          return;
        }

        console.log('📤 Sending data message:', message);
        room.localParticipant.publishData(new TextEncoder().encode(messageString), {
          reliable: true,
        });
        console.log('✅ Data message sent successfully');
      } catch (error) {
        console.error('❌ Failed to send data message:', error);
        // Не выбрасываем ошибку, чтобы не нарушить соединение
      }
    },
    [room],
  );

  const sendMessageToParticipant = useCallback(
    (participantId: string, type: string, payload: unknown) => {
      if (!room) {
        console.warn('⚠️ Room is not available for sending data message');
        return;
      }

      // Проверяем, что комната подключена
      if (room.state !== 'connected') {
        console.warn(
          '⚠️ Room is not connected, cannot send data message. Current state:',
          room.state,
        );
        return;
      }

      // Проверяем, что localParticipant существует
      if (!room.localParticipant) {
        console.warn('⚠️ Local participant is not available');
        return;
      }

      // Валидируем participantId
      if (!participantId || typeof participantId !== 'string') {
        console.error('❌ Invalid participant ID:', participantId);
        return;
      }

      const message: DataMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };

      try {
        // Валидируем данные перед отправкой
        const messageString = JSON.stringify(message);
        if (messageString.length > 16384) {
          // LiveKit ограничение на размер сообщения
          console.error('❌ Data message too large:', messageString.length, 'bytes');
          return;
        }

        console.log('📤 Sending data message to participant:', participantId, message);
        room.localParticipant.publishData(new TextEncoder().encode(messageString), {
          reliable: true,
          destinationIdentities: [participantId],
        });
        console.log('✅ Data message sent to participant successfully');
      } catch (error) {
        console.error('❌ Failed to send data message to participant:', error);
        // Не выбрасываем ошибку, чтобы не нарушить соединение
      }
    },
    [room],
  );

  return {
    sendMessage,
    sendMessageToParticipant,
  };
};

export const useLiveKitDataChannelListener = (
  onMessage: (message: DataMessage, participant?: RemoteParticipant) => void,
) => {
  const { room } = useRoom();

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        // Проверяем размер payload
        if (payload.length === 0) {
          console.warn('⚠️ Received empty data message');
          return;
        }

        if (payload.length > 16384) {
          console.error('❌ Received data message too large:', payload.length, 'bytes');
          return;
        }

        // Декодируем данные
        const messageString = new TextDecoder().decode(payload);

        // Валидируем JSON
        let message: DataMessage;
        try {
          message = JSON.parse(messageString);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON from data message:', parseError);
          return;
        }

        // Валидируем структуру сообщения
        if (!message || typeof message !== 'object') {
          console.error('❌ Invalid message structure:', message);
          return;
        }

        if (!message.type || typeof message.type !== 'string') {
          console.error('❌ Invalid message type:', message.type);
          return;
        }

        if (typeof message.timestamp !== 'number') {
          console.error('❌ Invalid message timestamp:', message.timestamp);
          return;
        }

        console.log('📥 Data message received:', message, 'from:', participant?.identity);
        onMessage(message, participant);
      } catch (error) {
        console.error('❌ Failed to process data message:', error);
        // Не выбрасываем ошибку, чтобы не нарушить соединение
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, onMessage]);
};
