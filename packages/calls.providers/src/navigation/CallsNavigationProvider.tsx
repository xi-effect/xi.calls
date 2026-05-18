import { createContext, FC, ReactNode, useContext } from 'react';
import { UseCallsNavigationHookT } from '../config/navigation';

const CallsNavigationContext = createContext<UseCallsNavigationHookT | null>(null);

type CallsNavigationProviderPropsT = {
  useNavigation: UseCallsNavigationHookT;
  children: ReactNode;
};

export const CallsNavigationProvider: FC<CallsNavigationProviderPropsT> = ({
  useNavigation,
  children,
}) => (
  <CallsNavigationContext.Provider value={useNavigation}>
    {children}
  </CallsNavigationContext.Provider>
);

export const useCallsNavigation = () => {
  const useNavigation = useContext(CallsNavigationContext);
  if (!useNavigation) {
    throw new Error('CallsNavigationProvider is missing');
  }
  return useNavigation();
};
