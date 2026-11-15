import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { IPC_CHANNELS } from '@linuxoffice/shared/ipc-channels';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e2e',
      symbolColor: '#cdd6f4',
      height: 36,
    },
    backgroundColor: '#1e1e2e',
    show: false,
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

function setupIpcHandlers() {
  // Window controls
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => mainWindow?.minimize());
  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => mainWindow?.close());
  ipcMain.handle(IPC_CHANNELS.WINDOW_FULLSCREEN, () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  // File operations
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Supported', extensions: ['docx', 'xlsx', 'pptx', 'pdf', 'txt', 'md'] },
        { name: 'Documents', extensions: ['docx', 'txt', 'md'] },
        { name: 'Spreadsheets', extensions: ['xlsx', 'csv'] },
        { name: 'Presentations', extensions: ['pptx'] },
        { name: 'PDFs', extensions: ['pdf'] },
      ],
    });
    return result.filePaths;
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SAVE, async (_event, filePath: string, content: Uint8Array) => {
    try {
      fs.writeFileSync(filePath, content);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SAVE_AS, async (_event, content: Uint8Array, defaultName: string, filters: Electron.FileFilter[]) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName,
      filters,
    });
    if (!result.canceled && result.filePath) {
      try {
        fs.writeFileSync(result.filePath, content);
        return { success: true, filePath: result.filePath };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
    return { success: false, canceled: true };
  });

  ipcMain.handle(IPC_CHANNELS.FILE_NEW, async () => {
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.FILE_RECENT, async () => {
    // TODO: Implement recent files from settings
    return [];
  });

  // Dialog operations
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (_event, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(mainWindow!, options);
    return result.filePaths;
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_FILE, async (_event, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(mainWindow!, options);
    return result.filePath;
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async (_event, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(mainWindow!, { ...options, properties: ['openDirectory'] });
    return result.filePaths;
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_MESSAGE_BOX, async (_event, options: Electron.MessageBoxOptions) => {
    const result = await dialog.showMessageBox(mainWindow!, options);
    return result.response;
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_ERROR_BOX, async (_event, title: string, content: string) => {
    dialog.showErrorBox(title, content);
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, key: string) => {
    // TODO: Implement settings store
    return null;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, key: string, value: unknown) => {
    // TODO: Implement settings store
    return { success: true };
  });

  // PDF operations (stubs - will be implemented in Phase 2)
  ipcMain.handle(IPC_CHANNELS.PDF_MERGE, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.PDF_SPLIT, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.PDF_COMPRESS, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.PDF_CONVERT, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.PDF_OCR, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.PDF_REORGANIZE, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.PDF_EXTRACT_PAGES, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.PDF_DELETE_PAGES, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.PDF_EDIT, async () => ({ success: false, error: 'Not implemented' }));

  // Office operations (stubs)
  ipcMain.handle(IPC_CHANNELS.OFFICE_CONVERT, async () => ({ success: false, error: 'Not implemented' }));
  ipcMain.handle(IPC_CHANNELS.OFFICE_EXPORT_PDF, async () => ({ success: false, error: 'Not implemented' }));

  // Editor operations (stubs - will forward to renderer)
  ipcMain.handle(IPC_CHANNELS.EDITOR_UNDO, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_REDO, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_COPY, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_PASTE, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_CUT, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_FIND, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_REPLACE, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_ZOOM_IN, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_ZOOM_OUT, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_ZOOM_RESET, async () => ({ success: true }));
  ipcMain.handle(IPC_CHANNELS.EDITOR_PRINT, async () => {
    mainWindow?.webContents.print();
    return { success: true };
  });
}

function setupAutoUpdater() {
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

app.whenReady().then(() => {
  mainWindow = createWindow();
  setupIpcHandlers();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Cleanup
});

export { mainWindow };