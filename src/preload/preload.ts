import { contextBridge, ipcRenderer } from 'electron';
import type { AppData, ElectronAPI } from '../shared/models';

const api: ElectronAPI = {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data: AppData) => ipcRenderer.invoke('data:save', data),
  exportJson: (data: AppData) => ipcRenderer.invoke('file:export-json', data),
  importJson: () => ipcRenderer.invoke('file:import-json'),
  exportWeeklySummary: (markdown: string) => ipcRenderer.invoke('file:export-summary', markdown),
  createBackup: (data: AppData) => ipcRenderer.invoke('file:backup', data),
  openDataFolder: () => ipcRenderer.invoke('file:open-data-folder')
};

contextBridge.exposeInMainWorld('electronAPI', api);
