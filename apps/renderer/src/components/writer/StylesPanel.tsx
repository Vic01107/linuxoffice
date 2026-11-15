import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import * as Tabs from '@radix-ui/react-tabs';
import { Search, Plus, Settings, LayoutDashboard, X } from 'lucide-react';
import { WriterStyle } from '../../types/writer/document';
import { StyleListItem } from './StyleListItem';
import { cn } from '../../lib/utils';

interface StylesPanelProps {
  styles: WriterStyle[];
  onApplyStyle: (style: WriterStyle) => void;
  onCreateStyle: () => void;
  onEditStyle: (style: WriterStyle) => void;
  onOpenTemplates: () => void;
  onOpenManageStyles: () => void;
  onClose: () => void;
}

const TABS = [
  { value: 'paragraph' as const, label: 'Párrafo', icon: '📝' },
  { value: 'character' as const, label: 'Carácter', icon: '🔤' },
  { value: 'table' as const, label: 'Tabla', icon: '📊' },
  { value: 'numbering' as const, label: 'Lista', icon: '📋' },
] as const;

export function StylesPanel({
  styles,
  onApplyStyle,
  onCreateStyle,
  onEditStyle,
  onOpenTemplates,
  onOpenManageStyles,
  onClose,
}: StylesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'paragraph' | 'character' | 'table' | 'numbering'>('paragraph');
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredStyles = useMemo(() => {
    return styles.filter(style => {
      const matchesType = style.type === activeTab;
      const matchesSearch = style.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [styles, activeTab, searchQuery]);

  const virtualizer = useVirtualizer({
    count: filteredStyles.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  const handleStyleSelect = (styleId: string) => {
    setActiveStyleId(styleId);
  };

  const handleStyleApply = (style: WriterStyle) => {
    onApplyStyle(style);
  };

  const handleStyleEdit = (style: WriterStyle) => {
    onEditStyle(style);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200" style={{ width: '280px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        <span className="font-medium text-sm text-gray-900">Estilos</span>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          aria-label="Cerrar panel de estilos"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar estilos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            aria-label="Buscar estilos"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(v: 'paragraph' | 'character' | 'table' | 'numbering') => setActiveTab(v)} className="border-b border-gray-200">
        <Tabs.List className="flex px-1 bg-gray-50" aria-label="Tipo de estilo">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded',
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'hover:bg-gray-100 transition-colors',
                'focus:outline-none focus:ring-1 focus:ring-blue-500'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      {/* Style List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ height: 'calc(100% - 200px)' }}
        role="listbox"
        aria-label="Lista de estilos"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const style = filteredStyles[virtualRow.index];
            if (!style) return null;
            return (
              <div
                key={style.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <StyleListItem
                  style={style}
                  isSelected={activeStyleId === style.id}
                  isHidden={style.hidden ?? false}
                  onSelect={() => handleStyleSelect(style.id)}
                  onApply={() => handleStyleApply(style)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-2 border-t border-gray-200 space-y-2">
        <button
          onClick={onCreateStyle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4" />
          Nuevo estilo
        </button>
        <button
          onClick={onOpenManageStyles}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-transparent border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Settings className="w-4 h-4" />
          Gestionar estilos
        </button>
        <button
          onClick={onOpenTemplates}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-transparent border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <LayoutDashboard className="w-4 h-4" />
          Plantillas
        </button>
      </div>
    </div>
  );
}

export default StylesPanel;