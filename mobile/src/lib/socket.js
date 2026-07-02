import { io } from 'socket.io-client';
import { getToken } from '../storage/session';
import { getSocketPath, getSocketUrl } from './apiConfig';

let socket = null;
let socketUrlUsed = null;

/** Connect (or reconnect) the shared Socket.IO client with the stored JWT. */
export async function connectSocket(explicitToken) {
  const token = explicitToken || (await getToken());
  if (!token) return null;

  const socketUrl = getSocketUrl();
  const socketPath = getSocketPath();
  const socketKey = `${socketUrl}|${socketPath}`;

  if (socket && socketUrlUsed !== socketKey) {
    socket.disconnect();
    socket = null;
  }

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socketUrlUsed = socketKey;
  socket = io(socketUrl, {
    path: getSocketPath(),
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
    timeout: 15000,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketUrlUsed = null;
  }
}
