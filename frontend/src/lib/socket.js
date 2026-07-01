import { io } from 'socket.io-client';

let socket = null;

/** Dev: set VITE_SOCKET_URL=http://localhost:5050 to bypass Vite proxy if WS fails */
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '/');

export const connectSocket = (token) => {
  if (!token) return null;

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    // Namespaced under /healthcare so it doesn't collide with other apps sharing this domain.
    path: import.meta.env.VITE_SOCKET_PATH || '/healthcare/socket.io',
    auth: { token },
    // Polling first is more reliable through the Vite dev proxy on Windows
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 8000,
    timeout: 15000,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
