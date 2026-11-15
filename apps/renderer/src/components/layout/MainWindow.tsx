import React from 'react';
import { cn } from '../../lib/utils';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { useTabsStore } from '../../stores/tabs';
import { useDocumentsStore } from '../../stores/documents';
import { useSettingsStore } from '../../stores/settings';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useGlobalShortcuts } from '../../hooks/useKeyboardShortcuts';
import { DEFAULT_TABS } from '../../types/tab';
import { PDFEditor } from '../pdf';
import { WriterTab } from '../writer';

function EditorArea() {
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const getDocument = useDocumentsStore((state) => state.getDocument);
  const { fontSize, fontFamily, theme: themeSetting } = useSettingsStore();
  const theme = themeSetting === 'system' ? 'light' : themeSetting;

  const activeTab = useTabsStore.getState().tabs.find((t) => t.id === activeTabId);
  const document = activeTabId ? getDocument(activeTabId) : null;
  const appType = activeTab?.appType;

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-muted-foreground/50">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
          <h2 className="text-xl font-semibold text-foreground mb-2">Bienvenido a LinuxOffice</h2>
          <p className="text-muted-foreground mb-6">Selecciona una aplicación en la barra lateral o crea un nuevo documento</p>
          <div className="flex items-center justify-center gap-4">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Nuevo documento
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
              Abrir archivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render different editor based on app type
  const renderEditor = () => {
    switch (appType) {
      case 'writer':
        return (
          <WriterTab tab={activeTab!} />
        );
      case 'calc':
        return (
          <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 bg-background border border-border rounded-lg overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full border-collapse" style={{ fontSize: `${fontSize}px`, fontFamily }}>
                  <thead>
                    <tr>
                      <th className="w-8 border border-border bg-muted text-center py-1 px-1" />
                      {Array.from({ length: 26 }, (_, i) => (
                        <th key={i} className="w-24 border border-border bg-muted text-center py-1 px-1 font-medium">
                          {String.fromCharCode(65 + i)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 50 }, (_, row) => (
                      <tr key={row}>
                        <td className="w-8 border border-border bg-muted text-center py-1 px-1 text-xs text-muted-foreground">
                          {row + 1}
                        </td>
                        {Array.from({ length: 26 }, (_, col) => (
                          <td key={col} className="w-24 border border-border min-h-8" />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'impress':
        return (
          <div className="flex-1 flex p-4">
            <div className="w-64 bg-card border-r border-border overflow-y-auto p-2">
              <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Diapositivas</h3>
              <div className="space-y-2">
                {Array.from({ length: 1 }, (_, i) => (
                  <div
                    key={i}
                    className="p-2 bg-background border border-border rounded-lg hover:border-primary transition-colors cursor-pointer"
                  >
                    <div className="aspect-video bg-muted rounded mb-1" />
                    <span className="text-sm font-medium">Diapositiva {i + 1}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-2 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors">
                + Nueva diapositiva
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="aspect-video bg-white shadow-xl rounded-lg max-w-3xl w-full relative">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <p>Diapositiva 1 - Haz clic para editar</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'pdf':
        return (
          <PDFEditor
            initialFile={document?.fileBytes}
            onSave={(bytes, fileName) => {
              useDocumentsStore.getState().updateDocument(activeTabId!, {
                fileBytes: bytes,
                fileName,
                isDirty: false,
              });
              useTabsStore.getState().updateTab(activeTabId!, {
                title: fileName,
                filePath: fileName,
                isDirty: false,
                updatedAt: Date.now(),
              });
            }}
            onClose={() => {
              useTabsStore.getState().closeTab(activeTabId!);
            }}
            theme={theme}
            readOnly={false}
          />
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-background">
            <p className="text-muted-foreground">Editor no implementado</p>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ fontSize: `${fontSize}px`, fontFamily }}>
      {renderEditor()}
    </div>
  );
}

export function MainWindow() {
  const { showSidebar } = useSettingsStore();

  // Global shortcuts
  useGlobalShortcuts();
  useKeyboardShortcuts([], 'global');

  const handleNewDocument = (appType: 'writer' | 'calc' | 'impress' | 'pdf') => {
    const tabData = DEFAULT_TABS[appType];
    const tabId = useTabsStore.getState().addTab(tabData);
    useDocumentsStore.getState().createDocument(tabId, appType);
  };

  return (
    <div className="flex h-screen w-screen bg-background">
      {/* Header with window controls */}
      <div className="fixed top-0 left-0 right-0 h-8 z-50 pointer-events-none">
        <div className="flex items-center justify-end h-full pr-2 pointer-events-auto">
          {/* Window controls will be rendered by Electron titleBarOverlay */}
        </div>
      </div>

      {/* Main layout */}
      <div className={cn(
        'flex h-full w-full',
        'relative z-0'
      )}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className={cn(
          'flex flex-col flex-1 overflow-hidden',
          showSidebar ? 'ml-0' : 'ml-0'
        )}>
          {/* Tab Bar */}
          <TabBar />

          {/* Toolbar */}
          <Toolbar />

          {/* Editor Area */}
          <EditorArea />

          {/* Status Bar */}
          <StatusBar />
        </div>
      </div>
    </div>
  );
}