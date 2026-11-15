import type { IpcChannel } from '@linuxoffice/shared/ipc-channels';

interface WindowEventMap {
  'editor:shortcut': CustomEvent<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    fullscreen: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };

  file: {
    open: () => Promise<string[]>;
    save: (filePath: string, content: Uint8Array) => Promise<{ success: boolean; error?: string }>;
    saveAs: (content: Uint8Array, defaultName: string, filters: Electron.FileFilter[]) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
    new: () => Promise<{ success: boolean }>;
    recent: () => Promise<string[]>;
    read: (filePath: string) => Promise<Uint8Array>;
    write: (filePath: string, content: Uint8Array) => Promise<{ success: boolean; error?: string }>;
  };

  pdf: {
    merge: (files: string[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    split: (file: string, ranges: number[][]) => Promise<{ success: boolean; files?: string[]; error?: string }>;
    compress: (file: string, quality: number) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    convert: (file: string, format: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    ocr: (file: string, lang: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    reorganize: (file: string, pageOrder: number[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    extractPages: (file: string, pages: number[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    deletePages: (file: string, pages: number[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    edit: (file: string, operations: unknown[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };

  office: {
    convert: (file: string, format: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    exportPdf: (file: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };

  editor: {
    undo: () => Promise<{ success: boolean }>;
    redo: () => Promise<{ success: boolean }>;
    copy: () => Promise<{ success: boolean }>;
    paste: () => Promise<{ success: boolean }>;
    cut: () => Promise<{ success: boolean }>;
    find: (query: string) => Promise<{ success: boolean }>;
    replace: (query: string, replacement: string) => Promise<{ success: boolean }>;
    zoomIn: () => Promise<{ success: boolean }>;
    zoomOut: () => Promise<{ success: boolean }>;
    zoomReset: () => Promise<{ success: boolean }>;
    print: () => Promise<{ success: boolean }>;
    onShortcut: (callback: (shortcut: string) => void) => () => void;
  };

  dialog: {
    openFile: (options: Electron.OpenDialogOptions) => Promise<string[]>;
    saveFile: (options: Electron.SaveDialogOptions) => Promise<string | undefined>;
    openFolder: (options: Electron.OpenDialogOptions) => Promise<string[]>;
    messageBox: (options: Electron.MessageBoxOptions) => Promise<number>;
    showMessageBox: (options: Electron.MessageBoxOptions) => Promise<number>;
    errorBox: (title: string, content: string) => Promise<void>;
  };

  settings: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<{ success: boolean }>;
  };

  app: {
    ready: () => Promise<void>;
    quit: () => Promise<void>;
    onReady: (callback: () => void) => void;
  };

  platform: NodeJS.Platform;
  versions: NodeJS.ProcessVersions;
}

export type ElectronFileFilter = Electron.FileFilter;