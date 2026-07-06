import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { useCallStore } from '@xipkg/calls-store';
import { useCallback, useEffect, useRef } from 'react';
import { DisconnectReason, Track } from 'livekit-client';
import { useRoom } from './RoomProvider';
import { useCallsNavigation } from './navigation/CallsNavigationProvider';
import { useCallsSession } from './session/CallsSessionProvider';
import { useCallsRuntimeConfig } from './CallsRuntimeConfigProvider';

/** Даём SDK время на auto-reconnect после NegotiationError, прежде чем сбрасывать UI */
const DISCONNECT_GRACE_MS = 5_000;

type LiveKitProviderPropsT = {
  children: React.ReactNode;
};

export const LiveKitProvider = ({ children }: LiveKitProviderPropsT) => {
  const { liveKit } = useCallsRuntimeConfig();
  const { serverUrl, serverUrlDev, isDevMode, devToken } = liveKit;
  const { room } = useRoom();
  const navigation = useCallsNavigation();
  const { clearConferenceUiState } = useCallsSession();
  const { audioEnabled, videoEnabled, connect, token, updateStore } = useCallStore();
  const callId = navigation.getCallId();

  const { isStarted } = useCallStore();
  const wasConnectedRef = useRef(false);
  const disconnectGraceTimeoutRef = useRef<number | null>(null);

  const clearPendingDisconnect = useCallback(() => {
    if (disconnectGraceTimeoutRef.current) {
      clearTimeout(disconnectGraceTimeoutRef.current);
      disconnectGraceTimeoutRef.current = null;
    }
  }, []);

  const finalizeDisconnect = useCallback(() => {
    wasConnectedRef.current = false;
    updateStore('connect', false);
    updateStore('isStarted', false);
    updateStore('mode', 'full');

    const { clearAllRaisedHands } = useCallStore.getState();
    clearAllRaisedHands();
    clearConferenceUiState();

    updateStore('activeBoardId', undefined);
    updateStore('activeClassroom', undefined);

    if (navigation.search.call) {
      navigation.clearCallSearchParam();
    }

    console.log('Disconnected from LiveKit room - all interface states cleared');
  }, [clearConferenceUiState, navigation, updateStore]);

  const handleConnect = useCallback(() => {
    clearPendingDisconnect();
    wasConnectedRef.current = true;
    updateStore('connect', true);

    const { activeClassroom } = useCallStore.getState();

    if (activeClassroom && callId && activeClassroom !== callId) {
      updateStore('activeBoardId', undefined);
      updateStore('activeClassroom', undefined);
      // Переход в другой звонок в рамках одного SPA-сеанса (без полного disconnect/reload) —
      // сбрасываем UI-состояние предыдущего звонка (в т.ч. чат), чтобы оно не «утекало» в новый.
      clearConferenceUiState();
    }
  }, [callId, clearConferenceUiState, clearPendingDisconnect, updateStore]);

  const handleDisconnect = useCallback(
    (reason?: DisconnectReason) => {
      if (document.hidden && wasConnectedRef.current) {
        console.log('Page hidden - will attempt to reconnect when visible');
        return;
      }

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

      disconnectGraceTimeoutRef.current = window.setTimeout(() => {
        disconnectGraceTimeoutRef.current = null;

        if (
          room.state === 'connected' ||
          room.state === 'reconnecting' ||
          room.state === 'connecting'
        ) {
          console.log('LiveKit: reconnected during grace period, session preserved');
          return;
        }

        finalizeDisconnect();
      }, DISCONNECT_GRACE_MS);
    },
    [clearPendingDisconnect, finalizeDisconnect, room],
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

    const restoreVideoSubscriptions = () => {
      if (room.state !== 'connected') {
        return;
      }

      let restoredCount = 0;

      room.remoteParticipants.forEach((participant) => {
        participant.videoTrackPublications.forEach((publication) => {
          if (
            (publication.source === Track.Source.Camera ||
              publication.source === Track.Source.ScreenShare) &&
            !publication.isSubscribed &&
            publication.isEnabled
          ) {
            publication.setSubscribed(true);
            restoredCount++;
          }
        });
      });

      if (restoredCount > 0) {
        console.log(`Restored ${restoredCount} video subscriptions`);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && room.state === 'connected') {
        restoreVideoSubscriptions();
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

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      room.off('reconnecting', handleReconnecting);
      room.off('reconnected', handleReconnected);
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
      connectOptions={isDevMode ? { peerConnectionTimeout: 30_000 } : undefined}
      onConnected={handleConnect}
      onDisconnected={handleDisconnect}
      onError={handleError}
      audio={audioEnabled || false}
      video={videoEnabled || false}
    >
      {/*
       * Единственный рендерер удалённого аудио на весь звонок.
       * Раньше он монтировался отдельно в full-режиме (VideoGrid) и в compact-режиме
       * (CompactView), поэтому при переключении между режимами и при входе/выходе из PiP
       * скрытые <audio> элементы пересоздавались, а LiveKit заново строил WebAudio-цепочку
       * (GainNode с ramp) — отсюда был слышен резкий скачок громкости/тембра.
       * LiveKitProvider не размонтируется при смене режимов, поэтому звук остаётся стабильным.
       */}
      <RoomAudioRenderer />
      {children}
    </LiveKitRoom>
  );
};
