import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { pdfLibService, PDFPageInfo } from '../../services/pdf-lib.service';
import {
  GripVertical,
  Trash2,
  Copy,
  Download,
  RotateCcw,
  RotateCw,
  Eye,
  Check,
  X,
  MoreHorizontal,
} from 'lucide-react';

export interface PageManagerProps {
  pageInfoList: PDFPageInfo[];
  onReorder: (newOrder: number[]) => void;
  onDeletePages: (pageIndices: number[]) => void;
  onExtractPages: (pageIndices: number[]) => void;
  onRotatePages: (pageIndices: number[], rotation: 90 | 180 | 270) => void;
  onPageClick?: (pageIndex: number) => void;
  selectedPages?: number[];
  onSelectionChange?: (pages: number[]) => void;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
}

interface SortablePageProps {
  pageInfo: PDFPageInfo;
  index: number;
  isSelected: boolean;
  onSelect: (index: number, selected: boolean) => void;
  onRotateLeft: (index: number) => void;
  onRotateRight: (index: number) => void;
  onPreview: (index: number) => void;
  onDelete: (index: number) => void;
  theme: 'light' | 'dark';
  readOnly: boolean;
}

function SortablePage({
  pageInfo,
  index,
  isSelected,
  onSelect,
  onRotateLeft,
  onRotateRight,
  onPreview,
  onDelete,
  theme,
  readOnly,
}: SortablePageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const bgColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
  const borderColor = theme === 'dark' ? '#444' : '#e0e0e0';
  const selectedBgColor = theme === 'dark' ? '#3d3d3d' : '#e8f0fe';
  const selectedBorderColor = theme === 'dark' ? '#58a6ff' : '#1a73e8';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#333';
  const mutedColor = theme === 'dark' ? '#888' : '#666';
  const hoverBgColor = theme === 'dark' ? '#383838' : '#f5f5f5';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: isSelected ? selectedBgColor : bgColor,
          borderColor: isSelected ? selectedBorderColor : borderColor,
        }}
        onMouseEnter={(e) => {
          if (!isDragging) e.currentTarget.style.backgroundColor = hoverBgColor;
        }}
        onMouseLeave={(e) => {
          if (!isDragging) e.currentTarget.style.backgroundColor = isSelected ? selectedBgColor : bgColor;
        }}
      >
        {/* Drag handle */}
        <button
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label="Arrastrar para reordenar"
          tabIndex={-1}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Checkbox for selection */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(index, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Seleccionar página ${index + 1}`}
        />

        {/* Page thumbnail placeholder */}
        <div className="relative w-20 h-28 flex-shrink-0 rounded border overflow-hidden"
          style={{ borderColor: theme === 'dark' ? '#444' : '#ddd' }}>
          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            {index + 1}
          </div>
        </div>

        {/* Page info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: textColor }}>
            Página {index + 1}
          </p>
          <p className="text-xs truncate" style={{ color: mutedColor }}>
            {Math.round(pageInfo.width)} × {Math.round(pageInfo.height)} px
            {pageInfo.rotation !== 0 && ` • Rotada ${pageInfo.rotation}°`}
          </p>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRotateLeft(index)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Rotar 90° a la izquierda"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRotateRight(index)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Rotar 90° a la derecha"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPreview(index)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Vista previa"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(index)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Eliminar página"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PageManager({
  pageInfoList,
  onReorder,
  onDeletePages,
  onExtractPages,
  onRotatePages,
  onPageClick,
  selectedPages = [],
  onSelectionChange,
  theme = 'light',
  readOnly = false,
}: PageManagerProps) {
  const [pages, setPages] = useState<PDFPageInfo[]>(pageInfoList);
  const [selection, setSelection] = useState<Set<number>>(
    new Set(selectedPages)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = Number(active.id);
      const newIndex = Number(over.id);
      const newPages = arrayMove(pages, oldIndex, newIndex);
      setPages(newPages);

      const newOrder = newPages.map((_, i) => i);
      onReorder(newOrder);
    }
  }, [pages, onReorder]);

  const handleSelect = useCallback((index: number, selected: boolean) => {
    const newSelection = new Set(selection);
    if (selected) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    setSelection(newSelection);
    onSelectionChange?.(Array.from(newSelection).sort((a, b) => a - b));
  }, [selection, onSelectionChange]);

  const handleRotateLeft = useCallback((index: number) => {
    onRotatePages([index], 270);
    // Update local rotation state
    setPages((prev) => {
      const newPages = [...prev];
      const page = newPages[index];
      if (page) {
        const newRotation = (page.rotation - 90 + 360) % 360;
        newPages[index] = { ...page, rotation: newRotation };
      }
      return newPages;
    });
  }, [onRotatePages]);

  const handleRotateRight = useCallback((index: number) => {
    onRotatePages([index], 90);
    setPages((prev) => {
      const newPages = [...prev];
      const page = newPages[index];
      if (page) {
        const newRotation = (page.rotation + 90) % 360;
        newPages[index] = { ...page, rotation: newRotation };
      }
      return newPages;
    });
  }, [onRotatePages]);

  const handlePreview = useCallback((index: number) => {
    onPageClick?.(index);
  }, [onPageClick]);

  const handleDelete = useCallback((index: number) => {
    const indices = selection.has(index) && selection.size > 1
      ? Array.from(selection)
      : [index];
    onDeletePages(indices);
    setPages((prev) => prev.filter((_, i) => !indices.includes(i)));
    setSelection((prev) => {
      const next = new Set(prev);
      indices.forEach(i => next.delete(i));
      return next;
    });
  }, [selection, onDeletePages]);

  const handleExtract = useCallback(() => {
    if (selection.size === 0) return;
    const indices = Array.from(selection).sort((a, b) => a - b);
    onExtractPages(indices);
  }, [selection, onExtractPages]);

  const handleRotateSelected = useCallback((rotation: 90 | 180 | 270) => {
    if (selection.size === 0) return;
    const indices = Array.from(selection).sort((a, b) => a - b);
    onRotatePages(indices, rotation);
    setPages((prev) => {
      const newPages = [...prev];
      indices.forEach(i => {
        const page = newPages[i];
        if (page) {
          const newRotation = (page.rotation + rotation) % 360;
          newPages[i] = { ...page, rotation: newRotation };
        }
      });
      return newPages;
    });
  }, [selection, onRotatePages]);

  const handleDeleteSelected = useCallback(() => {
    if (selection.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selection.size} página(s) seleccionada(s)?`)) return;
    const indices = Array.from(selection).sort((a, b) => a - b);
    onDeletePages(indices);
    setPages((prev) => prev.filter((_, i) => !indices.includes(i)));
    setSelection(new Set());
    onSelectionChange?.([]);
  }, [selection, onDeletePages, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    if (selection.size === pages.length) {
      setSelection(new Set());
      onSelectionChange?.([]);
    } else {
      const allIndices = new Set(pages.map((_, i) => i));
      setSelection(allIndices);
      onSelectionChange?.(Array.from(allIndices));
    }
  }, [selection.size, pages.length, onSelectionChange]);

  const bgColor = theme === 'dark' ? '#1e1e1e' : '#fafafa';
  const borderColor = theme === 'dark' ? '#333' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#333';
  const mutedColor = theme === 'dark' ? '#888' : '#666';
  const primaryColor = theme === 'dark' ? '#58a6ff' : '#1a73e8';

  const selectedCount = selection.size;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgColor }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor }}>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            ref={(el) => {
              if (el) {
                el.indeterminate = selectedCount > 0 && selectedCount < pages.length;
              }
            }}
            checked={selectedCount === pages.length && pages.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label="Seleccionar todas las páginas"
          />
          <span className="text-sm font-medium" style={{ color: textColor }}>
            {pages.length} página{pages.length !== 1 ? 's' : ''}
          </span>
          {selectedCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: primaryColor, color: 'white' }}>
              {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex-1" />

        {!readOnly && selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExtract}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
              style={{ borderColor: primaryColor, color: primaryColor }}
              aria-label="Extraer páginas seleccionadas"
            >
              <Download className="w-4 h-4" />
              <span>Extraer</span>
            </button>
            <div className="flex items-center gap-1 rounded-lg border" style={{ borderColor }}>
              <button
                onClick={() => handleRotateSelected(270)}
                className="p-2 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Rotar selección 90° izquierda"
              >
                <RotateCcw className="w-4 h-4" style={{ color: textColor }} />
              </button>
              <button
                onClick={() => handleRotateSelected(90)}
                className="p-2 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Rotar selección 90° derecha"
              >
                <RotateCw className="w-4 h-4" style={{ color: textColor }} />
              </button>
            </div>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
              aria-label="Eliminar páginas seleccionadas"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </div>
        )}
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-auto p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pages.map((_, i) => i.toString())}
            strategy={verticalListSortingStrategy}
          >
            {pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: mutedColor }}>
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <p className="text-lg font-medium">No hay páginas</p>
                <p className="text-sm mt-1">Arrastra un PDF aquí o usa el menú Archivo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pages.map((pageInfo, index) => (
                  <SortablePage
                    key={index}
                    pageInfo={pageInfo}
                    index={index}
                    isSelected={selection.has(index)}
                    onSelect={handleSelect}
                    onRotateLeft={handleRotateLeft}
                    onRotateRight={handleRotateRight}
                    onPreview={handlePreview}
                    onDelete={handleDelete}
                    theme={theme}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

export default PageManager;