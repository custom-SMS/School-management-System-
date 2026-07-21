/// <reference types="vite/client" />

declare module 'vite-plugin-pwa' {
  import { Plugin } from 'vite';
  export const VitePWA: (options: any) => Plugin;
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration) => void;
    onRegisterError?: (error: unknown) => void;
  }): (reloadPage?: boolean) => void;
}
