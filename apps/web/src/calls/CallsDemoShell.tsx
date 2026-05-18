import { ReactNode, useEffect } from 'react';
import { TooltipProvider } from '@xipkg/tooltip';
import { Toaster } from 'sonner';
import {
  CallsNavigationProvider,
  CallsSessionProvider,
  CallsProvider,
  RoomProvider,
  LiveKitProvider,
} from 'calls.providers';
import { ModeSyncProvider } from 'calls.hooks';
import { useCallStore, useFeaturesStore } from 'calls.store';
import { devToken, isDevMode } from 'common.config';
import { useTanstackCallsNavigation } from './useTanstackCallsNavigation';
import { callsSessionPort } from './callsSession';
import { createMockCallsDeps } from './mockCallsDeps';

import '@livekit/components-styles';
import 'calls.ui/video-security.css';
import 'calls.ui/driver.css';

type CallsDemoShellPropsT = {
  children: ReactNode;
};

const CallsDemoInit = () => {
  const navigation = useTanstackCallsNavigation();

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
  }, [navigation]);

  return null;
};

export const CallsDemoShell = ({ children }: CallsDemoShellPropsT) => {
  const mockDeps = createMockCallsDeps();

  return (
    <CallsNavigationProvider useNavigation={useTanstackCallsNavigation}>
      <CallsSessionProvider session={callsSessionPort}>
        <CallsProvider deps={mockDeps}>
          <TooltipProvider>
            <RoomProvider>
              <LiveKitProvider>
                <ModeSyncProvider>
                  <CallsDemoInit />
                  {children}
                  <Toaster position="top-center" richColors />
                </ModeSyncProvider>
              </LiveKitProvider>
            </RoomProvider>
          </TooltipProvider>
        </CallsProvider>
      </CallsSessionProvider>
    </CallsNavigationProvider>
  );
};
