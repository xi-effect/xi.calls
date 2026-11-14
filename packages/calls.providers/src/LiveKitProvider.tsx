import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { useCallStore, useUserChoicesStore } from '@xipkg/calls-store';
import { getBaselineAudioCaptureOptions } from '@xipkg/calls-config';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DisconnectReason,
  Track,
  VideoPresets,
  type RemoteTrackPublication,
  type RoomConnectOptions,
} from 'livekit-client';
import { useRoom } from './RoomProvider';
import { KeepVideosPlaying } from './KeepVideosPlaying';
import { useCallsNavigation } from './navigation/CallsNavigationProvider';
import { useCallsSession } from './session/CallsSessionProvider';
import { useCallsRuntimeConfig } from './CallsRuntimeConfigProvider';

/** Даём SDK время на auto-reconnect после NegotiationError, прежде чем сбрасывать UI */
const DISCONNECT_GRACE_MS = 5_000;
/** В скрытой вкладке таймеры и сеть троттлятся, поэтому ждём переподключение дольше */
const HIDDEN_DISCONNECT_GRACE_MS = 20_000;
/**
 * Дефолт SDK — 15с. Под нагрузкой рукопожатие с LiveKit длится дольше, клиент
 * закрывает сокет сам, и браузер пишет «WebSocket is closed before the connection
 * is established». 30с дают сигналу дойти, не обрывая попытку, которая вот-вот
 * завершится.
 */
const SIGNAL_WEBSOCKET_TIMEOUT_MS = 30_000;
/** То же окно на ICE после сигнала. Раньше 30с стояло только в dev. */
const PEER_CONNECTION_TIMEOUT_MS = 30_000;
/**
 * Не открываем следующий сокет в том же тике, в котором SDK абортит предыдущий:
 * второй `room.connect` закрывает ещё не открытый WebSocket.
 */
const RECONNECT_BACKOFF_MS = 2_000;
/**
 * Сколько раз сами зовём `room.connect`, после того как попытка SDK уже упала.
 * Первый вход идёт через `LiveKitRoom` и в этот счётчик не входит.
 */
const MAX_MANUAL_RECONNECTS = 2;

type LiveKitProviderPropsT = {
  children: React.ReactNode;
};

