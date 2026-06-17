import { useEffect } from 'react';
import { useCallsNavigation } from '@xipkg/calls-providers';
import { useInitUserDevices, useVideoSecurity } from '@xipkg/calls-hooks';
import { useCallStore, useFocusModeStore } from '@xipkg/calls-store';
import { PreJoin } from './PreJoin';
import { ActiveRoom } from './Room';
import '@xipkg/calls-ui/video-security.css';
import '@xipkg/calls-ui/grid.css';

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
      className={'h-full'}
      style={
        focusMode
          ? ({
              '--header-height': '0px',
              '--available-height': '100%',
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="flex h-full min-h-0 w-full flex-col">
        {isStarted ? (
          <div id="videoConferenceContainer" className="bg-gray-5 flex h-full min-h-0 flex-col">
            <ActiveRoom />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <PreJoin />
          </div>
        )}
      </div>
    </div>
  );
};
