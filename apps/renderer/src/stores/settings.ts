import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface SettingsState {
  // Theme
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  // Language
  language: string;
  setLanguage: (lang: string) => void;

  // Auto-save
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;

  // Sidebar
  showSidebar: boolean;
  sidebarWidth: number;
  setShowSidebar: (show: boolean) => void;
  setSidebarWidth: (width: number) => void;

  // Recent files
  recentFiles: string[];
  maxRecentFiles: number;
  addRecentFile: (file: string) => void;
  removeRecentFile: (file: string) => void;
  clearRecentFiles: () => void;

  // Editor
  fontSize: number;
  fontFamily: string;
  showLineNumbers: boolean;
  wordWrap: boolean;
  tabSize: number;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setShowLineNumbers: (show: boolean) => void;
  setWordWrap: (wrap: boolean) => void;
  setTabSize: (size: number) => void;

  // Window
  windowState: 'normal' | 'maximized' | 'fullscreen';
  setWindowState: (state: 'normal' | 'maximized' | 'fullscreen') => void;
}

const RESOLVED_THEME = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return mode;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set, get) => ({
      // Theme
      theme: 'system' as ThemeMode,
      resolvedTheme: 'dark' as 'light' | 'dark',
      setTheme: (theme: ThemeMode) => set((state) => {
        state.theme = theme;
        state.resolvedTheme = RESOLVED_THEME(theme);
      }),
      toggleTheme: () => set((state) => {
        const themes: ThemeMode[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(state.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex] as ThemeMode;
        state.theme = nextTheme;
        state.resolvedTheme = RESOLVED_THEME(nextTheme);
      }),

      // Language
      language: 'es',
      setLanguage: (lang) => set((state) => { state.language = lang; }),

      // Auto-save
      autoSave: true,
      autoSaveInterval: 30,
      setAutoSave: (enabled) => set((state) => { state.autoSave = enabled; }),
      setAutoSaveInterval: (interval) => set((state) => { state.autoSaveInterval = Math.max(5, Math.min(300, interval)); }),

      // Sidebar
      showSidebar: true,
      sidebarWidth: 280,
      setShowSidebar: (show) => set((state) => { state.showSidebar = show; }),
      setSidebarWidth: (width) => set((state) => { state.sidebarWidth = Math.max(56, Math.min(400, width)); }),

      // Recent files
      recentFiles: [],
      maxRecentFiles: 20,
      addRecentFile: (file) => set((state) => {
        const filtered = state.recentFiles.filter((f) => f !== file);
        state.recentFiles = [file, ...filtered].slice(0, state.maxRecentFiles);
      }),
      removeRecentFile: (file) => set((state) => {
        state.recentFiles = state.recentFiles.filter((f) => f !== file);
      }),
      clearRecentFiles: () => set((state) => { state.recentFiles = []; }),

      // Editor
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      showLineNumbers: true,
      wordWrap: true,
      tabSize: 2,
      setFontSize: (size) => set((state) => { state.fontSize = Math.max(8, Math.min(32, size)); }),
      setFontFamily: (family) => set((state) => { state.fontFamily = family; }),
      setShowLineNumbers: (show) => set((state) => { state.showLineNumbers = show; }),
      setWordWrap: (wrap) => set((state) => { state.wordWrap = wrap; }),
      setTabSize: (size) => set((state) => { state.tabSize = Math.max(1, Math.min(8, size)); }),

      // Window
      windowState: 'normal',
      setWindowState: (ws) => set((state) => { state.windowState = ws; }),
    })),
    {
      name: 'linuxoffice-settings',
      version: 1,
      migrate: (persisted: unknown) => {
        const state = persisted as Partial<SettingsState>;
        return {
          theme: state.theme ?? 'system',
          resolvedTheme: state.resolvedTheme ?? 'dark',
          language: state.language ?? 'es',
          autoSave: state.autoSave ?? true,
          autoSaveInterval: state.autoSaveInterval ?? 30,
          showSidebar: state.showSidebar ?? true,
          sidebarWidth: state.sidebarWidth ?? 280,
          recentFiles: state.recentFiles ?? [],
          maxRecentFiles: state.maxRecentFiles ?? 20,
          fontSize: state.fontSize ?? 14,
          fontFamily: state.fontFamily ?? 'JetBrains Mono, Fira Code, Consolas, monospace',
          showLineNumbers: state.showLineNumbers ?? true,
          wordWrap: state.wordWrap ?? true,
          tabSize: state.tabSize ?? 2,
          windowState: state.windowState ?? 'normal',
        };
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useSettingsStore.getState();
    if (store.theme === 'system') {
      useSettingsStore.getState().setTheme('system');
    }
  });
}