export const LiveKitProvider = ({ children }: LiveKitProviderPropsT) => {
  const { liveKit } = useCallsRuntimeConfig();
  const { serverUrl, serverUrlDev, isDevMode, devToken } = liveKit;
  const { room } = useRoom();
  const navigation = useCallsNavigation();
  const { clearConferenceUiState } = useCallsSession();
  const { audioEnabled, audioDeviceId, videoEnabled, videoDeviceId, connect, token, updateStore } =
    useCallStore();
  const callId = navigation.getCallId();
  const speakerVolume = useUserChoicesStore((s) => s.speakerVolume ?? 1);
  const audioOutputDeviceId = useUserChoicesStore((s) => s.audioOutputDeviceId);
  const audioCaptureOptions = useMemo(
    () => ({
      ...getBaselineAudioCaptureOptions(),
      deviceId: audioDeviceId || undefined,
    }),
    [audioDeviceId],
  );
  // Та же камера, что в превью. Без deviceId LiveKit берёт системную по
  // умолчанию: в лобби картинка есть, а публикация в звонке падает.
  // Разрешение обязано совпасть с videoCaptureDefaults: объект в пропе video
  // подменяет дефолты комнаты целиком, и без 540p группа снова упирается в канал.
  const videoCaptureOptions = useMemo(
    () => ({
      resolution: VideoPresets.h540.resolution,
      deviceId: videoDeviceId || undefined,
    }),
    [videoDeviceId],
  );

  const { isStarted } = useCallStore();
  const disconnectGraceTimeoutRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectInFlightRef = useRef<Promise<boolean> | null>(null);
  const manualReconnectsRef = useRef(0);

  const liveKitConnectOptions = useMemo<RoomConnectOptions>(
    () => ({
      websocketTimeout: SIGNAL_WEBSOCKET_TIMEOUT_MS,
      peerConnectionTimeout: PEER_CONNECTION_TIMEOUT_MS,
    }),
    [],
  );

  // Повторное включение камеры кнопкой идёт через room.options, а не через проп
  // LiveKitRoom: useTrackToggle вызывает setCameraEnabled без своих options.
  useEffect(() => {
    room.options.videoCaptureDefaults = {
      ...room.options.videoCaptureDefaults,
      resolution: room.options.videoCaptureDefaults?.resolution ?? VideoPresets.h540.resolution,
      deviceId: videoDeviceId || undefined,
    };
  }, [room, videoDeviceId]);

  // Устройство вывода — прямо здесь, чтобы не плодить цикл calls.providers ↔ calls.hooks
  useEffect(() => {
    if (!audioOutputDeviceId) return;

    let cancelled = false;
    const apply = async () => {
      try {
        await room.switchActiveDevice('audiooutput', audioOutputDeviceId);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to switch audio output device:', error);
        }
      }
    };
    void apply();
    return () => {
      cancelled = true;
    };
  }, [room, audioOutputDeviceId]);

  const clearPendingReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearPendingDisconnect = useCallback(() => {
    if (disconnectGraceTimeoutRef.current) {
      clearTimeout(disconnectGraceTimeoutRef.current);
      disconnectGraceTimeoutRef.current = null;
    }
    clearPendingReconnect();
  }, [clearPendingReconnect]);

  const finalizeDisconnect = useCallback(() => {
    manualReconnectsRef.current = 0;
    updateStore('connect', false);
    updateStore('isStarted', false);
    updateStore('mode', 'full');

    const { clearAllRaisedHands } = useCallStore.getState();
    clearAllRaisedHands();
    clearConferenceUiState();

    updateStore('activeBoardId', undefined);
    updateStore('activeMaterialKind', undefined);
    updateStore('activeClassroom', undefined);

    if (navigation.search.call) {
      navigation.clearCallSearchParam();
    }

    console.log('Disconnected from LiveKit room - all interface states cleared');
  }, [clearConferenceUiState, navigation, updateStore]);

  const handleConnect = useCallback(() => {
    clearPendingDisconnect();
    manualReconnectsRef.current = 0;
    updateStore('connect', true);

    const { activeClassroom } = useCallStore.getState();

    if (activeClassroom && callId && activeClassroom !== callId) {
      updateStore('activeBoardId', undefined);
      updateStore('activeMaterialKind', undefined);
      updateStore('activeClassroom', undefined);
      // Переход в другой звонок в рамках одного SPA-сеанса (без полного disconnect/reload) —
      // сбрасываем UI-состояние предыдущего звонка (в т.ч. чат), чтобы оно не «утекало» в новый.
      clearConferenceUiState();
    }
  }, [callId, clearConferenceUiState, clearPendingDisconnect, updateStore]);

  /**
   * `LiveKitRoom` вызывает `room.connect` только при смене своих пропсов, поэтому
   * после неожиданного разрыва сессия сама не восстанавливается: комната остаётся
   * disconnected, а `connect` в сторе — true. Раньше при скрытой вкладке мы вообще
   * выходили из обработчика, и ученик продолжал видеть интерфейс звонка, из которого
   * его уже выкинуло. Переподключаемся руками и сносим UI, если не получилось.
   *
   * Один полёт: повторный вызов ждёт уже идущий `room.connect`. Второй параллельный
   * connect абортит сигнальный сокет, который ещё в рукопожатии.
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectInFlightRef.current) return reconnectInFlightRef.current;

    const run = (async (): Promise<boolean> => {
      const url = isDevMode ? serverUrlDev : serverUrl;
      const activeToken = (isDevMode ? devToken : token) ?? '';

      if (!url || !activeToken) return false;
      if (!useCallStore.getState().connect) return false;
      // connecting / reconnecting — это уже попытка SDK. Новый connect её оборвёт.
      if (room.state !== 'disconnected') return true;
      if (manualReconnectsRef.current >= MAX_MANUAL_RECONNECTS) {
        console.warn('LiveKit: manual reconnect budget exhausted');
        return false;
      }

      manualReconnectsRef.current += 1;

      try {
        await room.connect(url, activeToken, liveKitConnectOptions);
        manualReconnectsRef.current = 0;
        console.log('LiveKit: manual reconnect succeeded');
        return true;
      } catch (error) {
        console.warn('LiveKit: manual reconnect failed', error);
        return false;
      }
    })();

    reconnectInFlightRef.current = run;
    void run.finally(() => {
      if (reconnectInFlightRef.current === run) {
        reconnectInFlightRef.current = null;
      }
    });

    return run;
  }, [devToken, isDevMode, liveKitConnectOptions, room, serverUrl, serverUrlDev, token]);

  const scheduleReconnect = useCallback(
    (options?: { ignoreBudget?: boolean }) => {
      // Не смотрим на in-flight: `Disconnected` приходит синхронно из ещё не
      // завершившегося `room.connect`. Если ждать его, следующая попытка не
      // планируется. Сам `attemptReconnect` не откроет второй сокет, пока
      // комната не `disconnected`.
      if (reconnectTimerRef.current !== null) return;

      if (options?.ignoreBudget) {
        manualReconnectsRef.current = 0;
      }
      if (manualReconnectsRef.current >= MAX_MANUAL_RECONNECTS) {
        console.warn('LiveKit: manual reconnect budget exhausted');
        return;
      }

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        void attemptReconnect();
      }, RECONNECT_BACKOFF_MS);
    },
    [attemptReconnect],
  );

  // Эффект подписок живёт всё время звонка. Если держать `scheduleReconnect`
  // в его зависимостях, новая ссылка на колбэк (сменился token) снимет
  // уже запланированный повтор в cleanup.
  const scheduleReconnectRef = useRef(scheduleReconnect);
  scheduleReconnectRef.current = scheduleReconnect;

  const handleDisconnect = useCallback(
    (reason?: DisconnectReason) => {
      if (
        room.state === 'reconnecting' ||
        room.state === 'connecting' ||
        room.state === 'connected'
      ) {
        console.log('LiveKit: disconnect ignored, room is recovering:', room.state, reason);
        return;
      }

      clearPendingDisconnect();

      // Пользователь сам нажал «завершить звонок» — `DisconnectButton` синхронно
      // выставляет `connect=false` ещё до того, как реально придёт событие
      // отключения комнаты (см. `packages/calls.ui/src/ui/Bottom/DisconnectButton.tsx`).
      // Реконнект в этом случае SDK не предпринимает, поэтому ждать grace-период
      // незачем — раньше это давало заметный лаг: интерфейс (в т.ч. CompactCall)
      // не скрывался и URL не менялся, пока не истекали все 5 секунд таймера.
      const isIntentionalDisconnect =
        !useCallStore.getState().connect || reason === DisconnectReason.CLIENT_INITIATED;

      if (isIntentionalDisconnect) {
        console.log('LiveKit: intentional disconnect, tearing down UI immediately', { reason });
        finalizeDisconnect();
        return;
      }

      console.warn('LiveKit: disconnected, scheduling UI teardown', { reason, state: room.state });

      scheduleReconnect();

      const graceMs = document.hidden ? HIDDEN_DISCONNECT_GRACE_MS : DISCONNECT_GRACE_MS;

      disconnectGraceTimeoutRef.current = window.setTimeout(() => {
        disconnectGraceTimeoutRef.current = null;

        // Повтор ещё в очереди (backoff) или уже в `room.connect`. Снимать UI
        // рано: следующая неудача сама поставит новый grace.
        if (
          reconnectTimerRef.current !== null ||
          reconnectInFlightRef.current ||
          room.state === 'connected' ||
          room.state === 'reconnecting' ||
          room.state === 'connecting'
        ) {
          console.log('LiveKit: reconnected during grace period, session preserved');
          return;
        }

        finalizeDisconnect();
      }, graceMs);
    },
    [scheduleReconnect, clearPendingDisconnect, finalizeDisconnect, room],
  );

  const handleError = useCallback((error: Error) => {
    if (error.name === 'NegotiationError' || error.message.includes('negotiation timed out')) {
      console.warn('LiveKit: negotiation error, SDK will retry:', error);
      return;
    }
    console.error('LiveKit room error:', error);
  }, []);

  useEffect(() => {
    if (!token && callId && navigation.pathnameIncludes('/call/')) {
      navigation.navigateToClassroom(callId);
    }
  }, [navigation.pathname, token, callId, navigation]);

  useEffect(() => {
    if (!isStarted || !connect) {
      return;
    }

    // Каждый setSubscribed запускает renegotiation на subscriber-соединении.
    // Публикация с выключенной камерой в подписке не нуждается, а попытка её
    // подписать никогда не приводит к isSubscribed=true — то есть любая повторная
    // логика вокруг неё превращается в бесконечный цикл renegotiation и
    // NegotiationError: negotiation timed out, из которого комнату выбрасывает.
    const isSubscribableVideo = (publication: RemoteTrackPublication) =>
      publication.kind === Track.Kind.Video &&
      (publication.source === Track.Source.Camera ||
        publication.source === Track.Source.ScreenShare) &&
      publication.isEnabled;

    const restoreVideoSubscriptions = () => {
      if (room.state !== 'connected') {
        return;
      }

      let restoredCount = 0;

      room.remoteParticipants.forEach((participant) => {
        participant.videoTrackPublications.forEach((publication) => {
          if (isSubscribableVideo(publication) && !publication.isSubscribed) {
            publication.setSubscribed(true);
            restoredCount++;
          }
        });
      });

      if (restoredCount > 0) {
        console.log(`Restored ${restoredCount} video subscriptions`);
      }
    };

    // На самохостящемся сервере renegotiation при подписке иногда падает по
    // таймауту (см. комментарий про dynacast/NegotiationError в RoomProvider).
    // Если это происходит в момент публикации трека, publication.isSubscribed
    // так и остаётся false навсегда — раньше ресабскрайб случался только по
    // reconnect/visibilitychange, поэтому демонстрация экрана, включённая
    // посреди уже активного звонка, могла у собеседника не появиться никогда.
    // Подстраховываемся повторными попытками подписки после каждой публикации.
    const RETRY_DELAY_MS = 2500;
    const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();
    const retriedTrackSids = new Set<string>();

    const scheduleTimeout = (fn: () => void, delay: number) => {
      const timeoutId = setTimeout(() => {
        pendingTimeouts.delete(timeoutId);
        fn();
      }, delay);
      pendingTimeouts.add(timeoutId);
      return timeoutId;
    };

    // Ровно одна повторная попытка на трек за сессию: если и она не помогла,
    // проблема не в потерянном setSubscribed, и дальнейшие вызовы только копят
    // renegotiation на живом соединении.
    const scheduleSubscriptionRetry = (publication: RemoteTrackPublication) => {
      if (retriedTrackSids.has(publication.trackSid)) return;
      retriedTrackSids.add(publication.trackSid);

      scheduleTimeout(() => {
        if (room.state !== 'connected') return;
        if (!isSubscribableVideo(publication) || publication.isSubscribed) return;

        console.warn(
          `LiveKit: track ${publication.trackSid} (${publication.source}) is still not subscribed after publish, retrying subscribe once`,
        );
        publication.setSubscribed(true);
      }, RETRY_DELAY_MS);
    };

    const handleTrackPublished = (publication: RemoteTrackPublication) => {
      if (!isSubscribableVideo(publication)) {
        return;
      }

      scheduleSubscriptionRetry(publication);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) return;

      if (room.state === 'connected') {
        restoreVideoSubscriptions();
        return;
      }

      if (room.state === 'disconnected' && useCallStore.getState().connect) {
        // Возврат на вкладку — новая попытка, даже если бюджет фоновых ретраев
        // уже кончился, пока вкладка была скрыта.
        scheduleReconnectRef.current({ ignoreBudget: true });
      }
    };

    const handleReconnecting = () => {
      console.log('LiveKit: Reconnecting...');
    };

    const handleReconnected = () => {
      clearPendingDisconnect();
      console.log('LiveKit: Reconnected successfully');
      restoreVideoSubscriptions();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    room.on('reconnecting', handleReconnecting);
    room.on('reconnected', handleReconnected);
    room.on('trackPublished', handleTrackPublished);

    // Не вызываем restore сразу: на локальном LiveKit 1.8.x лишний setSubscribed
    // в момент publish даёт NegotiationError: negotiation timed out и цикл reconnect.
    // CompactCall сам доподписывает видимые треки, когда комната уже connected.
    scheduleTimeout(restoreVideoSubscriptions, 3000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      room.off('reconnecting', handleReconnecting);
      room.off('reconnected', handleReconnected);
      room.off('trackPublished', handleTrackPublished);
      pendingTimeouts.forEach(clearTimeout);
      pendingTimeouts.clear();
      retriedTrackSids.clear();
      clearPendingDisconnect();
    };
  }, [isStarted, connect, room, clearPendingDisconnect]);

  const lkToken = (isDevMode ? devToken : token) ?? '';
  const canConnect = Boolean(lkToken) && Boolean(connect);

  if (!lkToken && isStarted) {
    console.warn('No token available for LiveKit connection');
  }

  return (
    <LiveKitRoom
      room={room}
      token={lkToken}
      serverUrl={isDevMode ? serverUrlDev : serverUrl}
      connect={canConnect}
      connectOptions={liveKitConnectOptions}
      onConnected={handleConnect}
      onDisconnected={handleDisconnect}
      onError={handleError}
      audio={audioEnabled ? audioCaptureOptions : false}
      video={videoEnabled ? videoCaptureOptions : false}
    >
      {/*
       * Единственный рендерер удалённого аудио на весь звонок.
       * Раньше он монтировался отдельно в full-режиме (VideoGrid) и в compact-режиме
       * (CompactView), поэтому при переключении между режимами и при входе/выходе из PiP
       * скрытые <audio> элементы пересоздавались, а LiveKit заново строил WebAudio-цепочку
       * (GainNode с ramp) — отсюда был слышен резкий скачок громкости/тембра.
       * LiveKitProvider не размонтируется при смене режимов, поэтому звук остаётся стабильным.
       */}
      <RoomAudioRenderer volume={speakerVolume} />
      <KeepVideosPlaying />
      {children}
    </LiveKitRoom>
  );
};
