import { useCallback } from 'react';
import { useCallStore } from '@xipkg/calls-store';
import { useCallsNavigation, useRoom } from '@xipkg/calls-providers';

const isOnCallPage = (pathname: string) => /^\/call\/[^/]+$/.test(pathname);

/**
 * Навигация «назад в кабинет» / «вернуться в звонок».
 * При активной сессии LiveKit — compact + ?call=; иначе — overview без фоновой сессии.
 */
export function useCallBackNavigation() {
  const navigation = useCallsNavigation();
  const { room } = useRoom();
  const callId = navigation.getCallId();
  const token = useCallStore((state) => state.token);
  const updateStore = useCallStore((state) => state.updateStore);

  const hasActiveCallSession = Boolean(callId && token && room.state === 'connected');

  const leaveToClassroom = useCallback(() => {
    if (!callId) return;

    if (hasActiveCallSession) {
      updateStore('activeClassroom', callId);
      navigation.navigateToClassroomOverview(callId, { backgroundCall: true });
      setTimeout(() => updateStore('mode', 'compact'), 0);
      return;
    }

    updateStore('connect', false);
    updateStore('isStarted', false);
    updateStore('isConnecting', false);
    navigation.navigateToClassroomOverview(callId, { backgroundCall: false });
  }, [callId, hasActiveCallSession, navigation, updateStore]);

  const returnToFullCall = useCallback(() => {
    if (!callId || !token || room.state !== 'connected') return;

    const { isStarted, connect } = useCallStore.getState();

    updateStore('localFullView', true);
    updateStore('mode', 'full');
    updateStore('isConnecting', false);

    if (!isStarted || !connect) {
      updateStore('connect', true);
      updateStore('isStarted', true);
    }

    const alreadyOnThisCallPage =
      isOnCallPage(navigation.pathname) && navigation.params.callId === callId;

    if (!alreadyOnThisCallPage) {
      navigation.navigateToCall(callId, { replace: true });
    }
  }, [callId, token, room.state, navigation, updateStore]);

  return {
    callId,
    hasActiveCallSession,
    isInActiveCall: hasActiveCallSession,
    leaveToClassroom,
    returnToFullCall,
  };
}
