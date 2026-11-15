import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as Checkbox from '@radix-ui/react-checkbox';
import { X, Edit2, Copy, Trash2, ChevronUp, ChevronDown, GripVertical, Search, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { WriterStyle } from '../../types/writer/document';
import { cn } from '../../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ManageStylesDialogProps {
  styles: WriterStyle[];
  onReorder: (styles: WriterStyle[]) => void;
  onBulkHide: (styleIds: string[], hidden: boolean) => void;
  onBulkDelete: (styleIds: string[]) => void;
  onEdit: (style: WriterStyle) => void;
  onClose: () => void;
}

const TYPE_LABELS = {
  paragraph: 'Párrafo',
  character: 'Carácter',
  table: 'Tabla',
  numbering: 'Lista',
} as const;

interface SortableStyleRowProps {
  style: WriterStyle;
  index: number;
  isSelected: boolean;
  onSelect: (styleId: string, selected: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHidden: () => void;
}

function SortableStyleRow({
  style,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
}: SortableStyleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: style.id });
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const styleTransform = CSS.Transform.toString(transform);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: styleTransform,
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        'group relative',
        isSelected && 'bg-blue-50',
        style.hidden && 'opacity-50',
        style.locked && 'cursor-not-allowed'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex items-center gap-2 px-2 py-1.5 ml-8" onContextMenu={e => { e.preventDefault(); setContextMenuOpen(true); }}>
        <Checkbox.Root
          checked={isSelected}
          onCheckedChange={(checked: boolean) => onSelect(style.id, checked)}
          disabled={style.locked}
          className="flex-shrink-0"
        >
          <Checkbox.Indicator className="w-4 h-4 border-gray-300 rounded">
            <span className="flex items-center justify-center text-[12px]">✓</span>
          </Checkbox.Indicator>
        </Checkbox.Root>

        <span className="w-20 text-xs text-gray-500 font-mono">{TYPE_LABELS[style.type]}</span>

        <div className="flex-1 min-w-0 truncate">
          <span className={cn('text-sm font-medium', style.hidden && 'line-through')}>{style.name}</span>
          {style.basedOn && <span className="ml-1 text-[10px] text-gray-400">← {style.basedOn}</span>}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleHidden}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            aria-label={style.hidden ? 'Mostrar' : 'Ocultar'}
            disabled={style.locked}
          >
            {style.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {style.locked && <Lock className="w-4 h-4 text-gray-300" aria-label="Estilo integrado" />}
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu.Root open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
        <ContextMenu.Portal>
          <ContextMenu.Content className="min-w-[160px] rounded-md border border-gray-200 bg-white p-1 shadow-lg" sideOffset={5}>
            <ContextMenu.Item onSelect={onEdit} disabled={style.locked} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 disabled:opacity-50">
              <Edit2 className="w-4 h-4" /> Modificar
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={onDuplicate} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100">
              <Copy className="w-4 h-4" /> Duplicar
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={onMoveUp} disabled={index === 0} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronUp className="w-4 h-4" /> Mover arriba
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={onMoveDown} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100">
              <ChevronDown className="w-4 h-4" /> Mover abajo
            </ContextMenu.Item>
            <ContextMenu.Separator className="h-px bg-gray-200 my-1" />
            <ContextMenu.Item onSelect={onToggleHidden} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100">
              {style.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {style.hidden ? 'Mostrar' : 'Ocultar'}
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={onDelete} disabled={style.locked} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Eliminar
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </div>
  );
}

