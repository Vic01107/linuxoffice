import { useEffect, useCallback } from 'react';
import { useTabsStore } from '../stores/tabs';
import { useSettingsStore } from '../stores/settings';

type ShortcutHandler = (event: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  context?: 'global' | 'editor' | 'dialog';
}

function matchShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
  if (shortcut.ctrl && !event.ctrlKey) return false;
  if (shortcut.meta && !event.metaKey) return false;
  if (shortcut.shift && !event.shiftKey) return false;
  if (shortcut.alt && !event.altKey) return false;
  return true;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], context: 'global' | 'editor' | 'dialog' = 'global') {
  const { tabs, tabOrder, activeTabId, activateTab, closeTab, addTab } = useTabsStore();
  const { theme, setTheme, setShowSidebar, showSidebar } = useSettingsStore();

  const getNextTab = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTabId ?? '');
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % tabOrder.length;
    const nextId = tabOrder[nextIndex];
    if (nextId) activateTab(nextId);
  }, [tabOrder, activeTabId, activateTab]);

  const getPrevTab = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTabId ?? '');
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
    const prevId = tabOrder[prevIndex];
    if (prevId) activateTab(prevId);
  }, [tabOrder, activeTabId, activateTab]);

  const getActivateTabByIndex = useCallback((index: number) => {
    const id = tabOrder[index];
    if (id) activateTab(id);
  }, [tabOrder, activateTab]);

  const getCloseTabByIndex = useCallback((index: number) => {
    const id = tabOrder[index];
    if (id) closeTab(id);
  }, [tabOrder, closeTab]);

  const getNewTab = useCallback((appType: 'writer' | 'calc' | 'impress' | 'pdf') => {
    addTab({ appType, title: `${appType.charAt(0).toUpperCase() + appType.slice(1)} sin título`, isDirty: false, isActive: true, filePath: undefined });
  }, [addTab]);

  const globalShortcuts: Shortcut[] = [
    // File operations
    { key: 'n', ctrl: true, handler: () => getNewTab('writer'), context: 'global' },
    { key: 'o', ctrl: true, handler: () => window.electronAPI?.file?.open(), context: 'global' },
    { key: 's', ctrl: true, handler: (e) => { e.preventDefault(); window.electronAPI?.file?.saveAs(new Uint8Array(), 'document', []); }, context: 'global' },
    { key: 's', ctrl: true, shift: true, handler: () => window.electronAPI?.file?.saveAs(new Uint8Array(), 'document', []), context: 'global' },
    { key: 'w', ctrl: true, handler: () => {
      const currentIndex = tabOrder.indexOf(activeTabId || '');
      if (currentIndex !== -1) getCloseTabByIndex(currentIndex);
    }, context: 'global' },
    { key: 'p', ctrl: true, handler: () => window.electronAPI?.editor?.print(), context: 'global' },

    // Tab navigation
    { key: 'Tab', ctrl: true, handler: () => getNextTab(), context: 'global' },
    { key: 'Tab', ctrl: true, shift: true, handler: () => getPrevTab(), context: 'global' },
    { key: '1', ctrl: true, handler: () => getActivateTabByIndex(0), context: 'global' },
    { key: '2', ctrl: true, handler: () => getActivateTabByIndex(1), context: 'global' },
    { key: '3', ctrl: true, handler: () => getActivateTabByIndex(2), context: 'global' },
    { key: '4', ctrl: true, handler: () => getActivateTabByIndex(3), context: 'global' },
    { key: '5', ctrl: true, handler: () => getActivateTabByIndex(4), context: 'global' },
    { key: '6', ctrl: true, handler: () => getActivateTabByIndex(5), context: 'global' },
    { key: '7', ctrl: true, handler: () => getActivateTabByIndex(6), context: 'global' },
    { key: '8', ctrl: true, handler: () => getActivateTabByIndex(7), context: 'global' },
    { key: '9', ctrl: true, handler: () => getActivateTabByIndex(8), context: 'global' },

    // Zoom
    { key: '=', ctrl: true, handler: () => window.electronAPI?.editor?.zoomIn(), context: 'global' },
    { key: '-', ctrl: true, handler: () => window.electronAPI?.editor?.zoomOut(), context: 'global' },
    { key: '0', ctrl: true, handler: () => window.electronAPI?.editor?.zoomReset(), context: 'global' },

    // Find/Replace
    { key: 'f', ctrl: true, handler: () => window.electronAPI?.editor?.find(''), context: 'global' },
    { key: 'h', ctrl: true, handler: () => window.electronAPI?.editor?.replace('', ''), context: 'global' },

    // UI toggles
    { key: 'b', ctrl: true, shift: true, handler: () => setShowSidebar(!showSidebar), context: 'global' },
    { key: 't', ctrl: true, shift: true, handler: () => {
      const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
      const currentIndex = themes.indexOf(theme);
      const nextIndex = (currentIndex + 1) % themes.length;
      setTheme(themes[nextIndex] as 'light' | 'dark' | 'system');
    }, context: 'global' },

    // Editor
    { key: 'z', ctrl: true, handler: () => window.electronAPI?.editor?.undo(), context: 'editor' },
    { key: 'y', ctrl: true, handler: () => window.electronAPI?.editor?.redo(), context: 'editor' },
    { key: 'z', ctrl: true, shift: true, handler: () => window.electronAPI?.editor?.redo(), context: 'editor' },
    { key: 'c', ctrl: true, handler: () => window.electronAPI?.editor?.copy(), context: 'editor' },
    { key: 'v', ctrl: true, handler: () => window.electronAPI?.editor?.paste(), context: 'editor' },
    { key: 'x', ctrl: true, handler: () => window.electronAPI?.editor?.cut(), context: 'editor' },
    { key: 'a', ctrl: true, handler: (e) => { /* Select all handled by browser */ }, context: 'editor' },
  ];

  const allShortcuts = [...globalShortcuts, ...shortcuts];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isInput = event.target instanceof HTMLInputElement ||
                    event.target instanceof HTMLTextAreaElement ||
                    event.target instanceof HTMLSelectElement ||
                    (event.target as HTMLElement).isContentEditable;

    for (const shortcut of allShortcuts) {
      if (shortcut.context !== context && shortcut.context !== 'global') continue;
      if (context === 'editor' && shortcut.context === 'global' && isInput) continue;

      if (matchShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler(event);
        break;
      }
    }
  }, [allShortcuts, context]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalShortcuts() {
  useKeyboardShortcuts([], 'global');
}

export function useEditorShortcuts(customShortcuts: Shortcut[] = []) {
  useKeyboardShortcuts(customShortcuts, 'editor');
}

export function useDialogShortcuts(customShortcuts: Shortcut[] = []) {
  useKeyboardShortcuts(customShortcuts, 'dialog');
}