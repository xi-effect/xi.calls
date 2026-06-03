import { ReactNode, useEffect, useMemo } from 'react';
import { TooltipProvider } from '@xipkg/tooltip';
import { Toaster } from 'sonner';
import {
  CallsNavigationProvider,
  CallsSessionProvider,
  CallsProvider,
  CallsRuntimeConfigProvider,
  useCallsRuntimeConfig,
  RoomProvider,
  LiveKitProvider,
} from '@xipkg/calls-providers';
import { ModeSyncProvider } from '@xipkg/calls-hooks';
import { useCallStore, useFeaturesStore } from '@xipkg/calls-store';
import { useTanstackCallsNavigation } from './useTanstackCallsNavigation';
import { callsSessionPort } from './callsSession';
import { createMockCallsDeps } from './mockCallsDeps';
import { createCallsRuntimeConfigFromEnv } from './createCallsRuntimeConfig';
import { CallsDemoEnvBanner } from './CallsDemoEnvBanner';

import '@livekit/components-styles';
import '@xipkg/calls-ui/styles.css';

type CallsDemoShellPropsT = {
  children: ReactNode;
};

const CallsDemoInit = () => {
  const navigation = useTanstackCallsNavigation();
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
    if (!isDevMode || !devToken) {
      console.warn(
        '[calls demo] Задайте VITE_LIVEKIT_DEV_MODE=true и VITE_LIVEKIT_DEV_TOKEN в .env.local для подключения к LiveKit',
      );
      return;
    }

    const { updateStore } = useCallStore.getState();
    updateStore('token', devToken);

    const callId = navigation.getCallId();
    if (callId) {
      updateStore('activeClassroom', callId);
    }
  }, [navigation, isDevMode, devToken]);

  return null;
};

export const CallsDemoShell = ({ children }: CallsDemoShellPropsT) => {
  const runtimeConfig = useMemo(() => createCallsRuntimeConfigFromEnv(), []);
  const mockDeps = createMockCallsDeps();

  return (
    <CallsRuntimeConfigProvider config={runtimeConfig}>
      <CallsNavigationProvider useNavigation={useTanstackCallsNavigation}>
        <CallsSessionProvider session={callsSessionPort}>
          <CallsProvider deps={mockDeps}>
            <TooltipProvider>
              <RoomProvider>
                <LiveKitProvider>
                  <ModeSyncProvider>
                    <CallsDemoInit />
                    <CallsDemoEnvBanner />
                    {children}
                    <Toaster position="top-center" richColors />
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
