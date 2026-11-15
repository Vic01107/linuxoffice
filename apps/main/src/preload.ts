import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '@linuxoffice/shared/ipc-channels';

const electronAPI = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    fullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_FULLSCREEN),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },

  // File operations
  file: {
    open: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN),
    save: (filePath: string, content: Uint8Array) => ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, filePath, content),
    saveAs: (content: Uint8Array, defaultName: string, filters: Electron.FileFilter[]) => ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE_AS, content, defaultName, filters),
    new: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_NEW),
    recent: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_RECENT),
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: Uint8Array) => ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, filePath, content),
  },

  // PDF operations
  pdf: {
    merge: (files: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PDF_MERGE, files),
    split: (file: string, ranges: number[][]) => ipcRenderer.invoke(IPC_CHANNELS.PDF_SPLIT, file, ranges),
    compress: (file: string, quality: number) => ipcRenderer.invoke(IPC_CHANNELS.PDF_COMPRESS, file, quality),
    convert: (file: string, format: string) => ipcRenderer.invoke(IPC_CHANNELS.PDF_CONVERT, file, format),
    ocr: (file: string, lang: string) => ipcRenderer.invoke(IPC_CHANNELS.PDF_OCR, file, lang),
    reorganize: (file: string, pageOrder: number[]) => ipcRenderer.invoke(IPC_CHANNELS.PDF_REORGANIZE, file, pageOrder),
    extractPages: (file: string, pages: number[]) => ipcRenderer.invoke(IPC_CHANNELS.PDF_EXTRACT_PAGES, file, pages),
    deletePages: (file: string, pages: number[]) => ipcRenderer.invoke(IPC_CHANNELS.PDF_DELETE_PAGES, file, pages),
    edit: (file: string, operations: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.PDF_EDIT, file, operations),
  },

  // Office operations
  office: {
    convert: (file: string, format: string) => ipcRenderer.invoke(IPC_CHANNELS.OFFICE_CONVERT, file, format),
    exportPdf: (file: string) => ipcRenderer.invoke(IPC_CHANNELS.OFFICE_EXPORT_PDF, file),
  },

  // Editor operations
  editor: {
    undo: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_UNDO),
    redo: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_REDO),
    copy: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_COPY),
    paste: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_PASTE),
    cut: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_CUT),
    find: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_FIND, query),
    replace: (query: string, replacement: string) => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_REPLACE, query, replacement),
    zoomIn: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_ZOOM_IN),
    zoomOut: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_ZOOM_OUT),
    zoomReset: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_ZOOM_RESET),
    print: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_PRINT),
    onShortcut: (callback: (shortcut: string) => void) => {
      ipcRenderer.on('editor:shortcut', (_event, shortcut) => callback(shortcut));
      return () => ipcRenderer.removeAllListeners('editor:shortcut');
    },
  },

  // Dialog operations
  dialog: {
    openFile: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE, options),
    saveFile: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, options),
    openFolder: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FOLDER, options),
    messageBox: (options: Electron.MessageBoxOptions) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_MESSAGE_BOX, options),
    errorBox: (title: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_ERROR_BOX, title, content),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
  },

  // App lifecycle
  app: {
    ready: () => ipcRenderer.invoke(IPC_CHANNELS.APP_READY),
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
    onReady: (callback: () => void) => {
      ipcRenderer.once(IPC_CHANNELS.APP_READY, callback);
    },
  },

  // Utility
  platform: process.platform,
  versions: process.versions,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;