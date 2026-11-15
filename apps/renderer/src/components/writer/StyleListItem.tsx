import { useState, useRef, useEffect, useMemo } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Edit2, Copy, Trash2, Type, FileText, Table, List } from 'lucide-react';
import { WriterStyle } from '../../types/writer/document';
import { cn } from '../../lib/utils';

interface StyleListItemProps {
  style: WriterStyle;
  isSelected: boolean;
  isHidden: boolean;
  onSelect: () => void;
  onApply: () => void;
}

const TYPE_ICONS = {
  paragraph: FileText,
  character: Type,
  table: Table,
  numbering: List,
} as const;

const TYPE_LABELS = {
  paragraph: 'Párrafo',
  character: 'Carácter',
  table: 'Tabla',
  numbering: 'Lista',
} as const;

export function StyleListItem({ style, isSelected, isHidden, onSelect, onApply }: StyleListItemProps) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const TypeIcon = TYPE_ICONS[style.type];

  // Generate preview style object for tooltip
  const previewStyle = useMemo(() => {
    const fmt = style.formatting;
    const attrs = style.paragraphAttributes;
    return {
      fontFamily: fmt.fontFamily || 'inherit',
      fontSize: fmt.fontSize ? `${fmt.fontSize}pt` : 'inherit',
      fontWeight: fmt.bold ? 'bold' : 'normal',
      fontStyle: fmt.italic ? 'italic' : 'normal',
      textDecoration: [
        fmt.underline ? 'underline' : '',
        fmt.strikethrough ? 'line-through' : '',
      ].filter(Boolean).join(' ') || 'none',
      color: fmt.color || 'inherit',
      backgroundColor: fmt.backgroundColor || 'transparent',
      textAlign: attrs?.alignment || 'left',
      paddingLeft: attrs?.indentation?.left ? `${attrs.indentation.left / 20}pt` : 0,
      paddingRight: attrs?.indentation?.right ? `${attrs.indentation.right / 20}pt` : 0,
    };
  }, [style]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        onApply();
        break;
      case ' ':
        e.preventDefault();
        onSelect();
        break;
      case 'Delete':
        if (!style.locked) {
          e.preventDefault();
          // Delete handled by context menu
        }
        break;
      case 'F2':
        e.preventDefault();
        // Rename handled by context menu
        break;
      case 'ContextMenu':
        e.preventDefault();
        setContextMenuOpen(true);
        break;
    }
  };

  const handleDoubleClick = () => {
    onApply();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuOpen(true);
  };

  return (
    <ContextMenu.Root open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <ContextMenu.Trigger asChild>
        <div
          ref={itemRef}
          className={cn(
            'relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer',
            'hover:bg-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            isSelected && 'bg-blue-50 border border-blue-200',
            isHidden && 'opacity-50 italic',
            style.locked && 'cursor-not-allowed'
          )}
          onClick={onSelect}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          onContextMenu={handleContextMenu}
          tabIndex={0}
          role="option"
          aria-selected={isSelected}
          aria-disabled={style.locked}
          style={{ minHeight: '40px' }}
        >
          {/* Style type icon */}
          <span className={cn('flex-shrink-0 w-5 h-5 text-gray-500', isSelected && 'text-blue-600')}>
            <TypeIcon className="w-4 h-4" />
          </span>

          {/* Style name and info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className={cn('font-medium text-sm truncate', isHidden && 'line-through')}>
                {style.name}
              </span>
              {style.basedOn && (
                <span className="flex-shrink-0 text-[10px] text-gray-400 bg-gray-100 px-1 rounded" title={`Basado en: ${style.basedOn}`}>
                  ← {style.basedOn}
                </span>
              )}
              {style.locked && (
                <span className="flex-shrink-0 text-[10px] text-gray-400" title="Estilo integrado (no editable)">
                  🔒
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <span>{TYPE_LABELS[style.type]}</span>
              {style.next && <span>→ {style.next}</span>}
            </div>
          </div>

          {/* Apply button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            aria-label={`Aplicar estilo ${style.name}`}
            disabled={style.locked}
          >
            <span className="text-[10px] font-medium">Aplicar</span>
          </button>
        </div>
      </ContextMenu.Trigger>

      {/* Context Menu */}
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-[180px] rounded-md border border-gray-200 bg-white p-1 shadow-lg"
          sideOffset={5}
        >
          <ContextMenu.Item
            onSelect={() => {} /* Edit - handled by parent dialog */ }
            disabled={style.locked}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 text-sm rounded',
              'hover:bg-gray-100 focus:outline-none focus:bg-gray-100',
              'disabled:opacity-50'
            )}
          >
            <Edit2 className="w-4 h-4" />
            Modificar
          </ContextMenu.Item>
          <ContextMenu.Item
            onSelect={() => {} /* Duplicate - handled by parent */ }
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
          >
            <Copy className="w-4 h-4" />
            Duplicar
          </ContextMenu.Item>
          <ContextMenu.Item
            onSelect={() => {} /* Rename - handled by parent */ }
            disabled={style.locked}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 text-sm rounded',
              'hover:bg-gray-100 focus:outline-none focus:bg-gray-100',
              'disabled:opacity-50'
            )}
          >
            <Edit2 className="w-4 h-4" />
            Renombrar
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-gray-200 my-1" />
          <ContextMenu.Item
            onSelect={() => {} /* Delete - handled by parent */ }
            disabled={style.locked}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 text-sm rounded text-red-600',
              'hover:bg-red-50 focus:outline-none focus:bg-red-50',
              'disabled:opacity-50'
            )}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>

      {/* Tooltip with live preview */}
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className="invisible" aria-hidden="true">preview</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              align="start"
              sideOffset={10}
              className={cn(
                'rounded-lg border border-gray-200 bg-white p-3 shadow-lg',
                'max-w-xs'
              )}
            >
              <div
                className="text-sm"
                style={previewStyle}
              >
                {style.name}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                <div><strong>Tipo:</strong> {TYPE_LABELS[style.type]}</div>
                {style.basedOn && <div><strong>Basado en:</strong> {style.basedOn}</div>}
                {style.next && <div><strong>Siguiente:</strong> {style.next}</div>}
                {style.locked && <div className="text-orange-600">Estilo integrado</div>}
                {style.hidden && <div className="text-gray-400">Oculto en panel</div>}
              </div>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </ContextMenu.Root>
  );
}

export default StyleListItem;