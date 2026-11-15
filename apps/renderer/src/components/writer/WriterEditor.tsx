import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { docxParserService } from '../../services/writer/docx-parser.service';
import { docxSerializerService } from '../../services/writer/docx-serializer.service';
import { layoutEngineService } from '../../services/writer/layout-engine.service';
import type { WriterDocumentState, WriterBlock, WriterContent, WriterFormatting, WriterSettings, WriterBlockAttributes, WriterEditorRef, WriterStyle } from '../../types/writer/document';
import { WriterViewer } from './WriterViewer';
import { TableEditor } from './TableEditor';
import { StylesPanel } from './StylesPanel';
import { StyleEditorDialog } from './StyleEditorDialog';
import { TemplatesDialog } from './TemplatesDialog';
import { ManageStylesDialog } from './ManageStylesDialog';
import { ALL_BUILTIN_STYLES } from '../../data/writer/builtin-styles';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Type,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image,
  Table,
  Minus,
  Plus,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  ChevronDown,
  ChevronUp,
  Code,
  Link,
  Highlighter,
  Superscript,
  Subscript,
  Palette,
} from 'lucide-react';

export interface WriterEditorProps {
  initialFile?: File | Uint8Array;
  onClose?: () => void;
  onSave?: (bytes: Uint8Array, fileName: string) => void;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
}

const DEFAULT_SETTINGS: WriterSettings = {
  defaultTabStop: 720,
  autoHyphenation: false,
  trackChanges: false,
  viewMode: 'print',
  zoom: 100,
  showFormatting: false,
  showRulers: true,
  showGridlines: false,
  language: 'es-ES',
  pageSize: { width: 12240, height: 15840, orientation: 'portrait' },
  margins: { top: 1440, bottom: 1440, left: 1440, right: 1440, header: 720, footer: 720, gutter: 0 },
};

const DEFAULT_BLOCK: WriterBlock = {
  id: crypto.randomUUID(),
  type: 'paragraph',
  content: [{ id: crypto.randomUUID(), type: 'text', text: '', formatting: {} }],
  attributes: { alignment: 'left' },
};

const HEADING_STYLES = [
  { value: 'paragraph', label: 'Normal' },
  { value: 'heading1', label: 'Título 1' },
  { value: 'heading2', label: 'Título 2' },
  { value: 'heading3', label: 'Título 3' },
];

