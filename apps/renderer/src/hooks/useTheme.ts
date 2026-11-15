import { useEffect, useSyncExternalStore } from 'react';
import { useSettingsStore } from '../stores/settings';

function subscribe(callback: () => void) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', callback);
  return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', callback);
}

function getSnapshot() {
  return useSettingsStore.getState().resolvedTheme;
}

function getServerSnapshot() {
  return 'dark';
}

export function useTheme() {
  const resolvedTheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { theme, setTheme, toggleTheme, resolvedTheme: storeResolvedTheme } = useSettingsStore();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };
}

export function useResolvedTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}