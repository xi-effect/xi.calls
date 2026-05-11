import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { TooltipProvider } from '@xipkg/tooltip';
import { isDevMode, devToken } from 'common.config';
import { CallsProviderDepsT, CallsProvider } from 'calls.providers';
import { useInitUserDevices, useModeSync, useVideoSecurity } from 'calls.hooks';
import { useCallStore, useFeaturesStore, useFocusModeStore } from 'calls.store';
import { PreJoin } from './PreJoin';
import { ActiveRoom } from './Room';
import 'calls.ui/video-security.css';

export const Call = ({ deps }: { deps: CallsProviderDepsT }) => {
  const isStarted = useCallStore((state) => state.isStarted);
  const focusMode = useFocusModeStore((s) => s.focusMode);

  useInitUserDevices();
  useVideoSecurity();

  // Инициализируем хук для синхронизации режима
  // Это автоматически подпишет нас на сообщения о смене режима
  useModeSync();

  const pathname = useLocation().pathname;
  const mode = useCallStore((state) => state.mode);
  const updateStore = useCallStore((state) => state.updateStore);

  //включение отключении фич(чат, поднятие руки...)
  useFeaturesStore.getState().setFeatures({
    chat: true,
    raiseHand: true,
    whiteboard: false,
  });

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
        <div
          className={focusMode ? 'h-full' : 'h-[calc(100dvh-64px)]'}
          style={
            focusMode
              ? ({
                  '--header-height': '0px',
                  '--available-height':
                    'calc(100dvh - 0px - var(--upbar-height) - var(--bottom-bar-height))',
                } as React.CSSProperties)
              : undefined
          }
        >
          <div className="flex h-full w-full flex-col">
            {isStarted ? (
              <div id="videoConferenceContainer" className="bg-gray-0 h-full">
                <ActiveRoom />
              </div>
            ) : (
              <PreJoin />
            )}
          </div>
        </div>
      </TooltipProvider>
    </CallsProvider>
  );
};
