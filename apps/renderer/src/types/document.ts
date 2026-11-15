import type { AppType } from './tab';

export type { AppType };

export interface DocumentContent {
  writer?: WriterDocument;
  calc?: CalcDocument;
  impress?: ImpressDocument;
  pdf?: PDFDocument;
}

export interface WriterDocument {
  blocks: WriterBlock[];
  styles: WriterStyles;
  settings: WriterSettings;
}

export interface WriterBlock {
  id: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list' | 'table' | 'image' | 'code' | 'blockquote';
  content: string;
  attributes: Record<string, unknown>;
  children?: WriterBlock[];
}

export interface WriterStyles {
  fonts: Record<string, string>;
  colors: Record<string, string>;
  spacing: Record<string, number>;
}

export interface WriterSettings {
  pageSize: 'A4' | 'Letter' | 'Legal';
  margins: { top: number; right: number; bottom: number; left: number };
  orientation: 'portrait' | 'landscape';
  language: string;
}

export interface CalcDocument {
  sheets: CalcSheet[];
  activeSheetId: string;
  definedNames: CalcDefinedName[];
}

export interface CalcSheet {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: Record<string, CalcCell>;
  merges: string[];
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
}

export interface CalcCell {
  value: string | number | boolean | null;
  formula?: string;
  format?: CalcFormat;
  style?: CalcStyle;
}

export interface CalcFormat {
  type: 'general' | 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'text' | 'scientific' | 'fraction' | 'custom';
  pattern?: string;
  locale?: string;
}

export interface CalcStyle {
  font?: { family?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean; color?: string };
  fill?: { type: 'none' | 'solid' | 'pattern'; color?: string; patternColor?: string };
  border?: { top?: CalcBorder; right?: CalcBorder; bottom?: CalcBorder; left?: CalcBorder };
  alignment?: { horizontal?: 'left' | 'center' | 'right' | 'justify'; vertical?: 'top' | 'middle' | 'bottom'; wrapText?: boolean; indent?: number };
}

export interface CalcBorder {
  style: 'none' | 'thin' | 'medium' | 'thick' | 'double' | 'dotted' | 'dashed' | 'hair';
  color?: string;
}

export interface CalcDefinedName {
  name: string;
  refersTo: string;
  comment?: string;
  scope?: string;
}

export interface ImpressDocument {
  slides: ImpressSlide[];
  masterSlides: ImpressMasterSlide[];
  theme: ImpressTheme;
  slideSize: { width: number; height: number };
}

export interface ImpressSlide {
  id: string;
  masterId?: string;
  elements: ImpressElement[];
  background?: ImpressBackground;
  transition?: ImpressTransition;
  notes?: string;
}

export interface ImpressMasterSlide {
  id: string;
  name: string;
  elements: ImpressElement[];
  background?: ImpressBackground;
}

export interface ImpressElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'table' | 'chart' | 'video' | 'audio' | 'connector';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  content?: string;
  style?: ImpressStyle;
  animation?: ImpressAnimation[];
}

export interface ImpressStyle {
  fill?: { type: 'none' | 'solid' | 'gradient' | 'pattern'; color?: string; gradient?: ImpressGradient };
  border?: { style: string; width: number; color: string };
  font?: { family: string; size: number; bold: boolean; italic: boolean; color: string; alignment: string };
  shadow?: { offsetX: number; offsetY: number; blur: number; color: string };
}

export interface ImpressGradient {
  type: 'linear' | 'radial';
  angle: number;
  stops: { position: number; color: string }[];
}

export interface ImpressBackground {
  type: 'solid' | 'gradient' | 'image' | 'pattern';
  color?: string;
  gradient?: ImpressGradient;
  image?: string;
}

export interface ImpressTransition {
  type: 'none' | 'fade' | 'slide' | 'push' | 'wipe' | 'split' | 'reveal' | 'random';
  direction?: 'left' | 'right' | 'up' | 'down' | 'horizontal' | 'vertical';
  duration: number;
  sound?: string;
}

export interface ImpressAnimation {
  type: 'entrance' | 'emphasis' | 'exit' | 'motionPath';
  effect: string;
  trigger: 'onClick' | 'withPrevious' | 'afterPrevious';
  delay: number;
  duration: number;
}

export interface ImpressTheme {
  name: string;
  colors: Record<string, string>;
  fonts: { heading: string; body: string };
  effects: Record<string, unknown>;
}

export interface PDFDocument {
  filePath: string;
  pageCount: number;
  pages: PDFPage[];
  metadata: PDFMetadata;
  bookmarks: PDFBookmark[];
  forms: PDFFormField[];
  annotations: PDFAnnotation[];
}

export interface PDFPage {
  index: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  annotations: PDFAnnotation[];
  links: PDFLink[];
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PDFBookmark {
  title: string;
  pageIndex: number;
  children?: PDFBookmark[];
}

export interface PDFFormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'combo' | 'list' | 'button' | 'signature';
  value: string | boolean | number;
  rect: { x: number; y: number; width: number; height: number };
  pageIndex: number;
  required: boolean;
  readonly: boolean;
}

export interface PDFAnnotation {
  id: string;
  type: 'text' | 'highlight' | 'underline' | 'strikethrough' | 'squiggly' | 'stamp' | 'ink' | 'file' | 'sound' | 'popup' | 'freeText' | 'line' | 'square' | 'circle' | 'polygon' | 'polyLine' | 'caret' | 'link' | 'movie' | 'widget' | 'screen' | 'printerMark' | 'trapNet' | 'watermark' | '3D' | 'richMedia';
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number };
  content?: string;
  color?: string;
  opacity?: number;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PDFLink {
  rect: { x: number; y: number; width: number; height: number };
  url?: string;
  pageIndex?: number;
  namedDest?: string;
}

export interface DocumentState {
  id: string;
  appType: AppType;
  filePath?: string;
  fileBytes?: Uint8Array;
  fileName?: string;
  content: DocumentContent;
  isDirty: boolean;
  isReadOnly: boolean;
  lastSaved?: number;
  version: number;
  undoStack: unknown[];
  redoStack: unknown[];
}