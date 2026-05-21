import { createContext, FC, useContext } from 'react';
import { CallsRuntimeConfigT, defaultCallsRuntimeConfig } from './config/runtimeConfig';

const CallsRuntimeConfigContext = createContext<CallsRuntimeConfigT | null>(null);

export const CallsRuntimeConfigProvider: FC<{
  config: CallsRuntimeConfigT;
  children: React.ReactNode;
}> = ({ config, children }) => (
  <CallsRuntimeConfigContext.Provider value={config}>{children}</CallsRuntimeConfigContext.Provider>
);

export const useCallsRuntimeConfig = (): CallsRuntimeConfigT => {
  const ctx = useContext(CallsRuntimeConfigContext);
  if (!ctx) {
    throw new Error('CallsRuntimeConfigProvider is missing');
  }
  return ctx;
};

export { defaultCallsRuntimeConfig };
