import { useState, useCallback } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Plus,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  LayoutGrid,
  List,
  Search,
  Eye,
  Scissors,
  Copy,
  Trash2,
  ArrowUpDown,
  Image,
  Type,
  PenTool,
  Highlighter,
  Eraser,
  Text,
  Square,
  Circle,
  ArrowRight,
  FilePlus,
  FileMinus,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Home,
  Printer,
  Share2,
  Lock,
  Unlock,
  Key,
  Languages,
  FileOutput,
  X,
} from 'lucide-react';
import { pdfLibService, CompressOptions } from '../../services/pdf-lib.service';
import type { PDFPageInfo } from '../../services/pdf-lib.service';

export interface PDFToolbarProps {
  pageCount: number;
  currentPage: number;
  scale: number;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  onPrint: () => void;
  onMergePDFs: () => void;
  onSplitPDF: () => void;
  onCompressPDF: (options: CompressOptions) => void;
  onConvertPDF: (format: 'docx' | 'xlsx' | 'pptx' | 'images') => void;
  onOCR: () => void;
  onAddText: () => void;
  onAddImage: () => void;
  onAddAnnotation: (type: 'highlight' | 'underline' | 'strikethrough' | 'text' | 'shape') => void;
  onThumbnailsToggle: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleOutline: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleAnnotations: React.Dispatch<React.SetStateAction<boolean>>;
  onSearch: (query: string) => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPresentationMode: () => void;
  onProtectPDF: () => void;
  onUnprotectPDF: () => void;
  onSignPDF: () => void;
  onRedact: () => void;
  onComparePDFs: () => void;
  onExtractImages: () => void;
  onDeletePages: () => void;
  onExtractPages: () => void;
  onViewModeChange: (mode: 'single' | 'continuous' | 'facing') => void;
  onShowPageManager: (open: boolean) => void;
  onShowCompressDialog: (open: boolean) => void;
  onShowConvertDialog: (open: boolean) => void;
  onShowOCRDialog: (open: boolean) => void;
  onShowMergeDialog: (open: boolean) => void;
  onShowSplitDialog: (open: boolean) => void;
  theme: 'light' | 'dark';
  viewMode: 'single' | 'continuous' | 'facing';
  setViewMode: (mode: 'single' | 'continuous' | 'facing') => void;
  showThumbnails: boolean;
  showOutline: boolean;
  showAnnotations: boolean;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  onSearchToggle: React.Dispatch<React.SetStateAction<boolean>>;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isProtected: boolean;
  canEdit: boolean;
  selectedPagesCount: number;
  loading: boolean;
}

