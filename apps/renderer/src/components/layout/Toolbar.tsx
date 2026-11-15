import React from 'react';
import { cn } from '../../lib/utils';
import { Toolbar as ToolbarUI, ToolbarButton, ToolbarSeparator, ToolbarGroup } from '../ui/Toolbar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '../ui/DropdownMenu';
import { Button } from '../ui/Button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/Tooltip';
import { useTabsStore } from '../../stores/tabs';
import { useSettingsStore } from '../../stores/settings';
import type { AppType } from '../../types/tab';

const FORMAT_ICONS = {
  bold: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  ),
  italic: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  underline: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  ),
  strikethrough: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    </svg>
  ),
  code: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  heading1: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
      <path d="M12 18V6" />
    </svg>
  ),
  heading2: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
      <path d="M12 20V10" />
    </svg>
  ),
  list: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <line x1="4" y1="6" x2="4" y2="6" />
      <line x1="4" y1="12" x2="4" y2="12" />
      <line x1="4" y1="18" x2="4" y2="18" />
    </svg>
  ),
  alignLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  alignCenter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  alignRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  undo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  ),
  redo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  ),
  save: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  print: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  find: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  replace: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="21" x2="16" y2="13" />
    </svg>
  ),
  zoomIn: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  zoomOut: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  insertTable: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  insertImage: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  insertLink: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  brush: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  spellCheck: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 16s6-6 12 0" />
      <path d="M8 12h1" />
      <path d="M12 12h3" />
      <path d="M18 12h1" />
    </svg>
  ),
  share: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  file: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  folder: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16z" />
    </svg>
  ),
  pdf: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <text x="9" y="16" fontSize="6" textAnchor="middle" fill="currentColor">PDF</text>
    </svg>
  ),
  merge: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 1-2 2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  split: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  compress: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M3 16h5" />
      <path d="M21 8h-5" />
    </svg>
  ),
  ocr: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7" />
      <path d="M17 12H7" />
      <path d="M9.09 19.53A10 10 0 0 0 23 12V5" />
    </svg>
  ),
  rotate: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6" />
      <path d="M1 20v-6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  deletePage: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  extract: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  formula: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M5 12v9" />
      <path d="M19 12v9" />
      <path d="M10 3v18" />
      <path d="M5 21h14" />
    </svg>
  ),
  filter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  pivot: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  chart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  newSlide: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  duplicateSlide: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M18 17v4" />
      <path d="M8 21h8" />
    </svg>
  ),
  deleteSlide: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <line x1="6" y1="10" x2="18" y2="10" />
    </svg>
  ),
  theme: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  transition: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  animation: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  presenter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M2 10h20" />
    </svg>
  ),
  media: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <polygon points="23 7 16 12 23 17 23 7" />
    </svg>
  ),
};

