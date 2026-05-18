import { ReactNode } from 'react';
import { useModeSync } from './hooks/useModeSync';

type ModeSyncProviderPropsT = {
  children: ReactNode;
};

export const ModeSyncProvider = ({ children }: ModeSyncProviderPropsT) => {
  useModeSync();
  return <>{children}</>;
};
