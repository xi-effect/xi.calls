import { parseEnv } from './utils';

// Парсеры
const asBoolean = (value: string | null, defaultValue?: boolean): boolean =>
  parseEnv(value, (v) => v === 'true', defaultValue);

// const asNumber = (value: string | null, defaultValue?: number): number =>
//   parseEnv(value, (v) => {
//     const num = Number(v);
//     if (isNaN(num)) throw new Error(`Invalid number: ${v}`);
//     return num;
//   }, defaultValue);

const asString = (value: string | null, defaultValue?: string): string =>
  parseEnv(value, (v) => v, defaultValue);

const env = {
  DEV: import.meta.env.MODE === 'development',

  // Backend API URL
  VITE_SERVER_URL_BACKEND: asString(
    import.meta.env.VITE_SERVER_URL_BACKEND,
    'http://localhost:3000',
  ),

  VITE_NOISE_CANCELLATION_FEATURE_ENABLED: asBoolean(
    import.meta.env.VITE_NOISE_CANCELLATION_FEATURE_ENABLED,
    false,
  ),

  VITE_ALLOW_KRISP_NOISE_CANCELLATION: asBoolean(
    import.meta.env.VITE_ALLOW_KRISP_NOISE_CANCELLATION,
    true,
  ),

  // WebSocket URL (optional, defaults to backend URL)
  VITE_SERVER_URL_SOCKETIO: asString(
    import.meta.env.VITE_SERVER_URL_SOCKETIO,
    import.meta.env.VITE_SERVER_URL_BACKEND || 'http://localhost:3000',
  ),

  // DevTools
  VITE_DEVTOOLS_ENABLED: asBoolean(import.meta.env.VITE_DEVTOOLS_ENABLED, false),

  // Error monitoring (optional)
  VITE_SENTRY_DSN: asString(import.meta.env.VITE_SENTRY_DSN, ''),

  //LiveKit
  VITE_SERVER_URL_LIVEKIT: asString(import.meta.env.VITE_SERVER_URL_LIVEKIT),
  VITE_SERVER_URL_LIVEKIT_DEV: asString(
    import.meta.env.VITE_SERVER_URL_LIVEKIT_DEV,
    'ws://127.0.0.1:7880',
  ),
  VITE_LIVEKIT_DEV_TOKEN: asString(import.meta.env.VITE_LIVEKIT_DEV_TOKEN),
  VITE_LIVEKIT_DEV_MODE: asBoolean(import.meta.env.VITE_LIVEKIT_DEV_MODE, false),

  // Add your own environment variables here
  // VITE_API_KEY: asString(import.meta.env.VITE_API_KEY),
  // VITE_FEATURE_FLAG: asBoolean(import.meta.env.VITE_FEATURE_FLAG, false),
};

const checkEnv = (envKey: keyof typeof env): boolean => {
  if (envKey in env) return true;
  console.error(`%c• ${envKey} isn't defined`, 'color: red');
  return false;
};

export { checkEnv, env };
