import { useState, useMemo, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import * as Label from '@radix-ui/react-label';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Separator from '@radix-ui/react-separator';
import { X, Save, Trash2, Palette } from 'lucide-react';
import {
  WriterStyle,
  WriterFormatting,
  WriterBlockAttributes,
  WriterTableProperties,
  WriterTableCellProperties,
} from '../../types/writer/document';
import { cn } from '../../lib/utils';

interface StyleEditorDialogProps {
  style: WriterStyle | null;
  mode: 'create' | 'edit';
  existingStyles: WriterStyle[];
  onSave: (style: WriterStyle) => void;
  onClose: () => void;
}

const FONT_FAMILIES = [
  'Calibri', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Roboto', 'Open Sans', 'Lato',
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;

const LINE_RULES = ['auto', 'exact', 'atLeast'] as const;

const VERTICAL_ALIGNMENTS = ['top', 'center', 'bottom'] as const;

const TABLE_LAYOUTS = ['fixed', 'autofit'] as const;

const WIDTH_TYPES = ['dxa', 'pct'] as const;

function createDefaultFormatting(): WriterFormatting {
  return {
    fontFamily: 'Calibri',
    fontSize: 11,
    color: '#000000',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    superscript: false,
    subscript: false,
  };
}

function createDefaultParagraphAttributes(): WriterBlockAttributes {
  return {
    alignment: 'left',
    indentation: { left: 0, right: 0, firstLine: 0, hanging: 0 },
    spacing: { before: 0, after: 120, line: 240, lineRule: 'auto' },
    borders: {},
    shading: { fill: 'clear' },
  };
}

function createDefaultTableProperties(): WriterTableProperties {
  return {
    width: { value: 5000, type: 'pct' },
    alignment: 'left',
    layout: 'autofit',
    cellSpacing: 0,
    borders: {},
    shading: { fill: 'clear' },
    cellMargin: { top: 0, bottom: 0, left: 54, right: 54 },
  };
}

export function StyleEditorDialog({
  style,
  mode,
  existingStyles,
  onSave,
  onClose,
}: StyleEditorDialogProps) {
  const isEditing = mode === 'edit';
  const allStyles = existingStyles;

  const [formatting, setFormatting] = useState<WriterFormatting>(() =>
    style?.formatting ? { ...style.formatting } : createDefaultFormatting()
  );
  const [paragraphAttrs, setParagraphAttrs] = useState<WriterBlockAttributes>(() =>
    style?.paragraphAttributes ? { ...style.paragraphAttributes } : createDefaultParagraphAttributes()
  );
  const [tableProps, setTableProps] = useState<WriterTableProperties>(() =>
    style?.type === 'table' && style.paragraphAttributes
    // Note: table styles use different properties - simplified for now
    // Real implementation would have table-specific properties in style
    ? { ...createDefaultTableProperties() }
    : createDefaultTableProperties()
  );
  const [name, setName] = useState(style?.name || '');
  const [type, setType] = useState<WriterStyle['type']>(style?.type || 'paragraph');
  const [basedOn, setBasedOn] = useState(style?.basedOn || '');
  const [nextStyle, setNextStyle] = useState(style?.next || '');
  const [hidden, setHidden] = useState(style?.hidden || false);
  const [activeTab, setActiveTab] = useState<'font' | 'paragraph' | 'table' | 'advanced'>('font');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter styles for basedOn/next selects
  const sameTypeStyles = useMemo(() =>
    allStyles.filter(s => s.type === type && s.id !== style?.id),
    [allStyles, type, style?.id]
  );

  const paragraphStyles = useMemo(() =>
    allStyles.filter(s => s.type === 'paragraph' && s.id !== style?.id),
    [allStyles, style?.id]
  );

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (allStyles.some(s => s.name === name && s.id !== style?.id)) {
      newErrors.name = 'Ya existe un estilo con este nombre';
    }
    if (basedOn && !allStyles.some(s => s.id === basedOn)) {
      newErrors.basedOn = 'El estilo base no existe';
    }
    // Check circular reference
    if (basedOn) {
      let current = basedOn;
      const visited = new Set<string>();
      while (current && !visited.has(current)) {
        visited.add(current);
        const baseStyle = allStyles.find(s => s.id === current);
        current = baseStyle?.basedOn || '';
        if (current === style?.id) {
          newErrors.basedOn = 'Referencia circular detectada';
          break;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const newStyle: WriterStyle = {
      id: style?.id || crypto.randomUUID(),
      name: name.trim(),
      type,
      formatting,
      paragraphAttributes: type === 'paragraph' || type === 'numbering' ? paragraphAttrs : undefined,
      basedOn: basedOn || undefined,
      next: nextStyle || undefined,
      hidden,
      locked: false, // User styles are never locked
    };

    onSave(newStyle);
    onClose();
  };

  // Font tab content
  const FontTab = () => (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Nombre</Label.Root>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              'w-full px-2 py-1.5 text-sm border rounded',
              'focus:outline-none focus:ring-1 focus:ring-blue-500',
              errors.name && 'border-red-500'
            )}
            placeholder="Nombre del estilo"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Tipo</Label.Root>
          <Select.Root value={type} onValueChange={(v: WriterStyle['type']) => setType(v)}>
            <Select.Trigger className="w-full">
              <Select.Value placeholder="Seleccionar tipo" className="text-sm" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="w-full">
                <Select.Item value="paragraph" className="px-2 py-1.5 text-sm">Párrafo</Select.Item>
                <Select.Item value="character" className="px-2 py-1.5 text-sm">Carácter</Select.Item>
                <Select.Item value="table" className="px-2 py-1.5 text-sm">Tabla</Select.Item>
                <Select.Item value="numbering" className="px-2 py-1.5 text-sm">Lista</Select.Item>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      <Separator.Root className="my-2" />

      <div>
        <Label.Root className="block text-sm font-medium mb-1">Basado en</Label.Root>
        <Select.Root value={basedOn} onValueChange={setBasedOn}>
          <Select.Trigger className="w-full">
            <Select.Value placeholder="(ninguno)" className="text-sm" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="w-full">
              <Select.Item value="" className="px-2 py-1.5 text-sm">(ninguno)</Select.Item>
              {sameTypeStyles.map(s => (
                <Select.Item key={s.id} value={s.id} className="px-2 py-1.5 text-sm">{s.name}</Select.Item>
              ))}
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {errors.basedOn && <p className="text-red-500 text-xs mt-1">{errors.basedOn}</p>}
      </div>

      {type === 'paragraph' && (
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Siguiente estilo</Label.Root>
          <Select.Root value={nextStyle} onValueChange={setNextStyle}>
            <Select.Trigger className="w-full">
              <Select.Value placeholder="(mismo estilo)" className="text-sm" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="w-full">
                <Select.Item value="" className="px-2 py-1.5 text-sm">(mismo estilo)</Select.Item>
                {paragraphStyles.map(s => (
                  <Select.Item key={s.id} value={s.id} className="px-2 py-1.5 text-sm">{s.name}</Select.Item>
                ))}
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Checkbox.Root
          checked={hidden}
          onCheckedChange={(checked: boolean) => setHidden(checked)}
          className="flex items-center gap-1.5"
        >
          <Checkbox.Indicator className="w-4 h-4 border-gray-300 rounded">
            <span className="flex items-center justify-center text-[12px] text-white">✓</span>
          </Checkbox.Indicator>
          <Label.Root className="text-sm">Oculto en panel</Label.Root>
        </Checkbox.Root>
      </div>

      {isEditing && style?.locked && (
        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
          Este es un estilo integrado. No se puede eliminar ni bloquear.
        </div>
      )}
    </div>
  );

  // Paragraph tab content
  const ParagraphTab = () => (
    <div className="space-y-4 p-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Fuente</Label.Root>
          <Select.Root value={formatting.fontFamily || 'Calibri'} onValueChange={v => setFormatting(f => ({ ...f, fontFamily: v }))}>
            <Select.Trigger className="w-full"><Select.Value className="text-sm" /></Select.Trigger>
            <Select.Portal><Select.Content className="w-full max-h-60">
              {FONT_FAMILIES.map(f => <Select.Item key={f} value={f} className="px-2 py-1.5 text-sm" style={{ fontFamily: f }}>{f}</Select.Item>)}
            </Select.Content></Select.Portal>
          </Select.Root>
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Tamaño</Label.Root>
          <Select.Root value={String(formatting.fontSize || 11)} onValueChange={v => setFormatting(f => ({ ...f, fontSize: Number(v) }))}>
            <Select.Trigger className="w-full"><Select.Value className="text-sm" /></Select.Trigger>
            <Select.Portal><Select.Content className="w-full max-h-60">
              {FONT_SIZES.map(s => <Select.Item key={s} value={String(s)} className="px-2 py-1.5 text-sm">{s} pt</Select.Item>)}
            </Select.Content></Select.Portal>
          </Select.Root>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Color</Label.Root>
          <input
            type="color"
            value={formatting.color || '#000000'}
            onChange={(e) => setFormatting(f => ({ ...f, color: e.target.value }))}
            className="w-full h-8 border rounded cursor-pointer"
          />
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Color fondo</Label.Root>
          <input
            type="color"
            value={formatting.backgroundColor || '#ffffff'}
            onChange={(e) => setFormatting(f => ({ ...f, backgroundColor: e.target.value }))}
            className="w-full h-8 border rounded cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox.Root checked={formatting.bold} onCheckedChange={(v: boolean) => setFormatting(f => ({ ...f, bold: v }))}>
            <Checkbox.Indicator className="w-4 h-4 border-gray-300 rounded"><span className="flex items-center justify-center text-[12px]">✓</span></Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm font-bold">Negrita</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox.Root checked={formatting.italic} onCheckedChange={(v: boolean) => setFormatting(f => ({ ...f, italic: v }))}>
            <Checkbox.Indicator className="w-4 h-4 border-gray-300 rounded"><span className="flex items-center justify-center text-[12px]">✓</span></Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm font-italic">Cursiva</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox.Root checked={formatting.underline} onCheckedChange={(v: boolean) => setFormatting(f => ({ ...f, underline: v }))}>
            <Checkbox.Indicator className="w-4 h-4 border-gray-300 rounded"><span className="flex items-center justify-center text-[12px]">✓</span></Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm underline">Subrayado</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox.Root checked={formatting.strikethrough} onCheckedChange={(v: boolean) => setFormatting(f => ({ ...f, strikethrough: v }))}>
            <Checkbox.Indicator className="w-4 h-4 border-gray-300 rounded"><span className="flex items-center justify-center text-[12px]">✓</span></Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm line-through">Tachado</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox.Root checked={formatting.superscript} onCheckedChange={(v: boolean) => setFormatting(f => ({ ...f, superscript: v }))}>
            <Checkbox.Indicator className="w-4 h-4 border-gray-300 rounded"><span className="flex items-center justify-center text-[12px]">✓</span></Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm"><sup>Superíndice</sup></span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox.Root checked={formatting.subscript} onCheckedChange={(v: boolean) => setFormatting(f => ({ ...f, subscript: v }))}>
            <Checkbox.Indicator className="w-4 h-4 border-gray-300 rounded"><span className="flex items-center justify-center text-[12px]">✓</span></Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm"><sub>Subíndice</sub></span>
        </label>
      </div>

      <Separator.Root className="my-2" />

      <div>
        <Label.Root className="block text-sm font-medium mb-1">Alineación</Label.Root>
        <Select.Root value={paragraphAttrs.alignment || 'left'} onValueChange={(v: 'left' | 'center' | 'right' | 'justify') => setParagraphAttrs(p => ({ ...p, alignment: v }))}>
          <Select.Trigger className="w-full"><Select.Value className="text-sm" /></Select.Trigger>
          <Select.Portal><Select.Content className="w-full">
            <Select.Item value="left" className="px-2 py-1.5 text-sm">Izquierda</Select.Item>
            <Select.Item value="center" className="px-2 py-1.5 text-sm">Centrado</Select.Item>
            <Select.Item value="right" className="px-2 py-1.5 text-sm">Derecha</Select.Item>
            <Select.Item value="justify" className="px-2 py-1.5 text-sm">Justificado</Select.Item>
          </Select.Content></Select.Portal>
        </Select.Root>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Sangría izq (pt)</Label.Root>
          <input type="number" value={paragraphAttrs.indentation?.left ? paragraphAttrs.indentation.left / 20 : 0} onChange={e => setParagraphAttrs(p => ({ ...p, indentation: { ...p.indentation, left: Number(e.target.value) * 20 } }))} className="w-full px-2 py-1.5 text-sm border rounded" step="0.5" />
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Sangría der (pt)</Label.Root>
          <input type="number" value={paragraphAttrs.indentation?.right ? paragraphAttrs.indentation.right / 20 : 0} onChange={e => setParagraphAttrs(p => ({ ...p, indentation: { ...p.indentation, right: Number(e.target.value) * 20 } }))} className="w-full px-2 py-1.5 text-sm border rounded" step="0.5" />
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Primera línea (pt)</Label.Root>
          <input type="number" value={paragraphAttrs.indentation?.firstLine ? paragraphAttrs.indentation.firstLine / 20 : 0} onChange={e => setParagraphAttrs(p => ({ ...p, indentation: { ...p.indentation, firstLine: Number(e.target.value) * 20 } }))} className="w-full px-2 py-1.5 text-sm border rounded" step="0.5" />
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Colgante (pt)</Label.Root>
          <input type="number" value={paragraphAttrs.indentation?.hanging ? paragraphAttrs.indentation.hanging / 20 : 0} onChange={e => setParagraphAttrs(p => ({ ...p, indentation: { ...p.indentation, hanging: Number(e.target.value) * 20 } }))} className="w-full px-2 py-1.5 text-sm border rounded" step="0.5" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Antes (pt)</Label.Root>
          <input type="number" value={paragraphAttrs.spacing?.before ? paragraphAttrs.spacing.before / 20 : 0} onChange={e => setParagraphAttrs(p => ({ ...p, spacing: { ...p.spacing, before: Number(e.target.value) * 20 } }))} className="w-full px-2 py-1.5 text-sm border rounded" step="0.5" />
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Después (pt)</Label.Root>
          <input type="number" value={paragraphAttrs.spacing?.after ? paragraphAttrs.spacing.after / 20 : 0} onChange={e => setParagraphAttrs(p => ({ ...p, spacing: { ...p.spacing, after: Number(e.target.value) * 20 } }))} className="w-full px-2 py-1.5 text-sm border rounded" step="0.5" />
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Interlineado</Label.Root>
          <input type="number" value={paragraphAttrs.spacing?.line ? paragraphAttrs.spacing.line / 20 : 12} onChange={e => setParagraphAttrs(p => ({ ...p, spacing: { ...p.spacing, line: Number(e.target.value) * 20 } }))} className="w-full px-2 py-1.5 text-sm border rounded" step="0.5" />
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Regla</Label.Root>
          <Select.Root value={paragraphAttrs.spacing?.lineRule || 'auto'} onValueChange={(v: 'auto' | 'exact' | 'atLeast') => setParagraphAttrs(p => ({ ...p, spacing: { ...p.spacing, lineRule: v } }))}>
            <Select.Trigger className="w-full"><Select.Value className="text-sm" /></Select.Trigger>
            <Select.Portal><Select.Content className="w-full">
              <Select.Item value="auto" className="px-2 py-1.5 text-sm">Auto</Select.Item>
              <Select.Item value="exact" className="px-2 py-1.5 text-sm">Exacto</Select.Item>
              <Select.Item value="atLeast" className="px-2 py-1.5 text-sm">Mínimo</Select.Item>
            </Select.Content></Select.Portal>
          </Select.Root>
        </div>
      </div>
    </div>
  );

  // Table tab content (only for table type)
  const TableTab = () => (
    <div className="space-y-4 p-4" style={{ display: type === 'table' ? 'block' : 'none' }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Ancho</Label.Root>
          <div className="flex gap-2">
            <input type="number" value={tableProps.width?.value || 5000} onChange={e => setTableProps(t => ({ ...t, width: { ...t.width!, value: Number(e.target.value) } }))} className="w-full px-2 py-1.5 text-sm border rounded" />
            <Select.Root value={tableProps.width?.type || 'pct'} onValueChange={(v: 'pct' | 'dxa') => setTableProps(t => ({ ...t, width: { ...t.width!, type: v } }))}>
              <Select.Trigger className="w-24"><Select.Value className="text-sm" /></Select.Trigger>
              <Select.Portal><Select.Content className="w-24">
                <Select.Item value="pct" className="px-2 py-1.5 text-sm">%</Select.Item>
                <Select.Item value="dxa" className="px-2 py-1.5 text-sm">Twips</Select.Item>
              </Select.Content></Select.Portal>
            </Select.Root>
          </div>
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Alineación</Label.Root>
          <Select.Root value={tableProps.alignment || 'left'} onValueChange={v => setTableProps(t => ({ ...t, alignment: v as any }))}>
            <Select.Trigger className="w-full"><Select.Value className="text-sm" /></Select.Trigger>
            <Select.Portal><Select.Content className="w-full">
              <Select.Item value="left" className="px-2 py-1.5 text-sm">Izquierda</Select.Item>
              <Select.Item value="center" className="px-2 py-1.5 text-sm">Centro</Select.Item>
              <Select.Item value="right" className="px-2 py-1.5 text-sm">Derecha</Select.Item>
            </Select.Content></Select.Portal>
          </Select.Root>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Layout</Label.Root>
          <Select.Root value={tableProps.layout || 'autofit'} onValueChange={(v: 'fixed' | 'autofit') => setTableProps(t => ({ ...t, layout: v }))}>
            <Select.Trigger className="w-full"><Select.Value className="text-sm" /></Select.Trigger>
            <Select.Portal><Select.Content className="w-full">
              <Select.Item value="autofit" className="px-2 py-1.5 text-sm">Autoajustar</Select.Item>
              <Select.Item value="fixed" className="px-2 py-1.5 text-sm">Fijo</Select.Item>
            </Select.Content></Select.Portal>
          </Select.Root>
        </div>
        <div>
          <Label.Root className="block text-sm font-medium mb-1">Espaciado celdas</Label.Root>
          <input type="number" value={tableProps.cellSpacing || 0} onChange={e => setTableProps(t => ({ ...t, cellSpacing: Number(e.target.value) }))} className="w-full px-2 py-1.5 text-sm border rounded" />
        </div>
      </div>
    </div>
  );

  // Preview
  const Preview = () => (
    <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
      <Label.Root className="block text-xs font-medium text-gray-500 mb-2">Vista previa</Label.Root>
      <div
        className="p-3 bg-white border border-gray-200 rounded min-h-[60px] font-sans"
        style={{
          fontFamily: formatting.fontFamily,
          fontSize: `${formatting.fontSize || 11}pt`,
          fontWeight: formatting.bold ? 'bold' : 'normal',
          fontStyle: formatting.italic ? 'italic' : 'normal',
          textDecoration: [
            formatting.underline ? 'underline' : '',
            formatting.strikethrough ? 'line-through' : '',
          ].filter(Boolean).join(' ') || 'none',
          color: formatting.color,
          backgroundColor: formatting.backgroundColor,
          textAlign: paragraphAttrs.alignment,
          paddingLeft: paragraphAttrs.indentation?.left ? `${paragraphAttrs.indentation.left / 20}pt` : 0,
        }}
      >
        {name || 'Nombre del estilo'} — Texto de ejemplo con el formato aplicado.
      </div>
    </div>
  );

  return (
    <Dialog.Root>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[700px] max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold">
              {isEditing ? 'Modificar estilo' : 'Nuevo estilo'}
              <Palette className="w-5 h-5 inline-block ml-1" />
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <Tabs.Root value={activeTab} onValueChange={(v: 'font' | 'paragraph' | 'table' | 'advanced') => setActiveTab(v)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs.List className="flex border-b border-gray-200 bg-gray-50 px-2">
              <Tabs.Trigger value="font" className="px-3 py-2 text-sm font-medium rounded-t hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">General</Tabs.Trigger>
              <Tabs.Trigger value="paragraph" className="px-3 py-2 text-sm font-medium rounded-t hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">Párrafo</Tabs.Trigger>
              {type === 'table' && (
                <Tabs.Trigger value="table" className="px-3 py-2 text-sm font-medium rounded-t hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">Tabla</Tabs.Trigger>
              )}
            </Tabs.List>

            <div className="flex-1 overflow-auto">
              <Tabs.Content value="font" className="p-0"><FontTab /></Tabs.Content>
              <Tabs.Content value="paragraph" className="p-0"><ParagraphTab /></Tabs.Content>
              <Tabs.Content value="table" className="p-0"><TableTab /></Tabs.Content>
            </div>

            <Preview />
          </Tabs.Root>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <Dialog.Close asChild>
              <button className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100">Cancelar</button>
            </Dialog.Close>
            <button onClick={handleSave} disabled={!name.trim()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" />
              {isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default StyleEditorDialog;