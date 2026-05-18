import { useEffect } from 'react';
import { useCallsNavigation } from 'calls.providers';
import { useInitUserDevices, useVideoSecurity } from 'calls.hooks';
import { useCallStore, useFocusModeStore } from 'calls.store';
import { PreJoin } from './PreJoin';
import { ActiveRoom } from './Room';
import 'calls.ui/video-security.css';

export const Call = () => {
  const isStarted = useCallStore((state) => state.isStarted);
  const focusMode = useFocusModeStore((s) => s.focusMode);
  const { pathname } = useCallsNavigation();

  useInitUserDevices();
  useVideoSecurity();

  const mode = useCallStore((state) => state.mode);
  const updateStore = useCallStore((state) => state.updateStore);

  useEffect(() => {
    const isOnCallPage = /^\/call\/[^/]+$/.test(pathname);

    if (isOnCallPage && mode === 'compact') {
      updateStore('mode', 'full');
    }
  }, [pathname, mode, updateStore]);

  return (
    <div
      className="h-full"
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
          <div id="videoConferenceContainer" className="bg-gray-5 h-full">
            <ActiveRoom />
          </div>
        ) : (
          <PreJoin />
        )}
      </div>
    </div>
  );
};
