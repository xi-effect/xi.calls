export type CallsLiveKitConfigT = {
  serverUrl: string;
  serverUrlDev: string;
  isDevMode: boolean;
  devToken?: string;
};

export type CallsNoiseCancellationConfigT = {
  featureEnabled: boolean;
  allowKrisp: boolean;
};

export type CallsRuntimeConfigT = {
  liveKit: CallsLiveKitConfigT;
  noiseCancellation: CallsNoiseCancellationConfigT;
};

export const defaultCallsRuntimeConfig: CallsRuntimeConfigT = {
  liveKit: {
    serverUrl: '',
    serverUrlDev: 'ws://127.0.0.1:7880',
    isDevMode: false,
  },
  noiseCancellation: {
    featureEnabled: false,
    allowKrisp: true,
  },
};
