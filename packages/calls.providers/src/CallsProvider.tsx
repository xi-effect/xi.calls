import { createContext, FC, useContext } from 'react';
import {
  AuthPortT,
  CallAuthPortT,
  ClassroomPortT,
  UpdateParticipantMetadataPortT,
  ConferenceMetadataPortT,
  CallsAppConfigPortT,
} from './config';

export type CallsProviderDepsT = {
  auth: AuthPortT;
  room: ClassroomPortT;
  callAuth: CallAuthPortT;
  updateParticipantMetadata: UpdateParticipantMetadataPortT;
  conferenceMetadata: ConferenceMetadataPortT;
  appConfig: CallsAppConfigPortT;
};

const CallsContext = createContext<CallsProviderDepsT | null>(null);

export const CallsProvider: FC<{ deps: CallsProviderDepsT; children: React.ReactNode }> = ({
  deps,
  children,
}) => <CallsContext.Provider value={deps}>{children}</CallsContext.Provider>;

export const useCalls = () => {
  const ctx = useContext(CallsContext);
  if (!ctx) throw new Error('CallsProvider is missing');
  return ctx;
};