export function PDFToolbar({
  pageCount,
  currentPage,
  scale,
  onPageChange,
  onScaleChange,
  onOpenFile,
  onSaveFile,
  onSaveAsFile,
  onPrint,
  onMergePDFs,
  onSplitPDF,
  onCompressPDF,
  onConvertPDF,
  onOCR,
  onAddText,
  onAddImage,
  onAddAnnotation,
  onThumbnailsToggle,
  onToggleOutline,
  onToggleAnnotations,
  onSearch,
  onRotateLeft,
  onRotateRight,
  onFirstPage,
  onLastPage,
  onPrevPage,
  onNextPage,
  onPresentationMode,
  onProtectPDF,
  onUnprotectPDF,
  onSignPDF,
  onRedact,
  onComparePDFs,
  onExtractImages,
  onDeletePages,
  onExtractPages,
  theme,
  viewMode,
  setViewMode,
  showThumbnails,
  showOutline,
  showAnnotations,
  isSearchOpen,
  setSearchOpen,
  onSearchToggle,
  onSearchChange,
  searchQuery,
  setSearchQuery,
  isProtected,
  canEdit,
}: PDFToolbarProps) {
  const [compressMenuOpen, setCompressMenuOpen] = useState(false);
  const [convertMenuOpen, setConvertMenuOpen] = useState(false);
  const [annotateMenuOpen, setAnnotateMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [protectMenuOpen, setProtectMenuOpen] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));

  const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const borderColor = theme === 'dark' ? '#333' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#333';
  const mutedColor = theme === 'dark' ? '#888' : '#666';
  const hoverBgColor = theme === 'dark' ? '#2d2d2d' : '#f5f5f5';
  const activeBgColor = theme === 'dark' ? '#3d3d3d' : '#e8f0fe';
  const primaryColor = theme === 'dark' ? '#58a6ff' : '#1a73e8';

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInput, 10);
      if (!isNaN(page) && page >= 1 && page <= pageCount) {
        onPageChange(page);
      }
      setPageInput(String(currentPage));
    } else if (e.key === 'Escape') {
      setPageInput(String(currentPage));
    }
  };

  const handleScaleChange = (newScale: number) => {
    onScaleChange(Math.max(0.1, Math.min(5, newScale)));
  };

  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

  const ToolbarButton = ({
    onClick,
    children,
    disabled,
    active,
    title,
    className = '',
    toggle,
  }: {
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    children: React.ReactNode;
    disabled?: boolean;
    active?: boolean;
    title?: string;
    className?: string;
    toggle?: React.Dispatch<React.SetStateAction<boolean>>;
  }) => (
    <button
      onClick={(e) => {
        if (toggle) {
          e.preventDefault();
          toggle((prev) => !prev);
        } else {
          onClick?.(e);
        }
      }}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${className}`}
      style={{
        backgroundColor: active ? activeBgColor : 'transparent',
        color: active ? primaryColor : textColor,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) e.currentTarget.style.backgroundColor = hoverBgColor;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => (
    <div className="w-px h-8 mx-1" style={{ backgroundColor: borderColor }} />
  );

  const ToolbarGroup = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`flex items-center gap-1 ${className}`} style={{ backgroundColor: hoverBgColor, borderRadius: '8px', padding: '4px' }}>
      {children}
    </div>
  );

  const DropdownMenu = ({
    trigger,
    children,
    open,
    setOpen,
    align = 'start',
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
    open: boolean;
    setOpen: (open: boolean) => void;
    align?: 'start' | 'end';
  }) => (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className="absolute top-full z-50 mt-1 min-w-[180px] rounded-lg shadow-lg border overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            backgroundColor: bgColor,
            borderColor,
            left: align === 'start' ? 0 : 'auto',
            right: align === 'end' ? 0 : 'auto',
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );

  const DropdownItem = ({
    onClick,
    children,
    disabled,
    shortcut,
    icon,
    danger,
  }: {
    onClick?: () => void;
    children: React.ReactNode;
    disabled?: boolean;
    shortcut?: string;
    icon?: React.ReactNode;
    danger?: boolean;
  }) => (
    <button
      onClick={() => { onClick?.(); setCompressMenuOpen(false); setConvertMenuOpen(false); setAnnotateMenuOpen(false); setViewMenuOpen(false); setProtectMenuOpen(false); }}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors"
      style={{
        color: danger ? '#dc2626' : disabled ? mutedColor : textColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = hoverBgColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {icon && <span className="w-5 h-5 flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-xs opacity-50 font-mono">{shortcut}</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgColor, borderColor }}>
      {/* Main Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b" style={{ borderColor }}>
        {/* File Operations */}
        <ToolbarGroup>
          <ToolbarButton onClick={onOpenFile} title="Abrir (Ctrl+O)">
            <FolderOpen className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onSaveFile} title="Guardar (Ctrl+S)" disabled={!canEdit}>
            <Save className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onSaveAsFile} title="Guardar como (Ctrl+Shift+S)" disabled={!canEdit}>
            <FilePlus className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onPrint} title="Imprimir (Ctrl+P)">
            <Printer className="w-5 h-5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* PDF Operations */}
        <ToolbarGroup>
          <DropdownMenu trigger={
            <ToolbarButton title="Combinar PDFs">
              <FilePlus className="w-5 h-5" />
              <ChevronDown className="w-4 h-4 ml-1" />
            </ToolbarButton>
          } open={false} setOpen={() => {}} align="start">
            <DropdownItem onClick={onMergePDFs} icon={<FilePlus className="w-4 h-4" />}>
              Combinar archivos PDF
            </DropdownItem>
            <DropdownItem onClick={onSplitPDF} icon={<Scissors className="w-4 h-4" />}>
              Dividir PDF
            </DropdownItem>
            <DropdownItem onClick={() => onCompressPDF({ quality: 'medium' })} icon={<Minimize className="w-4 h-4" />}>
              Comprimir PDF
            </DropdownItem>
            <DropdownItem onClick={onExtractImages} icon={<Image className="w-4 h-4" />}>
              Extraer imágenes
            </DropdownItem>
          </DropdownMenu>

          <DropdownMenu trigger={
            <ToolbarButton title="Convertir (Ctrl+Shift+C)">
              <FileOutput className="w-5 h-5" />
              <ChevronDown className="w-4 h-4 ml-1" />
            </ToolbarButton>
          } open={convertMenuOpen} setOpen={setConvertMenuOpen} align="start">
            <DropdownItem onClick={() => onConvertPDF('docx')} icon={<FileText className="w-4 h-4" />}>
              A Word (.docx)
            </DropdownItem>
            <DropdownItem onClick={() => onConvertPDF('xlsx')} icon={<LayoutGrid className="w-4 h-4" />}>
              A Excel (.xlsx)
            </DropdownItem>
            <DropdownItem onClick={() => onConvertPDF('pptx')} icon={<Square className="w-4 h-4" />}>
              A PowerPoint (.pptx)
            </DropdownItem>
            <DropdownItem onClick={() => onConvertPDF('images')} icon={<Image className="w-4 h-4" />}>
              A Imágenes
            </DropdownItem>
          </DropdownMenu>

          <ToolbarButton onClick={onOCR} title="OCR - Reconocer texto">
            <Languages className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onComparePDFs} title="Comparar PDFs">
            <ArrowRight className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onSignPDF} title="Firmar digitalmente" disabled={!canEdit}>
            <PenTool className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onRedact} title="Tachar información sensible" disabled={!canEdit}>
            <Eraser className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onProtectPDF} title={isProtected ? 'Quitar protección' : 'Proteger PDF'}>
            {isProtected ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Navigation */}
        <ToolbarGroup>
          <ToolbarButton onClick={onFirstPage} title="Primera página (Home)" disabled={currentPage === 1}>
            <Home className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onPrevPage} title="Página anterior (←)" disabled={currentPage === 1}>
            <ChevronLeft className="w-5 h-5" />
          </ToolbarButton>

          <div className="flex items-center gap-1 px-2">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={handlePageInputKeyDown}
              onBlur={() => setPageInput(String(currentPage))}
              className="w-16 text-center text-sm rounded border px-1 py-0.5"
              style={{
                backgroundColor: bgColor,
                borderColor,
                color: textColor,
                outline: 'none',
              }}
              aria-label="Número de página"
            />
            <span className="text-sm" style={{ color: mutedColor }}>
              / {pageCount}
            </span>
          </div>

          <ToolbarButton onClick={onNextPage} title="Página siguiente (→)" disabled={currentPage === pageCount}>
            <ChevronRight className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onLastPage} title="Última página (End)" disabled={currentPage === pageCount}>
            <ChevronRight className="w-5 h-5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Rotation */}
        <ToolbarGroup>
          <ToolbarButton onClick={onRotateLeft} title="Rotar izquierda (Ctrl+Shift+←)" disabled={!canEdit}>
            <RotateCcw className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={onRotateRight} title="Rotar derecha (Ctrl+Shift+→)" disabled={!canEdit}>
            <RotateCw className="w-5 h-5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Zoom */}
        <ToolbarGroup>
          <ToolbarButton onClick={() => handleScaleChange(scale - 0.1)} title="Alejar (Ctrl+-)" disabled={scale <= 0.1}>
            <ZoomOut className="w-5 h-5" />
          </ToolbarButton>

          <div className="relative">
            <button
              className="px-2 py-1 text-sm rounded border flex items-center gap-1"
              style={{
                backgroundColor: bgColor,
                borderColor,
                color: textColor,
              }}
            >
              {Math.round(scale * 100)}%
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
              style={{ backgroundColor: bgColor, borderColor }}>
              {zoomLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => handleScaleChange(level)}
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  style={{ color: textColor }}
                >
                  {level === 1 ? '100% (Real)' : `${Math.round(level * 100)}%`}
                </button>
              ))}
              <div className="border-t px-3 py-1" style={{ borderColor }}>
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={Math.round(scale * 100)}
                  onChange={(e) => handleScaleChange(parseInt(e.target.value, 10) / 100)}
                  className="w-full"
                  style={{ accentColor: primaryColor }}
                />
              </div>
            </div>
          </div>

          <ToolbarButton onClick={() => handleScaleChange(scale + 0.1)} title="Acercar (Ctrl+=)" disabled={scale >= 5}>
            <ZoomIn className="w-5 h-5" />
          </ToolbarButton>

          <ToolbarButton onClick={() => handleScaleChange(1)} title="Tamaño real (Ctrl+0)">
            <Maximize className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleScaleChange(0)} title="Ajustar a ancho" disabled={scale === 0}>
            <Minimize className="w-5 h-5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* View Mode */}
        <ToolbarGroup>
          <DropdownMenu trigger={
            <ToolbarButton title="Modo de vista">
              {viewMode === 'single' && <LayoutGrid className="w-5 h-5" />}
              {viewMode === 'continuous' && <List className="w-5 h-5" />}
              {viewMode === 'facing' && <Square className="w-5 h-5" />}
              <ChevronDown className="w-4 h-4 ml-1" />
            </ToolbarButton>
          } open={viewMenuOpen} setOpen={setViewMenuOpen} align="start">
            <DropdownItem
              onClick={() => setViewMode('single')}
              icon={<LayoutGrid className="w-4 h-4" />}
            >
              Página única
            </DropdownItem>
            <DropdownItem
              onClick={() => setViewMode('continuous')}
              icon={<List className="w-4 h-4" />}
            >
              Continuo
            </DropdownItem>
            <DropdownItem
              onClick={() => setViewMode('facing')}
              icon={<Square className="w-4 h-4" />}
            >
              Enfrentadas
            </DropdownItem>
          </DropdownMenu>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Sidebar Toggles */}
        <ToolbarGroup>
          <ToolbarButton
            toggle={onThumbnailsToggle}
            active={showThumbnails}
            title="Miniaturas (F4)"
          >
            <LayoutGrid className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            toggle={onToggleOutline}
            active={showOutline}
            title="Marcadores/Índice (F5)"
          >
            <List className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            toggle={onToggleAnnotations}
            active={showAnnotations}
            title="Anotaciones (F6)"
          >
            <PenTool className="w-5 h-5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Annotation Tools */}
        <ToolbarGroup>
          <DropdownMenu trigger={
            <ToolbarButton title="Anotar" active={annotateMenuOpen} disabled={!canEdit}>
              <PenTool className="w-5 h-5" />
              <ChevronDown className="w-4 h-4 ml-1" />
            </ToolbarButton>
          } open={annotateMenuOpen} setOpen={setAnnotateMenuOpen} align="start">
            <DropdownItem onClick={() => onAddAnnotation('text')} icon={<Type className="w-4 h-4" />}>
              Texto
            </DropdownItem>
            <DropdownItem onClick={() => onAddAnnotation('highlight')} icon={<Highlighter className="w-4 h-4" />}>
              Resaltar
            </DropdownItem>
            <DropdownItem onClick={() => onAddAnnotation('underline')} icon={<Underline className="w-4 h-4" />}>
              Subrayar
            </DropdownItem>
            <DropdownItem onClick={() => onAddAnnotation('strikethrough')} icon={<Strikethrough className="w-4 h-4" />}>
              Tachar
            </DropdownItem>
            <DropdownItem onClick={onAddText} icon={<Text className="w-4 h-4" />}>
              Cuadro de texto
            </DropdownItem>
            <DropdownItem onClick={onAddImage} icon={<Image className="w-4 h-4" />}>
              Imagen
            </DropdownItem>
            <DropdownItem onClick={() => onAddAnnotation('shape')} icon={<Square className="w-4 h-4" />}>
              Forma (Rectángulo)
            </DropdownItem>
            <DropdownItem onClick={() => onAddAnnotation('shape')} icon={<Circle className="w-4 h-4" />}>
              Forma (Elipse)
            </DropdownItem>
            <DropdownItem onClick={() => onAddAnnotation('shape')} icon={<ArrowRight className="w-4 h-4" />}>
              Flecha
            </DropdownItem>
            <DropdownItem onClick={() => onAddAnnotation('shape')} icon={<PenTool className="w-4 h-4" />}>
              Dibujo libre
            </DropdownItem>
          </DropdownMenu>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Search */}
        <ToolbarGroup>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); onSearch(e.target.value); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              placeholder="Buscar en documento... (Ctrl+F)"
              className="pl-10 pr-8 py-1.5 text-sm rounded-lg border w-64 focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: bgColor,
                borderColor,
                color: textColor,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); onSearch(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" style={{ color: mutedColor }} />
              </button>
            )}
          </div>
        </ToolbarGroup>

        <div className="flex-1" />

        {/* Presentation Mode */}
        <ToolbarButton onClick={onPresentationMode} title="Modo presentación (F11)">
          <Maximize className="w-5 h-5" />
        </ToolbarButton>

        {/* Help */}
        <ToolbarButton onClick={() => window.electronAPI?.dialog?.showMessageBox({ message: 'Ayuda no implementada aún' })} title="Ayuda (F1)">
          <HelpCircle className="w-5 h-5" />
        </ToolbarButton>

        {/* Settings */}
        <ToolbarButton onClick={() => window.electronAPI?.dialog?.showMessageBox({ message: 'Configuración no implementada aún' })} title="Configuración (Ctrl+,)">
          <Settings className="w-5 h-5" />
        </ToolbarButton>
      </div>

      {/* Search Results Bar */}
      {isSearchOpen && searchQuery && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50 dark:bg-gray-800" style={{ borderColor }}>
          <Search className="w-4 h-4" style={{ color: primaryColor }} />
          <span className="text-sm" style={{ color: textColor }}>
            Buscando <strong>{'"'}{searchQuery}{'"'}</strong>
          </span>
          <button
            onClick={() => { setSearchQuery(''); onSearch(''); setSearchOpen(false); }}
            className="ml-auto px-3 py-1 text-sm rounded border transition-colors"
            style={{ borderColor, color: textColor }}
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

// Missing icons - create simple ones
function Underline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  );
}

function Strikethrough({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    </svg>
  );
}

export default PDFToolbar;