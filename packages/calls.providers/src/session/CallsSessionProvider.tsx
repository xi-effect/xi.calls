import { createContext, FC, ReactNode, useContext } from 'react';
import { CallsSessionPortT } from '../config/session';

const CallsSessionContext = createContext<CallsSessionPortT | null>(null);

type CallsSessionProviderPropsT = {
  session: CallsSessionPortT;
  children: ReactNode;
};

export const CallsSessionProvider: FC<CallsSessionProviderPropsT> = ({ session, children }) => (
  <CallsSessionContext.Provider value={session}>{children}</CallsSessionContext.Provider>
);

export const useCallsSession = () => {
  const session = useContext(CallsSessionContext);
  if (!session) {
    throw new Error('CallsSessionProvider is missing');
  }
  return session;
};
