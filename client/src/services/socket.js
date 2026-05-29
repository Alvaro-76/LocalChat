import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io(SERVER_URL);
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
