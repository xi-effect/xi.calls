import { createContext, FC, useContext } from 'react';
import { AuthPortT, CallAuthPortT, ClassroomPortT } from '../config/ports';

export type CallsDepsT = {
  auth: AuthPortT;
  room: ClassroomPortT;
  callAuth: CallAuthPortT;
};

const CallsContext = createContext<CallsDepsT | null>(null);

export const CallsProvider: FC<{ deps: CallsDepsT; children: React.ReactNode }> = ({
  deps,
  children,
}) => <CallsContext.Provider value={deps}>{children}</CallsContext.Provider>;

export const useCalls = () => {
  const ctx = useContext(CallsContext);
  if (!ctx) throw new Error('CallsProvider is missing');
  return ctx;
};