export function ManageStylesDialog({
  styles,
  onReorder,
  onBulkHide,
  onBulkDelete,
  onEdit,
  onClose,
}: ManageStylesDialogProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'paragraph' | 'character' | 'table' | 'numbering' | 'builtin' | 'custom'>('all');
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredStyles = useMemo(() => {
    return styles.filter(style => {
      const matchesType = activeTab === 'all' ||
        (activeTab === 'builtin' && style.locked) ||
        (activeTab === 'custom' && !style.locked) ||
        style.type === activeTab;
      const matchesSearch = style.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [styles, activeTab, searchQuery]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = styles.findIndex(s => s.id === active.id);
      const newIndex = styles.findIndex(s => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newStyles = Array.from(styles);
        const removed = newStyles[oldIndex];
        if (removed) {
          newStyles.splice(oldIndex, 1);
          newStyles.splice(newIndex, 0, removed);
          onReorder(newStyles);
        }
      }
    }
  };

  const toggleSelect = (styleId: string, selected: boolean) => {
    setSelectedStyles(prev => {
      const next = new Set(prev);
      if (selected) next.add(styleId);
      else next.delete(styleId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStyles(new Set(filteredStyles.filter(s => !s.locked).map(s => s.id)));
  };

  const selectNone = () => {
    setSelectedStyles(new Set());
  };

  const handleBulkHide = (hidden: boolean) => {
    if (selectedStyles.size === 0) return;
    onBulkHide(Array.from(selectedStyles), hidden);
    setSelectedStyles(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedStyles.size === 0) return;
    if (!confirm(`Eliminar ${selectedStyles.size} estilos seleccionados?`)) return;
    onBulkDelete(Array.from(selectedStyles));
    setSelectedStyles(new Set());
  };

  return (
    <Dialog.Root>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[700px] max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold">Gestionar estilos</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Toolbar */}
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar estilos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <Tabs.Root value={activeTab} onValueChange={(v: 'all' | 'paragraph' | 'character' | 'table' | 'numbering' | 'builtin' | 'custom') => setActiveTab(v)} className="flex gap-1">
              {(['all', 'paragraph', 'character', 'table', 'numbering', 'builtin', 'custom'] as const).map(tab => (
                <Tabs.Trigger key={tab} value={tab} className="px-2 py-1 text-xs rounded hover:bg-gray-200 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  {tab === 'all' ? 'Todos' : tab === 'builtin' ? 'Integrados' : tab === 'custom' ? 'Personalizados' : TYPE_LABELS[tab]}
                </Tabs.Trigger>
              ))}
            </Tabs.Root>

            <div className="flex items-center gap-1 ml-auto">
              <button onClick={selectAll} disabled={selectedStyles.size === filteredStyles.filter(s => !s.locked).length} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50">Seleccionar todo</button>
              <button onClick={selectNone} disabled={selectedStyles.size === 0} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50">Ninguno</button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedStyles.size > 0 && (
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
              <span className="text-sm font-medium text-blue-800">{selectedStyles.size} estilos seleccionados</span>
              <button onClick={() => handleBulkHide(true)} className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded hover:bg-blue-200">Ocultar</button>
              <button onClick={() => handleBulkHide(false)} className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded hover:bg-blue-200">Mostrar</button>
              <button onClick={handleBulkDelete} className="px-2 py-1 text-xs text-red-700 bg-red-100 rounded hover:bg-red-200">Eliminar</button>
            </div>
          )}

          {/* Style List with Drag & Drop */}
          <div className="flex-1 overflow-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredStyles.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-gray-100">
                  {filteredStyles.map((style, index) => {
                    const fullIndex = styles.findIndex(s => s.id === style.id);
                    return (
                      <SortableStyleRow
                        key={style.id}
                        style={style}
                        index={index}
                        isSelected={selectedStyles.has(style.id)}
                        onSelect={toggleSelect}
                        onEdit={() => onEdit(style)}
                        onDuplicate={() => onEdit({ ...style, id: crypto.randomUUID(), name: `${style.name} (copia)`, locked: false })}
                        onDelete={() => onBulkDelete([style.id])}
                        onMoveUp={() => {
                          if (fullIndex > 0) {
                            const newStyles = Array.from(styles);
                            const current = newStyles[fullIndex];
                            const previous = newStyles[fullIndex - 1];
                            if (current && previous) {
                              [newStyles[fullIndex], newStyles[fullIndex - 1]] = [previous, current];
                              onReorder(newStyles);
                            }
                          }
                        }}
                        onMoveDown={() => {
                          if (fullIndex >= 0 && fullIndex < styles.length - 1) {
                            const newStyles = Array.from(styles);
                            const current = newStyles[fullIndex];
                            const next = newStyles[fullIndex + 1];
                            if (current && next) {
                              [newStyles[fullIndex], newStyles[fullIndex + 1]] = [next, current];
                              onReorder(newStyles);
                            }
                          }
                        }}
                        onToggleHidden={() => onBulkHide([style.id], !style.hidden)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
            <Dialog.Close asChild>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100">Cerrar</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ManageStylesDialog;