/** Same origin as the Socket.IO server (see `VITE_SOCKET_URL`). */
export function socketOrigin(): string {
  return import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
}
