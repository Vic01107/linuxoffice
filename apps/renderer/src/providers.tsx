'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettingsStore } from './stores/settings';
import { useTabsStore } from './stores/tabs';
import { useDocumentsStore } from './stores/documents';

const ProvidersContext = createContext<{
  initialized: boolean;
} | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const { resolvedTheme } = useSettingsStore();

  useEffect(() => {
    // Initialize stores
    useTabsStore.getState();
    useDocumentsStore.getState();
    useSettingsStore.getState();

    // Apply initial theme
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;

    setInitialized(true);
  }, [resolvedTheme]);

  // Listen for theme changes
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  return (
    <ProvidersContext.Provider value={{ initialized }}>
      {children}
    </ProvidersContext.Provider>
  );
}

export function useProviders() {
  const context = useContext(ProvidersContext);
  if (!context) {
    throw new Error('useProviders must be used within a Providers');
  }
  return context;
}