const FONT_FAMILIES = [
  'Calibri', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Roboto', 'Open Sans', 'Lato',
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

export const WriterEditor = forwardRef<WriterEditorRef, WriterEditorProps>(({
  initialFile,
  onClose,
  onSave,
  theme = 'light',
  readOnly = false,
}, ref) => {
  const [document, setDocument] = useState<WriterDocumentState>({
    fileBytes: null,
    fileName: 'documento.docx',
    blocks: [DEFAULT_BLOCK],
    styles: ALL_BUILTIN_STYLES,
    settings: DEFAULT_SETTINGS,
    isDirty: false,
    isReadOnly: readOnly,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ blockId: string; contentIndex: number; offset: number } | null>(null);
  const [formatting, setFormatting] = useState<WriterFormatting>({});
  const [blockType, setBlockType] = useState<'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list' | 'table'>('paragraph');
  const [fontFamily, setFontFamily] = useState('Calibri');
  const [fontSize, setFontSize] = useState(11);
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState<string | undefined>(undefined);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkBlockId, setLinkBlockId] = useState<string | null>(null);
  const [linkContentIndex, setLinkContentIndex] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<WriterDocumentState[]>([]);
  const [redoStack, setRedoStack] = useState<WriterDocumentState[]>([]);
  const [viewMode, setViewMode] = useState<'print' | 'draft' | 'web'>('print');
  const [zoom, setZoom] = useState(100);

  // Styles panel state
  const [stylesPanelOpen, setStylesPanelOpen] = useState(false);
  const [styleEditorOpen, setStyleEditorOpen] = useState(false);
  const [styleEditorStyle, setStyleEditorStyle] = useState<WriterStyle | null>(null);
  const [styleEditorMode, setStyleEditorMode] = useState<'create' | 'edit'>('create');
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [manageStylesDialogOpen, setManageStylesDialogOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  // Compute layout for print view
  const layoutResult = useMemo(() => {
    return layoutEngineService.layout(document.blocks);
  }, [document.blocks, document.settings]);

  useImperativeHandle(ref, () => ({
    loadFile,
    save: async () => {
      if (!document.fileBytes) throw new Error('No file loaded');
      return docxSerializerService.serialize(document);
    },
  }));

  useEffect(() => {
    if (initialFile) {
      loadFile(initialFile);
    }
  }, [initialFile]);

  const saveToHistory = useCallback((newDoc: WriterDocumentState) => {
    setUndoStack(prev => [...prev.slice(-50), document]);
    setRedoStack([]);
    setDocument({ ...newDoc, isDirty: true });
  }, [document]);

  const loadFile = useCallback(async (file: File | Uint8Array) => {
    setLoading(true);
    setError(null);
    try {
      let bytes: Uint8Array;
      let name: string;

      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        bytes = new Uint8Array(arrayBuffer);
        name = file.name;
      } else {
        bytes = file;
        name = 'documento.docx';
      }

      const parsed = await docxParserService.parse(bytes);
      setDocument({ ...parsed, fileName: name });
      setUndoStack([]);
      setRedoStack([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el archivo');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveFile = useCallback(async () => {
    if (!document.fileBytes) return;
    try {
      const savedBytes = await docxSerializerService.serialize(document);
      onSave?.(savedBytes, document.fileName);
      setDocument(prev => ({ ...prev, isDirty: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  }, [document, onSave]);

  const handleSaveAsFile = useCallback(async () => {
    if (!document.fileBytes) return;
    try {
      const savedBytes = await docxSerializerService.serialize(document);
      const blob = new Blob([savedBytes as unknown as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar como');
    }
  }, [document]);

  const handleNewDocument = useCallback(() => {
    setDocument({
      fileBytes: null,
      fileName: 'documento.docx',
      blocks: [DEFAULT_BLOCK],
      styles: [],
      settings: DEFAULT_SETTINGS,
      isDirty: false,
      isReadOnly: readOnly,
    });
    setUndoStack([]);
    setRedoStack([]);
  }, [readOnly]);

  const handleOpenFile = useCallback(() => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) loadFile(file);
    };
    input.click();
  }, [loadFile]);

  const updateBlock = useCallback((blockId: string, updates: Partial<WriterBlock>) => {
    setDocument(prev => {
      const newBlocks = prev.blocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      );
      return { ...prev, blocks: newBlocks, isDirty: true };
    });
  }, []);

  const updateContent = useCallback((blockId: string, contentIndex: number, updates: Partial<WriterContent>) => {
    setDocument(prev => {
      const newBlocks = prev.blocks.map(block => {
        if (block.id !== blockId) return block;
        const newContent = block.content.map((content, i) =>
          i === contentIndex ? { ...content, ...updates } : content
        );
        return { ...block, content: newContent, attributes: { ...block.attributes, formatting: updates.formatting || block.attributes.formatting } };
      });
      return { ...prev, blocks: newBlocks, isDirty: true };
    });
  }, []);

  const updateFormatting = useCallback((blockId: string, contentIndex: number, newFormatting: WriterFormatting) => {
    setDocument(prev => {
      const newBlocks = prev.blocks.map(block => {
        if (block.id !== blockId) return block;
        const newContent = block.content.map((content, i) =>
          i === contentIndex ? { ...content, formatting: { ...content.formatting, ...newFormatting } } : content
        );
        return { ...block, content: newContent };
      });
      return { ...prev, blocks: newBlocks, isDirty: true };
    });
  }, []);

  const insertBlock = useCallback((afterBlockId: string, type: WriterBlock['type'] = 'paragraph') => {
    setDocument(prev => {
      const index = prev.blocks.findIndex(b => b.id === afterBlockId);
      const newBlock: WriterBlock = {
        id: crypto.randomUUID(),
        type,
        content: [{ id: crypto.randomUUID(), type: 'text', text: '', formatting: {} }],
        attributes: { alignment: 'left' },
      };
      const newBlocks = [...prev.blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      return { ...prev, blocks: newBlocks, isDirty: true };
    });
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    setDocument(prev => {
      if (prev.blocks.length <= 1) return prev;
      const newBlocks = prev.blocks.filter(b => b.id !== blockId);
      return { ...prev, blocks: newBlocks, isDirty: true };
    });
  }, []);

  const handleEnter = useCallback((blockId: string) => {
    insertBlock(blockId);
  }, [insertBlock]);

  const handleBackspace = useCallback((blockId: string) => {
    const block = document.blocks.find(b => b.id === blockId);
    if (block && block.content.every(c => c.text === '')) {
      if (document.blocks.length > 1) {
        deleteBlock(blockId);
      }
    }
  }, [document.blocks, deleteBlock]);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const container = range.startContainer;
    const blockElement = (container.parentElement?.closest('[data-block-id]') as HTMLElement | null);
    if (!blockElement) return;

    const blockId = blockElement.getAttribute('data-block-id');
    if (!blockId) return;

    // Find content index
    let contentIndex = 0;
    let offset = range.startOffset;

    // Get formatting from current selection
    const formatting = getFormattingFromSelection(sel);
    setFormatting(formatting);
    setSelection({ blockId, contentIndex, offset });
  }, []);

  const getFormattingFromSelection = (sel: Selection): WriterFormatting => {
    if (!sel || sel.rangeCount === 0) return {};

    const range = sel.getRangeAt(0);
    const container = range.startContainer.parentElement;
    if (!container) return {};

    const fmt: WriterFormatting = {};
    const computed = window.getComputedStyle(container);

    fmt.bold = computed.fontWeight === 'bold' || (parseInt(computed.fontWeight) ?? 0) >= 700;
    fmt.italic = computed.fontStyle === 'italic';
    fmt.underline = computed.textDecorationLine?.includes('underline');
    fmt.strikethrough = computed.textDecorationLine?.includes('line-through');
    fmt.fontFamily = computed.fontFamily?.split(',')[0]?.replace(/['"]/g, '') || 'inherit';
    fmt.fontSize = parseInt(computed.fontSize) || 11;
    fmt.color = computed.color || '#000000';
    fmt.backgroundColor = computed.backgroundColor !== 'rgba(0, 0, 0, 0)' ? computed.backgroundColor : undefined;

    return fmt;
  };

  // Toolbar handlers
  const toggleBold = () => applyFormatting({ bold: !formatting.bold });
  const toggleItalic = () => applyFormatting({ italic: !formatting.italic });
  const toggleUnderline = () => applyFormatting({ underline: !formatting.underline });
  const toggleStrikethrough = () => applyFormatting({ strikethrough: !formatting.strikethrough });
  const toggleSuperscript = () => applyFormatting({ superscript: !formatting.superscript, subscript: false });
  const toggleSubscript = () => applyFormatting({ subscript: !formatting.subscript, superscript: false });

  const applyFormatting = (newFormatting: WriterFormatting) => {
    if (!selection) return;
    updateFormatting(selection.blockId, selection.contentIndex, newFormatting);
    setFormatting(prev => ({ ...prev, ...newFormatting }));
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    applyFormatting({ fontFamily: family });
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    applyFormatting({ fontSize: size });
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    applyFormatting({ color });
  };

  const handleHighlightChange = (color: string | undefined) => {
    setHighlightColor(color);
    applyFormatting({ backgroundColor: color });
  };

  const handleAlignmentChange = (align: 'left' | 'center' | 'right' | 'justify') => {
    setAlignment(align);
    if (!selection) return;
    setDocument(prev => {
      const newBlocks = prev.blocks.map(block => {
        if (block.id !== selection.blockId) return block;
        return { ...block, attributes: { ...block.attributes, alignment: align } };
      });
      return { ...prev, blocks: newBlocks, isDirty: true };
    });
  };

  const handleBlockTypeChange = (type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list' | 'table') => {
    setBlockType(type);
    if (!selection) return;
    const blockTypeMap: Record<string, WriterBlock['type']> = {
      paragraph: 'paragraph',
      heading1: 'heading',
      heading2: 'heading',
      heading3: 'heading',
      list: 'list',
      table: 'table',
    };
    const newType = blockTypeMap[type];
    if (!newType) return;
    setDocument(prev => {
      const newBlocks = prev.blocks.map(block => {
        if (block.id !== selection.blockId) return block;
        return { ...block, type: newType };
      });
      return { ...prev, blocks: newBlocks, isDirty: true };
    });
  };

  const handleAddLink = () => {
    if (!selection || !linkUrl) return;
    updateContent(selection.blockId, selection.contentIndex, { type: 'hyperlink', link: linkUrl });
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  const handleImageInsert = (file: File) => {
    if (!selection) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
      updateContent(selection.blockId, selection.contentIndex, {
        type: 'inlineImage',
        imageData: bytes,
        text: '',
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImageClick = () => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageInsert(file);
    };
    input.click();
  };

  const handleTableInsert = () => {
    if (!selection) return;
    insertBlock(selection.blockId, 'table');
  };

  // Styles panel handlers
  const handleOpenStylesPanel = () => {
    setStylesPanelOpen(true);
  };

  const handleOpenStyleEditor = (style: WriterStyle | null, mode: 'create' | 'edit') => {
    setStyleEditorStyle(style);
    setStyleEditorMode(mode);
    setStyleEditorOpen(true);
  };

  const handleStyleEditorSave = (style: WriterStyle) => {
    setDocument(prev => {
      const existingIndex = prev.styles.findIndex(s => s.id === style.id);
      let newStyles: WriterStyle[];
      if (existingIndex >= 0) {
        newStyles = [...prev.styles];
        newStyles[existingIndex] = style;
      } else {
        newStyles = [...prev.styles, style];
      }
      return { ...prev, styles: newStyles, isDirty: true };
    });
    setStyleEditorOpen(false);
    setStyleEditorStyle(null);
  };

  const handleStyleEditorClose = () => {
    setStyleEditorOpen(false);
    setStyleEditorStyle(null);
  };

  const handleApplyStyle = (style: WriterStyle) => {
    if (!selection) return;
    // Apply paragraph style
    if (style.type === 'paragraph' && style.paragraphAttributes) {
      setDocument(prev => {
        const newBlocks = prev.blocks.map(block => {
          if (block.id !== selection.blockId) return block;
          return {
            ...block,
            attributes: { ...block.attributes, ...style.paragraphAttributes }
          };
        });
        return { ...prev, blocks: newBlocks, isDirty: true };
      });
    }
    // Apply character style
    if (style.type === 'character' && style.formatting) {
      setDocument(prev => {
        const newBlocks = prev.blocks.map(block => {
          if (block.id !== selection.blockId) return block;
          const newContent = block.content.map((content, i) =>
            i === selection.contentIndex ? { ...content, formatting: { ...content.formatting, ...style.formatting } } : content
          );
          return { ...block, content: newContent };
        });
        return { ...prev, blocks: newBlocks, isDirty: true };
      });
    }
  };

  const handleOpenTemplatesDialog = () => {
    setTemplatesDialogOpen(true);
  };

  const handleTemplatesLoad = (template: { id: string; name: string; description: string; styles: WriterStyle[]; isBuiltin: boolean; modifiedAt: number }, mode: 'replace' | 'merge') => {
    setDocument(prev => {
      let newStyles: WriterStyle[];
      if (mode === 'replace') {
        newStyles = template.styles;
      } else {
        // Merge: add template styles, keeping existing ones with same IDs
        const templateStyleMap = new Map(template.styles.map(s => [s.id, s]));
        newStyles = prev.styles.map(s => templateStyleMap.get(s.id) || s);
        // Add new styles from template
        template.styles.forEach(s => {
          if (!prev.styles.some(existing => existing.id === s.id)) {
            newStyles.push(s);
          }
        });
      }
      return { ...prev, styles: newStyles, isDirty: true };
    });
    setTemplatesDialogOpen(false);
  };

  const handleSaveAsTemplate = (name: string, description: string) => {
    // This will be handled by TemplatesDialog internally
  };

  const handleOpenManageStylesDialog = () => {
    setManageStylesDialogOpen(true);
  };

  const handleManageStylesReorder = (styles: WriterStyle[]) => {
    setDocument(prev => ({ ...prev, styles, isDirty: true }));
  };

  const handleManageStylesBulkHide = (styleIds: string[], hidden: boolean) => {
    setDocument(prev => ({
      ...prev,
      styles: prev.styles.map(s => styleIds.includes(s.id) ? { ...s, hidden } : s),
      isDirty: true,
    }));
  };

  const handleManageStylesBulkDelete = (styleIds: string[]) => {
    setDocument(prev => ({
      ...prev,
      styles: prev.styles.filter(s => !styleIds.includes(s.id)),
      isDirty: true,
    }));
  };

  const handleManageStylesEdit = (style: WriterStyle) => {
    handleOpenStyleEditor(style, 'edit');
    setManageStylesDialogOpen(false);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, document]);
    setUndoStack(prev => prev.slice(0, -1));
    setDocument(prevDoc => ({ ...prevDoc, ...prev, isDirty: true }));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, document]);
    setRedoStack(prev => prev.slice(0, -1));
    setDocument(prevDoc => ({ ...prevDoc, ...next, isDirty: true }));
  };

  useEffect(() => {
    window.document.addEventListener('selectionchange', handleSelectionChange);
    return () => window.document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const borderColor = theme === 'dark' ? '#333' : '#e0e0e0';
  const textColorTheme = theme === 'dark' ? '#e0e0e0' : '#333';
  const toolbarBg = theme === 'dark' ? '#252525' : '#fafafa';
  const hoverBg = theme === 'dark' ? '#3d3d3d' : '#e8f0fe';

  const ToolbarButton = ({ onClick, children, active, disabled, title }: {
    onClick?: () => void;
    children: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || readOnly}
      title={title}
      style={{
        padding: '6px 10px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: active ? hoverBg : 'transparent',
        color: active ? (theme === 'dark' ? '#58a6ff' : '#1a73e8') : textColorTheme,
        cursor: disabled || readOnly ? 'not-allowed' : 'pointer',
        opacity: disabled || readOnly ? 0.4 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );

  const ToolbarSelect = ({ value, onChange, children, style = {} }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) => (
    <select
      value={value}
      onChange={onChange}
      disabled={readOnly}
      style={{
        padding: '4px 8px',
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        backgroundColor: toolbarBg,
        color: textColorTheme,
        fontSize: '13px',
        ...style,
      }}
    >
      {children}
    </select>
  );

  const ToolbarGroup = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 4px', borderRight: `1px solid ${borderColor}` }}>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p style={{ color: textColorTheme }}>Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: bgColor }}>
        <div className="text-center" style={{ color: '#dc2626' }}>
          <p className="text-lg font-medium">Error al cargar el documento</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgColor, color: textColorTheme }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b" style={{ backgroundColor: toolbarBg, borderColor }}>
        {/* File operations */}
        <ToolbarGroup>
          <ToolbarButton onClick={handleNewDocument} title="Nuevo (Ctrl+N)">
            <FileText className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleOpenFile} title="Abrir (Ctrl+O)">
            <FolderOpen className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleSaveFile} title="Guardar (Ctrl+S)" disabled={!document.isDirty}>
            <Save className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleSaveAsFile} title="Guardar como">
            <Download className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        {/* Undo/Redo */}
        <ToolbarGroup>
          <ToolbarButton onClick={handleUndo} title="Deshacer (Ctrl+Z)" disabled={undoStack.length === 0}>
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleRedo} title="Rehacer (Ctrl+Y)" disabled={redoStack.length === 0}>
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        {/* Block type */}
        <ToolbarGroup>
          <ToolbarSelect
            value={blockType}
            onChange={(e) => handleBlockTypeChange(e.target.value as any)}
            style={{ minWidth: '140px' }}
          >
            {HEADING_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            <option value="list">Lista</option>
            <option value="table">Tabla</option>
          </ToolbarSelect>
        </ToolbarGroup>

        {/* Font formatting */}
        <ToolbarGroup>
          <ToolbarSelect
            value={fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            style={{ minWidth: '130px', fontFamily }}
          >
            {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </ToolbarSelect>

          <ToolbarSelect
            value={String(fontSize)}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
            style={{ minWidth: '60px' }}
          >
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </ToolbarSelect>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton onClick={toggleBold} active={formatting.bold} title="Negrita (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={toggleItalic} active={formatting.italic} title="Cursiva (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={toggleUnderline} active={formatting.underline} title="Subrayado (Ctrl+U)">
            <Underline className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={toggleStrikethrough} active={formatting.strikethrough} title="Tachado">
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton onClick={toggleSuperscript} active={formatting.superscript} title="Superíndice">
            <Superscript className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={toggleSubscript} active={formatting.subscript} title="Subíndice">
            <Subscript className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <input
            type="color"
            value={textColor}
            onChange={(e) => handleTextColorChange(e.target.value)}
            style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            title="Color de texto"
            disabled={readOnly}
          />
          <input
            type="color"
            value={highlightColor || '#ffff00'}
            onChange={(e) => handleHighlightChange(e.target.value)}
            style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: highlightColor ? 1 : 0.5 }}
            title="Resaltar"
            disabled={readOnly}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton onClick={() => handleAlignmentChange('left')} active={alignment === 'left'} title="Alinear izquierda">
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleAlignmentChange('center')} active={alignment === 'center'} title="Centrar">
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleAlignmentChange('right')} active={alignment === 'right'} title="Alinear derecha">
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleAlignmentChange('justify')} active={alignment === 'justify'} title="Justificar">
            <AlignJustify className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton onClick={handleImageClick} title="Insertar imagen">
            <Image className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleTableInsert} title="Insertar tabla">
            <Table className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => { if (selection) { setLinkBlockId(selection.blockId); setLinkContentIndex(selection.contentIndex); setShowLinkDialog(true); } }} title="Insertar enlace">
            <Link className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        {/* Styles panel */}
        <ToolbarGroup>
          <ToolbarButton onClick={handleOpenStylesPanel} title="Panel de estilos (Ctrl+Shift+S)" active={stylesPanelOpen}>
            <Palette className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        {/* Status */}
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs" style={{ color: theme === 'dark' ? '#888' : '#666' }}>
          <span>{document.blocks.length} bloques • {document.fileName} {document.isDirty ? '• Modificado' : ''}</span>
          {/* View mode selector */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'print' | 'draft' | 'web')}
            disabled={readOnly}
            style={{
              padding: '2px 8px',
              border: `1px solid ${borderColor}`,
              borderRadius: '4px',
              backgroundColor: toolbarBg,
              color: textColorTheme,
              fontSize: '12px',
            }}
          >
            <option value="print">Vista de impresión</option>
            <option value="draft">Borrador</option>
            <option value="web">Vista web</option>
          </select>
          {/* Zoom */}
          <select
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            disabled={readOnly}
            style={{
              padding: '2px 8px',
              border: `1px solid ${borderColor}`,
              borderRadius: '4px',
              backgroundColor: toolbarBg,
              color: textColorTheme,
              fontSize: '12px',
            }}
          >
            {<option value="50">50%</option>}
            {<option value="75">75%</option>}
            {<option value="100">100%</option>}
            {<option value="125">125%</option>}
            {<option value="150">150%</option>}
            {<option value="200">200%</option>}
          </select>
        </div>
      </div>

      {/* Document area */}
      <div className="flex-1 flex overflow-auto" style={{ backgroundColor: bgColor }}>
        {viewMode === 'print' ? (
          <WriterViewer
            blocks={document.blocks}
            settings={document.settings}
            zoom={zoom}
            onSelectionChange={setSelection}
            onBlockUpdate={updateBlock}
            readOnly={readOnly}
            className="flex-1"
          />
        ) : (
          <div
            ref={editorRef}
            className="mx-auto my-8"
            style={{
              width: viewMode === 'web' ? '100%' : '21cm',
              minHeight: viewMode === 'web' ? 'auto' : '29.7cm',
              backgroundColor: '#ffffff',
              boxShadow: viewMode === 'web' ? 'none' : '0 0 20px rgba(0,0,0,0.1)',
              padding: viewMode === 'web' ? '2rem' : '2.54cm 3.17cm',
              fontFamily: 'Calibri, sans-serif',
              fontSize: '11pt',
              lineHeight: 1.5,
              color: '#000000',
            }}
            contentEditable={!readOnly}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                  const blockEl = sel.anchorNode?.parentElement?.closest('[data-block-id]');
                  if (blockEl) {
                    e.preventDefault();
                    handleEnter(blockEl.getAttribute('data-block-id')!);
                  }
                }
              }
              if (e.key === 'Backspace') {
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                  const blockEl = sel.anchorNode?.parentElement?.closest('[data-block-id]');
                  if (blockEl) {
                    const blockId = blockEl.getAttribute('data-block-id')!;
                    const block = document.blocks.find(b => b.id === blockId);
                    if (block && block.content.every(c => c.text === '') && sel.isCollapsed) {
                      e.preventDefault();
                      handleBackspace(blockId);
                    }
                  }
                }
              }
              // Keyboard shortcuts
              if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                  case 'b': e.preventDefault(); toggleBold(); break;
                  case 'i': e.preventDefault(); toggleItalic(); break;
                  case 'u': e.preventDefault(); toggleUnderline(); break;
                  case 's': e.preventDefault(); handleSaveFile(); break;
                  case 'z': e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); break;
                  case 'y': e.preventDefault(); handleRedo(); break;
                }
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLElement;
              const blockEl = target.closest('[data-block-id]');
              if (!blockEl) return;
              const blockId = blockEl.getAttribute('data-block-id')!;
              const contentEl = target.closest('[data-content-id]');
              if (!contentEl) return;
              const contentIndex = parseInt(contentEl.getAttribute('data-content-index') || '0', 10);
              const text = contentEl.textContent || '';
              updateContent(blockId, contentIndex, { text });
            }}
          >
            {document.blocks.map((block, blockIndex) => (
              // Handle table blocks with TableEditor
              block.type === 'table' ? (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  style={{
                    marginBottom: '12pt',
                    textAlign: block.attributes.alignment || 'left',
                    border: block.attributes.borders ? '1px solid #000' : 'none',
                    backgroundColor: block.attributes.shading?.fill !== 'clear' && block.attributes.shading?.color
                      ? block.attributes.shading.color
                      : 'transparent',
                  }}
                >
                  <TableEditor
                    block={block}
                    onUpdate={(updatedBlock) => updateBlock(block.id, updatedBlock)}
                    readOnly={readOnly}
                  />
                </div>
              ) : (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  style={{
                    marginBottom: block.type === 'paragraph' ? '6pt' : '12pt',
                    textAlign: block.attributes.alignment || 'left',
                    paddingLeft: block.attributes.indentation?.left ? `${block.attributes.indentation.left / 20}pt` : 0,
                    paddingRight: block.attributes.indentation?.right ? `${block.attributes.indentation.right / 20}pt` : 0,
                    border: block.attributes.borders ? '1px solid #000' : 'none',
                    backgroundColor: block.attributes.shading?.fill !== 'clear' && block.attributes.shading?.color
                      ? block.attributes.shading.color
                      : 'transparent',
                  }}
                >
                  {block.content.map((content, contentIndex) => (
                    <span
                      key={content.id}
                      data-content-id={content.id}
                      data-content-index={contentIndex}
                      contentEditable={!readOnly && content.type === 'text'}
                      style={{
                        fontWeight: content.formatting.bold ? 'bold' : 'normal',
                        fontStyle: content.formatting.italic ? 'italic' : 'normal',
                        textDecoration: [
                          content.formatting.underline ? 'underline' : '',
                          content.formatting.strikethrough ? 'line-through' : '',
                        ].filter(Boolean).join(' ') || 'none',
                        fontFamily: content.formatting.fontFamily || 'inherit',
                        fontSize: content.formatting.fontSize ? `${content.formatting.fontSize}pt` : 'inherit',
                        color: content.formatting.color || 'inherit',
                        backgroundColor: content.formatting.backgroundColor || 'transparent',
                        verticalAlign: content.formatting.superscript ? 'super' : content.formatting.subscript ? 'sub' : 'baseline',
                      }}
                    >
                      {content.type === 'inlineImage' && content.imageData ? (
                        <img src={URL.createObjectURL(new Blob([content.imageData as unknown as ArrayBuffer]))} alt="Inserted image" style={{ maxWidth: '100%', height: 'auto' }} />
                      ) : (
                        content.text || (blockIndex === document.blocks.length - 1 && contentIndex === block.content.length - 1 ? '​' : '')
                      )}
                    </span>
                  ))}
                  {block.type === 'heading' && <span style={{ fontWeight: 'bold', fontSize: '1.5em' }}>{'#'.repeat(block.type === 'heading' && block.style?.includes('1') ? 1 : 2)} </span>}
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Link dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="p-6 rounded-lg" style={{ backgroundColor: toolbarBg, color: textColorTheme, minWidth: '400px' }}>
            <h3 className="text-lg font-medium mb-4">Insertar enlace</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://ejemplo.com"
              className="w-full p-2 mb-4 rounded border"
              style={{ backgroundColor: bgColor, color: textColorTheme, borderColor }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowLinkDialog(false); setLinkUrl(''); }} className="px-4 py-2 rounded" style={{ backgroundColor: borderColor, color: textColorTheme }}>Cancelar</button>
              <button onClick={handleAddLink} className="px-4 py-2 rounded" style={{ backgroundColor: theme === 'dark' ? '#3b82f6' : '#1a73e8', color: 'white' }}>Insertar</button>
            </div>
          </div>
        </div>
      )}

      {/* Styles Panel */}
      {stylesPanelOpen && (
        <StylesPanel
          styles={document.styles}
          onApplyStyle={handleApplyStyle}
          onCreateStyle={() => handleOpenStyleEditor(null, 'create')}
          onEditStyle={(style) => handleOpenStyleEditor(style, 'edit')}
          onOpenTemplates={handleOpenTemplatesDialog}
          onOpenManageStyles={handleOpenManageStylesDialog}
          onClose={() => setStylesPanelOpen(false)}
        />
      )}

      {/* Style Editor Dialog */}
      {styleEditorOpen && (
        <StyleEditorDialog
          style={styleEditorStyle}
          mode={styleEditorMode}
          existingStyles={document.styles}
          onSave={handleStyleEditorSave}
          onClose={handleStyleEditorClose}
        />
      )}

      {/* Templates Dialog */}
      {templatesDialogOpen && (
        <TemplatesDialog
          currentStyles={document.styles}
          onLoadTemplate={handleTemplatesLoad}
          onSaveTemplate={handleSaveAsTemplate}
          onClose={() => setTemplatesDialogOpen(false)}
        />
      )}

      {/* Manage Styles Dialog */}
      {manageStylesDialogOpen && (
        <ManageStylesDialog
          styles={document.styles}
          onReorder={handleManageStylesReorder}
          onBulkHide={handleManageStylesBulkHide}
          onBulkDelete={handleManageStylesBulkDelete}
          onEdit={handleManageStylesEdit}
          onClose={() => setManageStylesDialogOpen(false)}
        />
      )}
    </div>
  );
});

WriterEditor.displayName = 'WriterEditor';
export default WriterEditor;