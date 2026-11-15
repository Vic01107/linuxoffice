import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { Tab, AppType } from '../types/tab';

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  tabOrder: string[];

  addTab: (tab: Omit<Tab, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>) => string;
  closeTab: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  activateTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  getActiveTab: () => Tab | undefined;
  getTabsByAppType: (appType: AppType) => Tab[];
  duplicateTab: (id: string) => void;
  splitTab: (id: string, direction: 'horizontal' | 'vertical') => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useTabsStore = create<TabsState>()(
  persist(
    immer((set, get) => ({
      tabs: [],
      activeTabId: null,
      tabOrder: [],

      addTab: (tabData) => {
        const id = generateId();
        const now = Date.now();
        const newTab: Tab = {
          ...tabData,
          id,
          documentId: '',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => {
          state.tabs.push(newTab);
          state.tabOrder.push(id);
          state.activeTabId = id;
        });
        return id;
      },

      closeTab: (id) => {
        set((state) => {
          const index = state.tabOrder.indexOf(id);
          if (index === -1) return;

          state.tabOrder.splice(index, 1);
          state.tabs = state.tabs.filter((t) => t.id !== id);

          if (state.activeTabId === id) {
            const newActive = state.tabOrder[index] || state.tabOrder[index - 1] || null;
            state.activeTabId = newActive;
            if (newActive) {
              const tab = state.tabs.find((t) => t.id === newActive);
              if (tab) tab.isActive = true;
            }
          }
        });
      },

      closeTabsToRight: (id) => {
        set((state) => {
          const index = state.tabOrder.indexOf(id);
          if (index === -1) return;

          const toClose = state.tabOrder.slice(index + 1);
          state.tabOrder = state.tabOrder.slice(0, index + 1);
          state.tabs = state.tabs.filter((t) => !toClose.includes(t.id));
        });
      },

      closeOtherTabs: (id) => {
        set((state) => {
          state.tabOrder = [id];
          state.tabs = state.tabs.filter((t) => t.id === id);
          state.activeTabId = id;
          const tab = state.tabs.find((t) => t.id === id);
          if (tab) tab.isActive = true;
        });
      },

      closeAllTabs: () => {
        set((state) => {
          state.tabs = [];
          state.tabOrder = [];
          state.activeTabId = null;
        });
      },

      activateTab: (id) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === id);
          if (!tab) return;

          state.tabs.forEach((t) => {
            t.isActive = t.id === id;
          });
          state.activeTabId = id;
        });
      },

      reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
          const removed = state.tabOrder.splice(fromIndex, 1)[0];
          if (removed) {
            state.tabOrder.splice(toIndex, 0, removed);
          }
          // Also reorder tabs array to match
          const tabsRemoved = state.tabs.splice(fromIndex, 1)[0];
          if (tabsRemoved) {
            state.tabs.splice(toIndex, 0, tabsRemoved);
          }
        });
      },

      updateTab: (id, updates) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === id);
          if (tab) {
            Object.assign(tab, updates, { updatedAt: Date.now() });
          }
        });
      },

      getActiveTab: () => {
        const state = get();
        return state.tabs.find((t) => t.id === state.activeTabId);
      },

      getTabsByAppType: (appType) => {
        const state = get();
        return state.tabs.filter((t) => t.appType === appType);
      },

      duplicateTab: (id) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === id);
        if (!tab) return;

        const newTabData = {
          ...tab,
          title: `${tab.title} (copia)`,
          isDirty: false,
          filePath: undefined,
        };
        get().addTab(newTabData);
      },

      splitTab: (id, _direction) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === id);
        if (!tab) return;

        const newTabData = {
          ...tab,
          title: `${tab.title} (dividido)`,
          isDirty: false,
        };
        get().addTab(newTabData);
      },
    })),
    {
      name: 'linuxoffice-tabs',
      partialize: (state) => ({
        tabOrder: state.tabOrder,
        tabs: state.tabs.map((t) => ({
          ...t,
          isActive: false,
        })),
      }),
    }
  )
);