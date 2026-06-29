import type { ElectronAPI } from '../shared/models';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
