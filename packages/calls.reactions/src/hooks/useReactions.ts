import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveKitDataChannel, useLiveKitDataChannelListener } from '@xipkg/calls-hooks';
import { useRoom } from '@xipkg/calls-providers';
import { useReactionsStore } from '@xipkg/calls-store';
import {
  REACTION_MESSAGE_TYPE,
  REACTION_SEND_COOLDOWN_MS,
  REACTION_RATE_LIMIT_WINDOW_MS,
  REACTION_RATE_LIMIT_MAX_IN_WINDOW,
  REACTION_RECEIVE_MIN_INTERVAL_MS,
  REACTION_BURST_COUNT,
  REACTION_BURST_STAGGER_MS,
} from '../constants';

type ReactionPayloadT = {
  id: string;
  emoji: string;
  senderId: string;
  senderName: string;
  timestamp: number;
};

const isReactionPayload = (value: unknown): value is ReactionPayloadT => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<ReactionPayloadT>;
  return (
    typeof payload.id === 'string' &&
    typeof payload.emoji === 'string' &&
    typeof payload.senderId === 'string' &&
    typeof payload.timestamp === 'number'
  );
};

export const useReactions = () => {
  const { sendMessage } = useLiveKitDataChannel();
  const { room } = useRoom();
  const { addFloatingReactions, setParticipantReaction } = useReactionsStore();

  // Собственный анти-спам отправителя: cooldown между кликами + скользящее окно.
  const lastSentAtRef = useRef(0);
  const sentTimestampsRef = useRef<number[]>([]);
  // Анти-спам получателя: не доверяем чужому клиенту, режем по интервалу на отправителя.
  const lastAcceptedAtBySenderRef = useRef<Record<string, number>>({});

  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    },
    [],
  );

  // Получаем информацию о текущем участнике из LiveKit (аналогично useChat.getCurrentParticipantInfo)
  const getCurrentParticipantInfo = useCallback(() => {
    if (!room?.localParticipant) {
      return { senderId: 'unknown', senderName: 'Unknown User' };
    }

    const participant = room.localParticipant;

    try {
      const metadata = participant.metadata;
      if (metadata) {
        const userInfo = JSON.parse(metadata);
        return {
          senderId: userInfo?.user_id || userInfo?.id || participant.identity,
          senderName:
            userInfo?.display_name ||
            userInfo?.name ||
            userInfo?.username ||
            participant.name ||
            participant.identity,
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse participant metadata:', error);
    }

    return {
      senderId: participant.identity,
      senderName: participant.name || participant.identity,
    };
  }, [room]);

  const canSendNow = useCallback(() => {
    const now = Date.now();

    if (now - lastSentAtRef.current < REACTION_SEND_COOLDOWN_MS) {
      return false;
    }

    const windowStart = now - REACTION_RATE_LIMIT_WINDOW_MS;
    const recent = sentTimestampsRef.current.filter((ts) => ts > windowStart);
    sentTimestampsRef.current = recent;

    return recent.length < REACTION_RATE_LIMIT_MAX_IN_WINDOW;
  }, []);

  /** Одна сетевая реакция → несколько локальных пузырьков одним апдейтом стора */
  const spawnFloatingBurst = useCallback(
    (payload: ReactionPayloadT) => {
      const burst = Array.from({ length: REACTION_BURST_COUNT }, (_, i) => ({
        ...payload,
        id: `${payload.id}-${i}`,
        timestamp: payload.timestamp + i * REACTION_BURST_STAGGER_MS,
      }));
      addFloatingReactions(burst);
    },
    [addFloatingReactions],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!canSendNow()) {
        return false;
      }

      const now = Date.now();
      lastSentAtRef.current = now;
      sentTimestampsRef.current = [...sentTimestampsRef.current, now];

      const { senderId, senderName } = getCurrentParticipantInfo();
      const payload: ReactionPayloadT = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        emoji,
        senderId,
        senderName,
        timestamp: now,
      };

      // Оптимистично показываем пачку себе сразу, не дожидаясь round-trip через DataChannel
      spawnFloatingBurst(payload);
      setParticipantReaction(senderId, emoji, now);
      sendMessage(REACTION_MESSAGE_TYPE, payload);

      setIsOnCooldown(true);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = setTimeout(
        () => setIsOnCooldown(false),
        REACTION_SEND_COOLDOWN_MS,
      );

      return true;
    },
    [
      canSendNow,
      getCurrentParticipantInfo,
      spawnFloatingBurst,
      setParticipantReaction,
      sendMessage,
    ],
  );

  const handleIncomingMessage = useCallback(
    (message: { type: string; payload: unknown }) => {
      if (message.type !== REACTION_MESSAGE_TYPE || !isReactionPayload(message.payload)) {
        return;
      }

      const payload = message.payload;

      // Свои реакции уже добавлены оптимистично в sendReaction — игнорируем эхо
      const { senderId: ownId } = getCurrentParticipantInfo();
      if (payload.senderId === ownId) return;

      const now = Date.now();
      const lastAccepted = lastAcceptedAtBySenderRef.current[payload.senderId] ?? 0;

      // Rate-limit по отправителю на приёмной стороне: защищает от недобросовестного/
      // багнутого клиента, который транслирует данные напрямую через DataChannel,
      // минуя собственный cooldown.
      if (now - lastAccepted < REACTION_RECEIVE_MIN_INTERVAL_MS) {
        return;
      }
      lastAcceptedAtBySenderRef.current[payload.senderId] = now;

      spawnFloatingBurst(payload);
      setParticipantReaction(payload.senderId, payload.emoji, payload.timestamp);
    },
    [getCurrentParticipantInfo, spawnFloatingBurst, setParticipantReaction],
  );

  useLiveKitDataChannelListener(handleIncomingMessage);

  return {
    sendReaction,
    isOnCooldown,
  };
};