const TOOLBAR_CONFIG: Record<AppType, { groups: ToolbarGroupConfig[] }> = {
  writer: {
    groups: [
      {
        items: [
          { id: 'new', icon: FORMAT_ICONS.file, tooltip: 'Nuevo (Ctrl+N)', action: () => window.electronAPI?.file?.new() },
          { id: 'open', icon: FORMAT_ICONS.folder, tooltip: 'Abrir (Ctrl+O)', action: () => window.electronAPI?.file?.open() },
          { id: 'save', icon: FORMAT_ICONS.save, tooltip: 'Guardar (Ctrl+S)', action: () => window.electronAPI?.file?.saveAs(new Uint8Array(), 'document', []) },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'undo', icon: FORMAT_ICONS.undo, tooltip: 'Deshacer (Ctrl+Z)', action: () => window.electronAPI?.editor?.undo() },
          { id: 'redo', icon: FORMAT_ICONS.redo, tooltip: 'Rehacer (Ctrl+Y)', action: () => window.electronAPI?.editor?.redo() },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'bold', icon: FORMAT_ICONS.bold, tooltip: 'Negrita (Ctrl+B)', action: () => {}, toggle: true },
          { id: 'italic', icon: FORMAT_ICONS.italic, tooltip: 'Cursiva (Ctrl+I)', action: () => {}, toggle: true },
          { id: 'underline', icon: FORMAT_ICONS.underline, tooltip: 'Subrayado (Ctrl+U)', action: () => {}, toggle: true },
          { id: 'strikethrough', icon: FORMAT_ICONS.strikethrough, tooltip: 'Tachado', action: () => {}, toggle: true },
          { id: 'code', icon: FORMAT_ICONS.code, tooltip: 'Código', action: () => {}, toggle: true },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'heading1', icon: FORMAT_ICONS.heading1, tooltip: 'Título 1', action: () => {} },
          { id: 'heading2', icon: FORMAT_ICONS.heading2, tooltip: 'Título 2', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'alignLeft', icon: FORMAT_ICONS.alignLeft, tooltip: 'Alinear izquierda', action: () => {}, toggle: true },
          { id: 'alignCenter', icon: FORMAT_ICONS.alignCenter, tooltip: 'Centrar', action: () => {}, toggle: true },
          { id: 'alignRight', icon: FORMAT_ICONS.alignRight, tooltip: 'Alinear derecha', action: () => {}, toggle: true },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'list', icon: FORMAT_ICONS.list, tooltip: 'Lista', action: () => {} },
          { id: 'insertTable', icon: FORMAT_ICONS.insertTable, tooltip: 'Insertar tabla', action: () => {} },
          { id: 'insertImage', icon: FORMAT_ICONS.insertImage, tooltip: 'Insertar imagen', action: () => {} },
          { id: 'insertLink', icon: FORMAT_ICONS.insertLink, tooltip: 'Insertar enlace', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'spellCheck', icon: FORMAT_ICONS.spellCheck, tooltip: 'Corrector ortográfico', action: () => {} },
          { id: 'find', icon: FORMAT_ICONS.find, tooltip: 'Buscar (Ctrl+F)', action: () => window.electronAPI?.editor?.find('') },
          { id: 'replace', icon: FORMAT_ICONS.replace, tooltip: 'Reemplazar (Ctrl+H)', action: () => window.electronAPI?.editor?.replace('', '') },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'zoomOut', icon: FORMAT_ICONS.zoomOut, tooltip: 'Alejar (Ctrl+-)', action: () => window.electronAPI?.editor?.zoomOut() },
          { id: 'zoomIn', icon: FORMAT_ICONS.zoomIn, tooltip: 'Acercar (Ctrl++)', action: () => window.electronAPI?.editor?.zoomIn() },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'print', icon: FORMAT_ICONS.print, tooltip: 'Imprimir (Ctrl+P)', action: () => window.electronAPI?.editor?.print() },
          { id: 'share', icon: FORMAT_ICONS.share, tooltip: 'Compartir', action: () => {} },
        ],
      },
    ],
  },
  calc: {
    groups: [
      {
        items: [
          { id: 'new', icon: FORMAT_ICONS.file, tooltip: 'Nuevo (Ctrl+N)', action: () => window.electronAPI?.file?.new() },
          { id: 'open', icon: FORMAT_ICONS.folder, tooltip: 'Abrir (Ctrl+O)', action: () => window.electronAPI?.file?.open() },
          { id: 'save', icon: FORMAT_ICONS.save, tooltip: 'Guardar (Ctrl+S)', action: () => window.electronAPI?.file?.saveAs(new Uint8Array(), 'spreadsheet', []) },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'undo', icon: FORMAT_ICONS.undo, tooltip: 'Deshacer (Ctrl+Z)', action: () => window.electronAPI?.editor?.undo() },
          { id: 'redo', icon: FORMAT_ICONS.redo, tooltip: 'Rehacer (Ctrl+Y)', action: () => window.electronAPI?.editor?.redo() },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'bold', icon: FORMAT_ICONS.bold, tooltip: 'Negrita (Ctrl+B)', action: () => {}, toggle: true },
          { id: 'italic', icon: FORMAT_ICONS.italic, tooltip: 'Cursiva (Ctrl+I)', action: () => {}, toggle: true },
          { id: 'underline', icon: FORMAT_ICONS.underline, tooltip: 'Subrayado (Ctrl+U)', action: () => {}, toggle: true },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'alignLeft', icon: FORMAT_ICONS.alignLeft, tooltip: 'Alinear izquierda', action: () => {}, toggle: true },
          { id: 'alignCenter', icon: FORMAT_ICONS.alignCenter, tooltip: 'Centrar', action: () => {}, toggle: true },
          { id: 'alignRight', icon: FORMAT_ICONS.alignRight, tooltip: 'Alinear derecha', action: () => {}, toggle: true },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'formula', icon: FORMAT_ICONS.formula, tooltip: 'Insertar función (Fx)', action: () => {} },
          { id: 'filter', icon: FORMAT_ICONS.filter, tooltip: 'Filtro', action: () => {} },
          { id: 'pivot', icon: FORMAT_ICONS.pivot, tooltip: 'Tabla dinámica', action: () => {} },
          { id: 'chart', icon: FORMAT_ICONS.chart, tooltip: 'Insertar gráfico', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'find', icon: FORMAT_ICONS.find, tooltip: 'Buscar (Ctrl+F)', action: () => window.electronAPI?.editor?.find('') },
          { id: 'replace', icon: FORMAT_ICONS.replace, tooltip: 'Reemplazar (Ctrl+H)', action: () => window.electronAPI?.editor?.replace('', '') },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'zoomOut', icon: FORMAT_ICONS.zoomOut, tooltip: 'Alejar (Ctrl+-)', action: () => window.electronAPI?.editor?.zoomOut() },
          { id: 'zoomIn', icon: FORMAT_ICONS.zoomIn, tooltip: 'Acercar (Ctrl++)', action: () => window.electronAPI?.editor?.zoomIn() },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'print', icon: FORMAT_ICONS.print, tooltip: 'Imprimir (Ctrl+P)', action: () => window.electronAPI?.editor?.print() },
          { id: 'share', icon: FORMAT_ICONS.share, tooltip: 'Compartir', action: () => {} },
        ],
      },
    ],
  },
  impress: {
    groups: [
      {
        items: [
          { id: 'new', icon: FORMAT_ICONS.file, tooltip: 'Nuevo (Ctrl+N)', action: () => window.electronAPI?.file?.new() },
          { id: 'open', icon: FORMAT_ICONS.folder, tooltip: 'Abrir (Ctrl+O)', action: () => window.electronAPI?.file?.open() },
          { id: 'save', icon: FORMAT_ICONS.save, tooltip: 'Guardar (Ctrl+S)', action: () => window.electronAPI?.file?.saveAs(new Uint8Array(), 'presentation', []) },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'undo', icon: FORMAT_ICONS.undo, tooltip: 'Deshacer (Ctrl+Z)', action: () => window.electronAPI?.editor?.undo() },
          { id: 'redo', icon: FORMAT_ICONS.redo, tooltip: 'Rehacer (Ctrl+Y)', action: () => window.electronAPI?.editor?.redo() },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'newSlide', icon: FORMAT_ICONS.newSlide, tooltip: 'Nueva diapositiva (Ctrl+M)', action: () => {} },
          { id: 'duplicateSlide', icon: FORMAT_ICONS.duplicateSlide, tooltip: 'Duplicar diapositiva', action: () => {} },
          { id: 'deleteSlide', icon: FORMAT_ICONS.deleteSlide, tooltip: 'Eliminar diapositiva', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'theme', icon: FORMAT_ICONS.theme, tooltip: 'Temas', action: () => {} },
          { id: 'transition', icon: FORMAT_ICONS.transition, tooltip: 'Transiciones', action: () => {} },
          { id: 'animation', icon: FORMAT_ICONS.animation, tooltip: 'Animaciones', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'bold', icon: FORMAT_ICONS.bold, tooltip: 'Negrita (Ctrl+B)', action: () => {}, toggle: true },
          { id: 'italic', icon: FORMAT_ICONS.italic, tooltip: 'Cursiva (Ctrl+I)', action: () => {}, toggle: true },
          { id: 'underline', icon: FORMAT_ICONS.underline, tooltip: 'Subrayado (Ctrl+U)', action: () => {}, toggle: true },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'insertImage', icon: FORMAT_ICONS.insertImage, tooltip: 'Insertar imagen', action: () => {} },
          { id: 'insertTable', icon: FORMAT_ICONS.insertTable, tooltip: 'Insertar tabla', action: () => {} },
          { id: 'chart', icon: FORMAT_ICONS.chart, tooltip: 'Insertar gráfico', action: () => {} },
          { id: 'media', icon: FORMAT_ICONS.media, tooltip: 'Insertar multimedia', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'find', icon: FORMAT_ICONS.find, tooltip: 'Buscar (Ctrl+F)', action: () => window.electronAPI?.editor?.find('') },
          { id: 'replace', icon: FORMAT_ICONS.replace, tooltip: 'Reemplazar (Ctrl+H)', action: () => window.electronAPI?.editor?.replace('', '') },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'zoomOut', icon: FORMAT_ICONS.zoomOut, tooltip: 'Alejar (Ctrl+-)', action: () => window.electronAPI?.editor?.zoomOut() },
          { id: 'zoomIn', icon: FORMAT_ICONS.zoomIn, tooltip: 'Acercar (Ctrl++)', action: () => window.electronAPI?.editor?.zoomIn() },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'presenter', icon: FORMAT_ICONS.presenter, tooltip: 'Vista presentador', action: () => {} },
          { id: 'print', icon: FORMAT_ICONS.print, tooltip: 'Imprimir (Ctrl+P)', action: () => window.electronAPI?.editor?.print() },
        ],
      },
    ],
  },
  pdf: {
    groups: [
      {
        items: [
          { id: 'open', icon: FORMAT_ICONS.folder, tooltip: 'Abrir PDF (Ctrl+O)', action: () => window.electronAPI?.file?.open() },
          { id: 'save', icon: FORMAT_ICONS.save, tooltip: 'Guardar (Ctrl+S)', action: () => window.electronAPI?.file?.saveAs(new Uint8Array(), 'document.pdf', [{ name: 'PDF', extensions: ['pdf'] }]) },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'undo', icon: FORMAT_ICONS.undo, tooltip: 'Deshacer (Ctrl+Z)', action: () => window.electronAPI?.editor?.undo() },
          { id: 'redo', icon: FORMAT_ICONS.redo, tooltip: 'Rehacer (Ctrl+Y)', action: () => window.electronAPI?.editor?.redo() },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'merge', icon: FORMAT_ICONS.merge, tooltip: 'Combinar PDFs', action: () => {} },
          { id: 'split', icon: FORMAT_ICONS.split, tooltip: 'Dividir PDF', action: () => {} },
          { id: 'compress', icon: FORMAT_ICONS.compress, tooltip: 'Comprimir PDF', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'rotate', icon: FORMAT_ICONS.rotate, tooltip: 'Rotar páginas', action: () => {} },
          { id: 'deletePage', icon: FORMAT_ICONS.deletePage, tooltip: 'Eliminar páginas', action: () => {} },
          { id: 'extract', icon: FORMAT_ICONS.extract, tooltip: 'Extraer páginas', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'ocr', icon: FORMAT_ICONS.ocr, tooltip: 'OCR (Reconocer texto)', action: () => {} },
          { id: 'brush', icon: FORMAT_ICONS.brush, tooltip: 'Editar/Annotar', action: () => {} },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'find', icon: FORMAT_ICONS.find, tooltip: 'Buscar (Ctrl+F)', action: () => window.electronAPI?.editor?.find('') },
          { id: 'replace', icon: FORMAT_ICONS.replace, tooltip: 'Reemplazar (Ctrl+H)', action: () => window.electronAPI?.editor?.replace('', '') },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'zoomOut', icon: FORMAT_ICONS.zoomOut, tooltip: 'Alejar (Ctrl+-)', action: () => window.electronAPI?.editor?.zoomOut() },
          { id: 'zoomIn', icon: FORMAT_ICONS.zoomIn, tooltip: 'Acercar (Ctrl++)', action: () => window.electronAPI?.editor?.zoomIn() },
        ],
      },
      {
        separator: true,
        items: [
          { id: 'print', icon: FORMAT_ICONS.print, tooltip: 'Imprimir (Ctrl+P)', action: () => window.electronAPI?.editor?.print() },
          { id: 'share', icon: FORMAT_ICONS.share, tooltip: 'Compartir', action: () => {} },
        ],
      },
    ],
  },
};

interface ToolbarGroupConfig {
  separator?: boolean;
  items: ToolbarItemConfig[];
}

interface ToolbarItemConfig {
  id: string;
  icon: React.ReactNode;
  tooltip: string;
  action: () => void;
  toggle?: boolean;
}

export function Toolbar() {
  const { activeTabId } = useTabsStore();
  const activeTab = useTabsStore.getState().tabs.find((t) => t.id === activeTabId);
  const appType = activeTab?.appType || 'writer';
  const config = TOOLBAR_CONFIG[appType];

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-card border-b border-border h-12 overflow-x-auto">
      {config.groups.map((group, groupIndex) => (
        <ToolbarGroup key={groupIndex} className="gap-1">
          {group.separator && <ToolbarSeparator />}
          {group.items.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <ToolbarButton
                  variant="ghost"
                  size="icon"
                  onClick={item.action}
                  aria-label={item.tooltip}
                  className="h-8 w-8"
                >
                  {item.icon}
                </ToolbarButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">{item.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </ToolbarGroup>
      ))}
    </div>
  );
}