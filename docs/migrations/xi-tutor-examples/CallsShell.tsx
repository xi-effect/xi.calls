/**
 * Эталон для xi.tutor/modules.calls/src/CallsShell.tsx
 */
import { ReactNode, useEffect, useMemo } from 'react';
import { TooltipProvider } from '@xipkg/tooltip';
import {
  CallsNavigationProvider,
  CallsSessionProvider,
  CallsProvider,
  CallsRuntimeConfigProvider,
  useCallsNavigation,
  useCallsRuntimeConfig,
  RoomProvider,
  LiveKitProvider,
} from '@xipkg/calls-providers';
import { ModeSyncProvider } from '@xipkg/calls-hooks';
import { useCallStore, useFeaturesStore } from '@xipkg/calls-store';
import { useTanstackCallsNavigation } from './useTanstackCallsNavigation';
import { callsSessionPort } from './callsSession';
import { useCallsDeps } from './useCallsDeps';
import { createCallsRuntimeConfig } from './createCallsRuntimeConfig';

import '@livekit/components-styles';
import '@xipkg/calls-ui/styles.css';

type CallsShellPropsT = {
  children: ReactNode;
};

const CallsShellInit = () => {
  const navigation = useCallsNavigation();
  const {
    liveKit: { isDevMode, devToken },
  } = useCallsRuntimeConfig();

  useEffect(() => {
    useFeaturesStore.getState().setFeatures({
      chat: true,
      raiseHand: true,
      whiteboard: true,
    });
  }, []);

  useEffect(() => {
    if (!isDevMode || !devToken) return;

    const { updateStore } = useCallStore.getState();
    updateStore('token', devToken);

    const callId = navigation.getCallId();
    if (callId) {
      updateStore('activeClassroom', callId);
    }
  }, [navigation, isDevMode, devToken]);

  return null;
};

export const CallsShell = ({ children }: CallsShellPropsT) => {
  const runtimeConfig = useMemo(() => createCallsRuntimeConfig(), []);
  const deps = useCallsDeps();

  return (
    <CallsRuntimeConfigProvider config={runtimeConfig}>
      <CallsNavigationProvider useNavigation={useTanstackCallsNavigation}>
        <CallsSessionProvider session={callsSessionPort}>
          <CallsProvider deps={deps}>
            <TooltipProvider>
              <RoomProvider>
                <LiveKitProvider>
                  <ModeSyncProvider>
                    <CallsShellInit />
                    {children}
                  </ModeSyncProvider>
                </LiveKitProvider>
              </RoomProvider>
            </TooltipProvider>
          </CallsProvider>
        </CallsSessionProvider>
      </CallsNavigationProvider>
    </CallsRuntimeConfigProvider>
  );
};
