import React, { useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/DropdownMenu';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/Tooltip';
import { useTabs } from '../../hooks/useTabs';
import type { AppType } from '../../types/tab';

const APP_ICONS: Record<AppType, React.ReactNode> = {
  writer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  calc: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  impress: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  ),
  pdf: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <text x="9" y="16" fontSize="6" textAnchor="middle" fill="currentColor">PDF</text>
    </svg>
  ),
};

interface SortableTabProps {
  tab: {
    id: string;
    appType: AppType;
    title: string;
    isDirty: boolean;
    isActive: boolean;
  };
  index: number;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function SortableTab({ tab, index, onActivate, onClose, onDuplicate }: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          tab.isActive && 'bg-primary text-primary-foreground shadow-sm',
          isDragging && 'shadow-lg ring-2 ring-primary'
        )}
        onClick={() => onActivate(tab.id)}
      >
        <span className="flex-shrink-0">{APP_ICONS[tab.appType]}</span>
        <span className="truncate flex-1 text-sm font-medium">{tab.title}</span>
        {tab.isDirty && (
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-500" title="Cambios sin guardar" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
          aria-label="Cerrar pestaña"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

export function TabBar() {
  const { tabs, tabOrder, activeTabId, activateTab, closeTab, duplicateTab, newTab, reorderTabs } = useTabs();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tabOrder.indexOf(active.id as string);
      const newIndex = tabOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTabs(oldIndex, newIndex);
      }
    }
  }, [tabOrder, reorderTabs]);

  const orderedTabs = tabOrder.map((id) => tabs.find((t) => t.id === id)).filter(Boolean) as (typeof tabs)[0][];

  if (orderedTabs.length === 0) {
    return (
      <div className="flex items-center h-10 bg-card border-b border-border">
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => newTab('writer')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Nueva pestaña (Ctrl+T)</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tabOrder} strategy={verticalListSortingStrategy}>
        <div className="flex items-center h-10 bg-card border-b border-border overflow-x-auto">
          <div className="flex items-center gap-1 px-2 min-w-max">
            {orderedTabs.map((tab, index) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                index={index}
                onActivate={activateTab}
                onClose={closeTab}
                onDuplicate={duplicateTab}
              />
            ))}

            {/* New Tab Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 ml-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Nueva pestaña (Ctrl+T)</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuLabel>Nuevo documento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => newTab('writer')}>
                  <span className="flex items-center gap-2">
                    {APP_ICONS.writer}
                    Writer
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => newTab('calc')}>
                  <span className="flex items-center gap-2">
                    {APP_ICONS.calc}
                    Calc
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => newTab('impress')}>
                  <span className="flex items-center gap-2">
                    {APP_ICONS.impress}
                    Impress
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => newTab('pdf')}>
                  <span className="flex items-center gap-2">
                    {APP_ICONS.pdf}
                    PDF Editor
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}