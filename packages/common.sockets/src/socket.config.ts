import { env } from 'common.env';

/**
 * WebSocket connection settings
 */
export const SOCKET_ENDPOINT = env.VITE_SERVER_URL_SOCKETIO;

export const SOCKET_OPTIONS = {
  reconnectionAttempts: 100,
  reconnectionDelay: 2000,
  // autoConnect: false,
  transports: ['websocket'],
  withCredentials: true,
};
