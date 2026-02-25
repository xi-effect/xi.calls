import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { TooltipProvider } from '@xipkg/tooltip';
import { isDevMode, devToken } from 'common.config';
import { CallsProviderDepsT, CallsProvider } from 'calls.providers';
import { useInitUserDevices, useVideoSecurity } from 'calls.hooks';
import { useCallStore } from 'calls.store';
import { PreJoin } from './PreJoin';
import { ActiveRoom } from './Room';
import 'common.ui/video-security.css';

export const Call = ({ deps }: { deps: CallsProviderDepsT }) => {
  const isStarted = useCallStore((state) => state.isStarted);

  useInitUserDevices();
  useVideoSecurity();

  const pathname = useLocation().pathname;
  const mode = useCallStore((state) => state.mode);
  const updateStore = useCallStore((state) => state.updateStore);

  useEffect(() => {
    // Проверяем, что мы находимся на странице /call/<callId> (точное совпадение)
    const isOnCallPage = /^\/call\/[^/]+$/.test(pathname);

    // Если мы на странице звонка и режим compact, переключаем на full
    if (isOnCallPage && mode === 'compact') {
      updateStore('mode', 'full');
    }
  }, [pathname, mode, updateStore]);

  useEffect(() => {
    if (isDevMode) {
      updateStore('token', devToken);
    }
  }, [updateStore]);

  return (
    <CallsProvider deps={deps}>
      <TooltipProvider>
        <div className="h-[calc(100vh-64px)]">
          <div className="flex h-full w-full flex-col">
            {isStarted ? <ActiveRoom /> : <PreJoin />}
          </div>
        </div>
      </TooltipProvider>
    </CallsProvider>
  );
};
