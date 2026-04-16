/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOCKET_URL?: string;
  /** Socket.IO `room` query when not passed via URL (`?room=`). Defaults to `default`. */
  readonly VITE_DEFAULT_ROOM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
