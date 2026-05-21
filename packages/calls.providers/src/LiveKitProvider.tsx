import { LiveKitRoom } from '@livekit/components-react';
import { useCallStore } from '@xipkg/calls-store';
import { useEffect, useRef } from 'react';
import { Track } from 'livekit-client';
import { useRoom } from './RoomProvider';
import { useCallsNavigation } from './navigation/CallsNavigationProvider';
import { useCallsSession } from './session/CallsSessionProvider';
import { useCallsRuntimeConfig } from './CallsRuntimeConfigProvider';

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
  const reconnectTimeoutRef = useRef<number | null>(null);

  const handleConnect = () => {
    wasConnectedRef.current = true;
    updateStore('connect', true);

    const { activeClassroom } = useCallStore.getState();

    if (activeClassroom && callId && activeClassroom !== callId) {
      updateStore('activeBoardId', undefined);
      updateStore('activeClassroom', undefined);
    }
  };

  const handleDisconnect = () => {
    if (document.hidden && wasConnectedRef.current) {
      console.log('Page hidden - will attempt to reconnect when visible');
      return;
    }

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
  };

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

      console.log('Restoring video subscriptions for all participants...');
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
      console.log('LiveKit: Reconnected successfully');
      restoreVideoSubscriptions();
    };

    const handleConnectionStateChanged = (state: string) => {
      console.log('LiveKit: Connection state changed to:', state);
    };

    const handleConnectionQualityChanged = (quality: string) => {
      if (quality === 'poor') {
        console.warn('LiveKit: Connection quality is poor');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    room.on('reconnecting', handleReconnecting);
    room.on('reconnected', handleReconnected);
    room.on('connectionStateChanged', handleConnectionStateChanged);
    room.on('connectionQualityChanged', handleConnectionQualityChanged);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      room.off('reconnecting', handleReconnecting);
      room.off('reconnected', handleReconnected);
      room.off('connectionStateChanged', handleConnectionStateChanged);
      room.off('connectionQualityChanged', handleConnectionQualityChanged);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isStarted, connect, room, updateStore]);

  if (!token || !room) {
    if (isStarted) console.warn('No token available for LiveKit connection');

    return <>{children}</>;
  }

  return (
    <LiveKitRoom
      room={room}
      token={isDevMode ? devToken : token}
      serverUrl={isDevMode ? serverUrlDev : serverUrl}
      connect={connect}
      onConnected={handleConnect}
      onDisconnected={handleDisconnect}
      audio={audioEnabled || false}
      video={videoEnabled || false}
    >
      {children}
    </LiveKitRoom>
  );
};
