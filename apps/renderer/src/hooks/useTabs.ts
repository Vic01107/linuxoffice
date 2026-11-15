import { useCallback } from 'react';
import { useTabsStore } from '../stores/tabs';
import { useDocumentsStore } from '../stores/documents';
import { DEFAULT_TABS } from '../types/tab';
import type { AppType, Tab } from '../types/tab';

export function useTabs() {
  const {
    tabs,
    activeTabId,
    tabOrder,
    addTab,
    closeTab,
    closeTabsToRight,
    closeOtherTabs,
    closeAllTabs,
    activateTab,
    reorderTabs,
    updateTab,
    getActiveTab,
    getTabsByAppType,
    duplicateTab,
    splitTab,
  } = useTabsStore();

  const handleReorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    reorderTabs(fromIndex, toIndex);
  }, [reorderTabs]);

  const { createDocument, deleteDocument } = useDocumentsStore();

  const newTab = useCallback((appType: AppType) => {
    const tabData = DEFAULT_TABS[appType];
    const tabId = addTab(tabData);
    createDocument(tabId, appType);
    return tabId;
  }, [addTab, createDocument]);

  const closeTabById = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.isDirty) {
      // TODO: Show confirmation dialog
      if (!window.confirm(`¿Guardar cambios en "${tab.title}"?`)) {
        return;
      }
    }
    deleteDocument(id);
    closeTab(id);
  }, [tabs, closeTab, deleteDocument]);

  const closeTabByIndex = useCallback((index: number) => {
    const id = tabOrder[index];
    if (id) closeTabById(id);
  }, [tabOrder, closeTabById]);

  const activateTabByIndex = useCallback((index: number) => {
    const id = tabOrder[index];
    if (id) activateTab(id);
  }, [tabOrder, activateTab]);

  const nextTab = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTabId ?? '');
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % tabOrder.length;
    const nextId = tabOrder[nextIndex];
    if (nextId) activateTab(nextId);
  }, [tabOrder, activeTabId, activateTab]);

  const prevTab = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTabId ?? '');
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
    const prevId = tabOrder[prevIndex];
    if (prevId) activateTab(prevId);
  }, [tabOrder, activeTabId, activateTab]);

  return {
    tabs,
    activeTabId,
    tabOrder,
    activeTab: getActiveTab(),
    newTab,
    closeTab: closeTabById,
    closeTabByIndex,
    closeTabsToRight,
    closeOtherTabs,
    closeAllTabs,
    activateTab,
    activateTabByIndex,
    reorderTabs: handleReorderTabs,
    updateTab,
    getTabsByAppType,
    duplicateTab,
    splitTab,
    nextTab,
    prevTab,
  };
}