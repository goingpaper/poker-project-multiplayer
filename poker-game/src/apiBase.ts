const DEFAULT_SOCKET_PORT = 3001;

/**
 * Same origin as the Socket.IO server.
 * - Production / CI: set `VITE_SOCKET_URL` at build time.
 * - Dev, unset: use the page host so `http://<LAN-IP>:3000` talks to `http://<LAN-IP>:3001` (not `127.0.0.1` on the guest device).
 */
export function socketOrigin(): string {
  const fromEnv = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:${DEFAULT_SOCKET_PORT}`;
  }
  return `http://127.0.0.1:${DEFAULT_SOCKET_PORT}`;
}
