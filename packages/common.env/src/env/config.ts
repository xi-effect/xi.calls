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
  VITE_SERVER_URL_BACKEND: asString(import.meta.env.VITE_SERVER_URL_BACKEND, 'http://localhost:3000'),
  
  // WebSocket URL (optional, defaults to backend URL)
  VITE_SERVER_URL_SOCKETIO: asString(
    import.meta.env.VITE_SERVER_URL_SOCKETIO,
    import.meta.env.VITE_SERVER_URL_BACKEND || 'http://localhost:3000',
  ),
  
  // DevTools
  VITE_DEVTOOLS_ENABLED: asBoolean(import.meta.env.VITE_DEVTOOLS_ENABLED, false),
  
  // Error monitoring (optional)
  VITE_SENTRY_DSN: asString(import.meta.env.VITE_SENTRY_DSN, ''),
  
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
