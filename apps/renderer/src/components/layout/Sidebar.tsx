import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/Tooltip';
import { useTabsStore } from '../../stores/tabs';
import { useSettingsStore } from '../../stores/settings';
import type { AppType } from '../../types/tab';

const APP_CONFIG: Record<AppType, { icon: string; label: string; shortcut: string }> = {
  writer: { icon: 'FileText', label: 'Writer', shortcut: 'Ctrl+1' },
  calc: { icon: 'Table', label: 'Calc', shortcut: 'Ctrl+2' },
  impress: { icon: 'Presentation', label: 'Impress', shortcut: 'Ctrl+3' },
  pdf: { icon: 'FileType', label: 'PDF Editor', shortcut: 'Ctrl+4' },
};

const ICONS: Record<string, React.ReactNode> = {
  FileText: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Table: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  Presentation: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  ),
  FileType: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <text x="9" y="16" fontSize="8" textAnchor="middle" fill="currentColor">PDF</text>
    </svg>
  ),
};

export function Sidebar() {
  const { tabs, activeTabId } = useTabsStore();
  const { showSidebar, sidebarWidth } = useSettingsStore();

  if (!showSidebar) return null;

  const getTabCount = (appType: AppType) => tabs.filter((t) => t.appType === appType).length;
  const isActiveApp = (appType: AppType) => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    return activeTab?.appType === appType;
  };

  const handleAppClick = (appType: AppType) => {
    const appTabs = tabs.filter((t) => t.appType === appType);
    if (appTabs.length > 0) {
      // Activate the most recent tab of this app type
      // For now, just log - the actual tab switching is handled by TabBar
    }
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col bg-card border-r border-border transition-all duration-200',
          showSidebar ? 'w-[280px]' : 'w-14'
        )}
        style={{ width: showSidebar ? sidebarWidth : 56 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-12 px-3 border-b border-border">
          {showSidebar && (
            <span className="font-semibold text-foreground">LinuxOffice</span>
          )}
        </div>

        {/* App Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {(Object.keys(APP_CONFIG) as AppType[]).map((appType) => {
            const config = APP_CONFIG[appType];
            const count = getTabCount(appType);
            const active = isActiveApp(appType);

            return (
              <Tooltip key={appType}>
                <TooltipTrigger asChild>
                  <Button
                    variant={active ? 'default' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3',
                      showSidebar ? 'px-3 py-2' : 'px-2 py-2'
                    )}
                    onClick={() => handleAppClick(appType)}
                  >
                    {ICONS[config.icon]}
                    {showSidebar && (
                      <>
                        <span className="flex-1 text-left font-medium">{config.label}</span>
                        {count > 0 && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {count}
                          </span>
                        )}
                        <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden md:inline-flex">
                          {config.shortcut}
                        </kbd>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {!showSidebar && (
                  <TooltipContent side="right" align="center">
                    <p>{config.label} ({config.shortcut})</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer - New Document */}
        {showSidebar && (
          <div className="p-2 border-t border-border">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {/* TODO: show new document dialog */}}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nuevo documento</span>
              <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto">Ctrl+N</kbd>
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}