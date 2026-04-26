import { ReactNode, useEffect } from 'react';
// import { useModeSync } from 'calls.hooks';
import { useCallStore } from 'calls.store';
import { useRoom } from './RoomProvider';

type ModeSyncProviderPropsT = {
  children: ReactNode;
};

export const ModeSyncProvider = ({ children }: ModeSyncProviderPropsT) => {
  const { room } = useRoom();
  const connect = useCallStore((state) => state.connect);

  // Инициализируем хук для синхронизации режима
  // Это автоматически подпишет нас на сообщения о смене режима
  //TODO
  //включить этот хук
  // useModeSync();

  useEffect(() => {
    if (room && connect) {
      console.log('🔗 ModeSyncProvider: Room is connected and ready for data channel');
    } else {
      console.log('⏳ ModeSyncProvider: Waiting for room connection...', {
        hasRoom: !!room,
        connect,
      });
    }
  }, [room, connect]);

  return <>{children}</>;
};
