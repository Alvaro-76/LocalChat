import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

let socket = null;
let pingCallback = null;
let pingInterval = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io(SERVER_URL);

  socket.on('pong:measure', (data) => {
    const latency = Date.now() - data.time;
    if (pingCallback) pingCallback(latency);
  });

  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit('ping:measure');
    }
  }, 5000);

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onPing(callback) {
  pingCallback = callback;
}
