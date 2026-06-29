import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppData, FileActionResult } from '../shared/models';
import { EMPTY_DATA } from '../shared/models';

const isDev = !app.isPackaged;
const DATA_FILE = 'do-it-data.json';

function dataPath(): string {
  return path.join(app.getPath('userData'), DATA_FILE);
}

async function writeData(data: AppData): Promise<void> {
  const target = dataPath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temp, target);
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AppData>;
  return data.version === 1
    && Array.isArray(data.bills)
    && Array.isArray(data.subscriptions)
    && Array.isArray(data.documents)
    && Array.isArray(data.purchases)
    && Array.isArray(data.appointments)
    && Array.isArray(data.tasks)
    && typeof data.settings === 'object';
}

async function loadData(): Promise<AppData> {
  try {
    const raw = await fs.readFile(dataPath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isAppData(parsed)) throw new Error('The local data file has an unsupported format.');
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeData(EMPTY_DATA);
      return structuredClone(EMPTY_DATA);
    }
    throw error;
  }
}

function dateStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function saveDialog(defaultName: string, filters: Electron.FileFilter[]): Promise<string | undefined> {
  const result = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters
  });
  return result.canceled ? undefined : result.filePath;
}

function ok(pathname: string): FileActionResult {
  return { success: true, path: pathname };
}

function failed(error: unknown): FileActionResult {
  return { success: false, message: error instanceof Error ? error.message : 'The file action failed.' };
}

function registerIpc(): void {
  ipcMain.handle('data:load', async () => loadData());

  ipcMain.handle('data:save', async (_event, data: AppData) => {
    try {
      if (!isAppData(data)) throw new Error('Refused to save invalid data.');
      await writeData(data);
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Could not save data.' };
    }
  });

  ipcMain.handle('file:export-json', async (_event, data: AppData): Promise<FileActionResult> => {
    try {
      if (!isAppData(data)) throw new Error('The current data is invalid.');
      const target = await saveDialog(`do-it-export-${dateStamp()}.json`, [{ name: 'JSON', extensions: ['json'] }]);
      if (!target) return { success: false, canceled: true };
      await fs.writeFile(target, JSON.stringify(data, null, 2), 'utf8');
      return ok(target);
    } catch (error) {
      return failed(error);
    }
  });

  ipcMain.handle('file:import-json', async (): Promise<FileActionResult> => {
    try {
      const result = await dialog.showOpenDialog({
        defaultPath: app.getPath('downloads'),
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true };
      const raw = await fs.readFile(result.filePaths[0], 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (!isAppData(parsed)) throw new Error('This file is not a valid DO IT. export.');
      await writeData(parsed);
      return { ...ok(result.filePaths[0]), data: parsed };
    } catch (error) {
      return failed(error);
    }
  });

  ipcMain.handle('file:export-summary', async (_event, markdown: string): Promise<FileActionResult> => {
    try {
      if (typeof markdown !== 'string') throw new Error('The summary content is invalid.');
      const target = await saveDialog(`do-it-weekly-summary-${dateStamp()}.md`, [{ name: 'Markdown', extensions: ['md'] }]);
      if (!target) return { success: false, canceled: true };
      await fs.writeFile(target, markdown, 'utf8');
      return ok(target);
    } catch (error) {
      return failed(error);
    }
  });

  ipcMain.handle('file:backup', async (_event, data: AppData): Promise<FileActionResult> => {
    try {
      if (!isAppData(data)) throw new Error('The current data is invalid.');
      const target = await saveDialog(`do-it-backup-${dateStamp()}.json`, [{ name: 'JSON', extensions: ['json'] }]);
      if (!target) return { success: false, canceled: true };
      const backup = { ...data, backupCreatedAt: new Date().toISOString() };
      await fs.writeFile(target, JSON.stringify(backup, null, 2), 'utf8');
      return ok(target);
    } catch (error) {
      return failed(error);
    }
  });

  ipcMain.handle('file:open-data-folder', async () => {
    try {
      await fs.mkdir(path.dirname(dataPath()), { recursive: true });
      const message = await shell.openPath(path.dirname(dataPath()));
      return message
        ? { success: false, message }
        : { success: true, path: path.dirname(dataPath()) };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Could not open the data folder.' };
    }
  });
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1060,
    minHeight: 700,
    title: 'DO IT.',
    backgroundColor: '#080808',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  window.once('ready-to-show', () => window.show());

  if (isDev) {
    void window.loadURL('http://localhost:5173');
  } else {
    void window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
