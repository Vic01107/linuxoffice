import React from 'react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/Tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioItem, DropdownMenuRadioGroup } from '../ui/DropdownMenu';
import { useTabsStore } from '../../stores/tabs';
import { useDocumentsStore } from '../../stores/documents';
import { useSettingsStore } from '../../stores/settings';
import type { AppType } from '../../types/tab';

const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

export function StatusBar() {
  const { activeTabId, getActiveTab } = useTabsStore();
  const { getDocument } = useDocumentsStore();
  const { language, setLanguage, resolvedTheme, setTheme } = useSettingsStore();

  const activeTab = getActiveTab();
  const document = activeTabId ? getDocument(activeTabId) : null;
  const appType = activeTab?.appType;

  const getWordCount = () => {
    if (!document?.content) return 0;
    // Simplified word count
    if (appType === 'writer') {
      const text = JSON.stringify(document.content);
      return text.split(/\s+/).filter(Boolean).length;
    }
    return 0;
  };

  const getPageInfo = () => {
    if (!document?.content) return '1/1';
    if (appType === 'writer') return '1/1';
    if (appType === 'calc') return 'Hoja 1';
    if (appType === 'impress') return 'Diapositiva 1/1';
    if (appType === 'pdf') return 'Página 1/1';
    return '';
  };

  const getPositionInfo = () => {
    if (!document?.content) return '';
    if (appType === 'writer') return 'Ln 1, Col 1';
    if (appType === 'calc') return 'A1';
    if (appType === 'impress') return '';
    if (appType === 'pdf') return '';
    return '';
  };

  const getZoom = () => '100%';

  if (!activeTab) {
    return (
      <div className="flex items-center justify-between h-8 px-3 bg-card border-t border-border text-xs text-muted-foreground">
        <span>LinuxOffice</span>
        <div className="flex items-center gap-4">
          <span>{getZoom()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between h-8 px-3 bg-card border-t border-border text-xs text-muted-foreground">
      {/* Left: App-specific info */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="font-medium capitalize">{appType}</span>
        <span className="text-muted-foreground/60">•</span>
        {appType === 'writer' && (
          <>
            <span>{getWordCount()} palabras</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{getPageInfo()}</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{getPositionInfo()}</span>
          </>
        )}
        {appType === 'calc' && (
          <>
            <span>{getPageInfo()}</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{getPositionInfo()}</span>
          </>
        )}
        {appType === 'impress' && (
          <>
            <span>{getPageInfo()}</span>
          </>
        )}
        {appType === 'pdf' && (
          <>
            <span>{getPageInfo()}</span>
          </>
        )}
        {activeTab.isDirty && (
          <span className="text-yellow-500 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Cambios sin guardar
          </span>
        )}
      </div>

      {/* Right: Zoom, Language, Theme */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Zoom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent transition-colors" onClick={() => {}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <span className="font-mono">{getZoom()}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Zoom (Ctrl++ / Ctrl+-)</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 0 1-9 9c-2.52 0-4.93-1-6.74-2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M21 12a9 9 0 0 1-9-9c-2.52 0-4.93 1-6.74 2.74L3 16" />
                    <path d="M15 3h5v5" />
                  </svg>
                  <span className="text-uppercase">{language}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Idioma</TooltipContent>
            </Tooltip>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel>Idioma</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
              {LANGUAGES.map((lang) => (
                <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                  {lang.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent transition-colors">
                  {resolvedTheme === 'dark' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  )}
                  <span className="capitalize hidden sm:inline">{resolvedTheme}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Tema (Ctrl+Shift+T)</TooltipContent>
            </Tooltip>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={resolvedTheme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                Claro
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                Oscuro
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                Sistema
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}