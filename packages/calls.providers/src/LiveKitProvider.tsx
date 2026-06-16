import { LiveKitRoom } from '@livekit/components-react';
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
    }
  }, [callId, clearPendingDisconnect, updateStore]);

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
      {children}
    </LiveKitRoom>
  );
};
