// src/services/socket.js
import { io } from "socket.io-client";

// Pass auth.userId if you have it at init time; otherwise call register() after login.
export const makeSocket = (serverUrl, userId) => {
  const forcePolling = (import.meta.env.VITE_SOCKET_FORCE_POLLING || '').toString().toLowerCase() === 'true';
  const transports = forcePolling ? ["polling"] : ["websocket", "polling"]; // allow fallback unless forced
  const socket = io(serverUrl, {
    withCredentials: true,
    auth: userId ? { userId } : undefined,
    transports,
    // be lenient with timeouts for cold starts and proxies
    timeout: 20000,
    reconnectionDelayMax: 10000,
  });

  // minimal debug hooks in dev
  if (import.meta.env.DEV) {
    socket.on('connect_error', (e) => console.warn('[socket] connect_error', e?.message));
    socket.on('reconnect_attempt', (n) => console.info('[socket] reconnect_attempt', n));
    socket.on('reconnect_error', (e) => console.warn('[socket] reconnect_error', e?.message));
  }

  const register = (id) => socket.emit("register", id);
  return { socket, register };
};
