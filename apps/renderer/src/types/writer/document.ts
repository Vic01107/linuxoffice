export interface WriterDocumentState {
  fileBytes: Uint8Array | null;
  fileName: string;
  blocks: WriterBlock[];
  styles: WriterStyle[];
  settings: WriterSettings;
  isDirty: boolean;
  isReadOnly: boolean;
}

export interface WriterBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'image' | 'pageBreak' | 'sectionBreak';
  content: WriterContent[];
  style?: string;
  attributes: WriterBlockAttributes;
  children?: WriterBlock[];
}

export interface WriterContent {
  id: string;
  type: 'text' | 'hyperlink' | 'field' | 'inlineImage';
  text: string;
  formatting: WriterFormatting;
  link?: string;
  imageData?: Uint8Array;
}

export interface WriterFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  superscript?: boolean;
  subscript?: boolean;
  language?: string;
}

export interface WriterBlockAttributes {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  indentation?: {
    left?: number;
    right?: number;
    firstLine?: number;
    hanging?: number;
  };
  spacing?: {
    before?: number;
    after?: number;
    line?: number;
    lineRule?: 'auto' | 'exact' | 'atLeast';
  };
  borders?: WriterBorders;
  shading?: WriterShading;
  numbering?: {
    level: number;
    numId: string;
  };
  pageBreakBefore?: boolean;
  keepWithNext?: boolean;
  keepLinesTogether?: boolean;
  widowControl?: boolean;
  formatting?: WriterFormatting;
}

export interface WriterBorder {
  style: 'none' | 'single' | 'double' | 'dashed' | 'dotted' | 'thick' | 'wave';
  size: number;
  color: string;
  space?: number;
}

export interface WriterBorders {
  top?: WriterBorder;
  bottom?: WriterBorder;
  left?: WriterBorder;
  right?: WriterBorder;
  between?: WriterBorder;
}

export interface WriterShading {
  fill: string;
  color?: string;
  pattern?: 'clear' | 'solid' | 'pct5' | 'pct10' | 'pct20' | 'pct25' | 'pct30' | 'pct40' | 'pct50' | 'pct60' | 'pct70' | 'pct75' | 'pct80' | 'pct90';
}

export interface WriterStyle {
  id: string;
  name: string;
  type: 'paragraph' | 'character' | 'table' | 'numbering';
  basedOn?: string;
  next?: string;
  formatting: WriterFormatting;
  paragraphAttributes?: WriterBlockAttributes;
  hidden?: boolean;
  locked?: boolean;
}

export interface WriterSettings {
  defaultTabStop: number;
  autoHyphenation: boolean;
  trackChanges: boolean;
  viewMode: 'print' | 'web' | 'draft';
  zoom: number;
  showFormatting: boolean;
  showRulers: boolean;
  showGridlines: boolean;
  language: string;
  pageSize: {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
  };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    header: number;
    footer: number;
    gutter: number;
  };
}

export interface WriterSelection {
  anchor: WriterPosition;
  focus: WriterPosition;
  isCollapsed: boolean;
}

export interface WriterPosition {
  blockId: string;
  contentIndex: number;
  offset: number;
}

export interface WriterTable {
  rows: WriterTableRow[];
  properties: WriterTableProperties;
}

export interface WriterTableRow {
  cells: WriterTableCell[];
  properties: WriterTableRowProperties;
}

export interface WriterTableCell {
  blocks: WriterBlock[];
  properties: WriterTableCellProperties;
}

export interface WriterTableProperties {
  width?: { value: number; type: 'dxa' | 'pct' };
  alignment?: 'left' | 'center' | 'right';
  borders?: WriterBorders;
  shading?: WriterShading;
  layout?: 'fixed' | 'autofit';
  cellSpacing?: number;
  cellMargin?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface WriterTableRowProperties {
  height?: { value: number; rule: 'auto' | 'exact' | 'atLeast' };
  cantSplit?: boolean;
  header?: boolean;
}

export interface WriterTableCellProperties {
  width?: { value: number; type: 'dxa' | 'pct' };
  verticalAlignment?: 'top' | 'center' | 'bottom';
  borders?: WriterBorders;
  shading?: WriterShading;
  margins?: { top: number; bottom: number; left: number; right: number };
}

export interface WriterListLevel {
  level: number;
  start: number;
  format: 'decimal' | 'lowerLetter' | 'upperLetter' | 'lowerRoman' | 'upperRoman' | 'bullet' | 'none';
  text: string;
  alignment: 'left' | 'center' | 'right';
  formatting: WriterFormatting;
  indentation: { left: number; hanging: number };
}

export interface WriterNumberingDefinition {
  id: string;
  name: string;
  levels: WriterListLevel[];
}

export interface WriterEditorRef {
  loadFile: (file: File | Uint8Array) => Promise<void>;
  save: () => Promise<Uint8Array>;
}