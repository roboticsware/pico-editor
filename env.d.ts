/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Window {
  ElectronUpdater: {
    checkForUpdates: () => Promise<any>;
    onUpdateAvailable: (callback: (info: any) => void) => void;
    onUpdateNotAvailable: (callback: (info: any) => void) => void;
    onUpdateError: (callback: (err: string) => void) => void;
    onDownloadProgress: (callback: (progress: any) => void) => void;
    onUpdateDownloaded: (callback: (info: any) => void) => void;
    quitAndInstall: () => Promise<void>;
  };
}