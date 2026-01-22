import { useEffect } from 'react';
import { ActiveRoom } from './Room/ActiveRoom';
import { PreJoin } from './PreJoin';
import { useCallStore } from '../store/callStore';
import { useInitUserDevices, useVideoSecurity } from '../hooks';
import { useLocation } from '@tanstack/react-router';
import './shared/VideoTrack/video-security.css';
import { CallsDeps, CallsProvider } from '../providers/CallsProvider';

export const Call = ({ deps }: { deps: CallsDeps }) => {
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

  return (
    <CallsProvider deps={deps}>
      <div className="h-[calc(100vh-64px)]">
        <div className="flex h-full w-full flex-col">
          {isStarted ? <ActiveRoom /> : <PreJoin />}
        </div>
      </div>
    </CallsProvider>
  );
};
