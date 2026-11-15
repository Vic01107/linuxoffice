import { ZipReader, ZipEntry, TextReader, TextWriter, Data64URIReader, Uint8ArrayReader, Uint8ArrayWriter, BlobReader, BlobWriter } from '@zip.js/zip.js';
import {
  WriterDocumentState,
  WriterBlock,
  WriterContent,
  WriterFormatting,
  WriterBlockAttributes,
  WriterStyle,
  WriterSettings,
  WriterTable,
  WriterTableRow,
  WriterTableCell,
  WriterNumberingDefinition,
  WriterListLevel,
  WriterBorders,
  WriterBorder,
  WriterShading,
  WriterTableProperties,
  WriterTableRowProperties,
  WriterTableCellProperties,
} from '../../types/writer/document';

interface DocxParsedData {
  blocks: WriterBlock[];
  styles: WriterStyle[];
  numbering: WriterNumberingDefinition[];
  settings: Partial<WriterSettings>;
  documentRels: Map<string, string>;
  images: Map<string, Uint8Array>;
}

const NAMESPACE = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  rels: 'http://schemas.openxmlformats.org/package/2006/relationships',
};

export class DocxParserService {
  private zipReader: ZipReader<BlobReader> | null = null;
  private documentRels = new Map<string, string>();
  private images = new Map<string, Uint8Array>();
  private styleMap = new Map<string, WriterStyle>();
  private numberingMap = new Map<string, WriterNumberingDefinition>();
  private abstractNumMap = new Map<string, any>();

  async parse(fileBytes: Uint8Array): Promise<WriterDocumentState> {
    const blob = new Blob([fileBytes as unknown as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    this.zipReader = new ZipReader(new BlobReader(blob));
    await this.zipReader.getEntries(); // Initialize

    await this.loadRelationships();
    await this.loadStyles();
    await this.loadNumbering();
    await this.loadImages();

    const documentXml = await this.readEntry('word/document.xml');
    const doc = new DOMParser().parseFromString(documentXml, 'application/xml');

    const blocks = this.parseBody(doc.documentElement);
    const settings = await this.parseSettings();

    return {
      fileBytes,
      fileName: 'document.docx',
      blocks,
      styles: Array.from(this.styleMap.values()),
      settings: { ...this.getDefaultSettings(), ...settings },
      isDirty: false,
      isReadOnly: false,
    };
  }

  private async loadRelationships(): Promise<void> {
    try {
      const relsXml = await this.readEntry('word/_rels/document.xml.rels');
      const doc = new DOMParser().parseFromString(relsXml, 'application/xml');
      const relationships = doc.querySelectorAll('Relationship');
      relationships.forEach((rel) => {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        const type = rel.getAttribute('Type');
        if (id && target) {
          this.documentRels.set(id, `word/${target.replace(/^\//, '')}`);
        }
      });
    } catch {
      // Relationships optional
    }
  }

  private async loadStyles(): Promise<void> {
    try {
      const stylesXml = await this.readEntry('word/styles.xml');
      const doc = new DOMParser().parseFromString(stylesXml, 'application/xml');
      const styles = doc.querySelectorAll('style');

      styles.forEach((style) => {
        const styleId = style.getAttribute('styleId') || '';
        const name = style.querySelector('name')?.getAttribute('val') || styleId;
        const type = (style.getAttribute('type') as WriterStyle['type']) || 'paragraph';
        const basedOn = style.querySelector('basedOn')?.getAttribute('val');
        const next = style.querySelector('next')?.getAttribute('val');
        const hidden = style.querySelector('hidden') !== null;
        const locked = style.querySelector('locked') !== null;

        // Parse formatting based on style type
        let formatting: WriterFormatting = {};
        let paragraphAttributes: WriterBlockAttributes | undefined;

        if (type === 'character') {
          // Character styles only have rPr (run properties)
          formatting = this.parseFormatting(style.querySelector('rPr'));
        } else if (type === 'table') {
          // Table styles have tblPr (table properties)
          // For now, store empty formatting; table properties handled separately
          formatting = this.parseFormatting(style.querySelector('rPr'));
          paragraphAttributes = this.parseTableStyleProperties(style.querySelector('tblPr'));
        } else if (type === 'numbering') {
          // Numbering styles reference numbering definitions - handled in loadNumbering
          formatting = this.parseFormatting(style.querySelector('rPr'));
        } else {
          // Paragraph styles have both pPr and rPr
          formatting = this.parseFormatting(style.querySelector('rPr'));
          paragraphAttributes = this.parseParagraphAttributes(style.querySelector('pPr'));
        }

        if (styleId) {
          this.styleMap.set(styleId, {
            id: styleId,
            name,
            type,
            basedOn: basedOn || undefined,
            next: next || undefined,
            formatting,
            paragraphAttributes,
            hidden,
            locked,
          });
        }
      });
    } catch {
      // Styles optional
    }
  }

  private parseTableStyleProperties(element: Element | null): WriterBlockAttributes {
    if (!element) return {};

    const jc = element.querySelector('jc')?.getAttribute('val') as WriterBlockAttributes['alignment'];
    const ind = element.querySelector('ind');
    const spacingEl = element.querySelector('spacing');
    const tblBdr = element.querySelector('tblBorders');
    const shd = element.querySelector('shd');

    const spacingAttrs = spacingEl ? {
      before: parseInt(spacingEl.getAttribute('before') || '0', 10),
      after: parseInt(spacingEl.getAttribute('after') || '0', 10),
      line: parseInt(spacingEl.getAttribute('line') || '0', 10),
      lineRule: (spacingEl.getAttribute('lineRule') as 'auto' | 'exact' | 'atLeast') || 'auto',
    } : undefined;

    return {
      alignment: jc || 'left',
      indentation: ind ? {
        left: parseInt(ind.getAttribute('left') || '0', 10),
        right: parseInt(ind.getAttribute('right') || '0', 10),
        firstLine: parseInt(ind.getAttribute('firstLine') || '0', 10),
        hanging: parseInt(ind.getAttribute('hanging') || '0', 10),
      } : undefined,
      spacing: spacingAttrs,
      borders: tblBdr ? this.parseBorders(tblBdr) : undefined,
      shading: shd ? this.parseShading(shd) : undefined,
    };
  }

  private async loadNumbering(): Promise<void> {
    try {
      const numberingXml = await this.readEntry('word/numbering.xml');
      const doc = new DOMParser().parseFromString(numberingXml, 'application/xml');

      const abstractNums = doc.querySelectorAll('abstractNum');
      abstractNums.forEach((abstractNum) => {
        const abstractNumId = abstractNum.getAttribute('abstractNumId');
        if (abstractNumId) {
          this.abstractNumMap.set(abstractNumId, abstractNum);
        }
      });

      const numElements = doc.querySelectorAll('num');
      numElements.forEach((num) => {
        const numId = num.getAttribute('numId');
        const abstractNumId = num.querySelector('abstractNumId')?.getAttribute('val');
        const name = num.querySelector('name')?.getAttribute('val') || `List ${numId || ''}`;

        if (numId && abstractNumId) {
          const abstractNum = this.abstractNumMap.get(abstractNumId);
          if (abstractNum) {
            this.numberingMap.set(numId, this.parseNumberingDefinition(numId, name, abstractNum));
          }
        }
      });
    } catch {
      // Numbering optional
    }
  }

  private parseNumberingDefinition(numId: string, name: string, abstractNum: Element): WriterNumberingDefinition {
    const levels: WriterListLevel[] = [];
    const levelElements = abstractNum.querySelectorAll('lvl');

    levelElements.forEach((levelEl) => {
      const level = parseInt(levelEl.getAttribute('ilvl') || '0', 10);
      const start = parseInt(levelEl.querySelector('start')?.getAttribute('val') || '1', 10);
      const format = (levelEl.querySelector('numFmt')?.getAttribute('val') as WriterListLevel['format']) || 'decimal';
      const text = levelEl.querySelector('lvlText')?.getAttribute('val') || '';
      const alignment = (levelEl.querySelector('lvlJc')?.getAttribute('val') as WriterListLevel['alignment']) || 'left';

      const formatting = this.parseFormatting(levelEl.querySelector('rPr'));
      const indentation = {
        left: parseInt(levelEl.querySelector('ind')?.getAttribute('left') || '0', 10),
        hanging: parseInt(levelEl.querySelector('ind')?.getAttribute('hanging') || '0', 10),
      };

      levels.push({ level, start, format, text, alignment, formatting, indentation });
    });

    return { id: numId, name, levels };
  }

  private async loadImages(): Promise<void> {
    if (!this.zipReader) return;

    const entries = await this.zipReader.getEntries();
    for (const entry of entries) {
      if (entry.filename.startsWith('word/media/') && !entry.directory) {
        const writer = new Uint8ArrayWriter();
        const data = await entry.getData(writer);
        const imageName = entry.filename.replace('word/media/', '');
        this.images.set(imageName, data);
      }
    }
  }

  private async parseSettings(): Promise<Partial<WriterSettings>> {
    try {
      const settingsXml = await this.readEntry('word/settings.xml');
      const doc = new DOMParser().parseFromString(settingsXml, 'application/xml');

      const defaultTabStop = parseInt(doc.querySelector('defaultTabStop')?.getAttribute('val') || '720', 10);
      const autoHyphenation = doc.querySelector('autoHyphenation') !== null;

      const pageSize = doc.querySelector('pgSz');
      const pageMargins = doc.querySelector('pgMar');

      return {
        defaultTabStop,
        autoHyphenation,
        pageSize: pageSize ? {
          width: parseInt(pageSize.getAttribute('w') || '12240', 10),
          height: parseInt(pageSize.getAttribute('h') || '15840', 10),
          orientation: (pageSize.getAttribute('orient') as 'portrait' | 'landscape') || 'portrait',
        } : undefined,
        margins: pageMargins ? {
          top: parseInt(pageMargins.getAttribute('top') || '1440', 10),
          bottom: parseInt(pageMargins.getAttribute('bottom') || '1440', 10),
          left: parseInt(pageMargins.getAttribute('left') || '1440', 10),
          right: parseInt(pageMargins.getAttribute('right') || '1440', 10),
          header: parseInt(pageMargins.getAttribute('header') || '720', 10),
          footer: parseInt(pageMargins.getAttribute('footer') || '720', 10),
          gutter: parseInt(pageMargins.getAttribute('gutter') || '0', 10),
        } : undefined,
      };
    } catch {
      return {};
    }
  }

  private getDefaultSettings(): WriterSettings {
    return {
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
  }

  private async readEntry(path: string): Promise<string> {
    if (!this.zipReader) throw new Error('Zip reader not initialized');
    const entries = await this.zipReader.getEntries();
    const entry = entries.find(e => e.filename === path && !e.directory);
    if (!entry || entry.directory) throw new Error(`Entry not found: ${path}`);
    return entry.getData(new TextWriter());
  }

  private parseBody(body: Element): WriterBlock[] {
    const blocks: WriterBlock[] = [];
    const children = Array.from(body.children);

    for (const child of children) {
      const block = this.parseBlock(child);
      if (block) blocks.push(block);
    }

    return blocks;
  }

  private parseBlock(element: Element): WriterBlock | null {
    const tagName = element.tagName.split('}').pop()?.toLowerCase();

    switch (tagName) {
      case 'p':
        return this.parseParagraph(element);
      case 'tbl':
        return this.parseTable(element);
      case 'pPr':
        return null;
      default:
        console.warn(`Unknown block type: ${tagName}`);
        return null;
    }
  }

  private parseParagraph(element: Element): WriterBlock {
    const pPr = element.querySelector('pPr');
    const style = pPr?.querySelector('pStyle')?.getAttribute('val');
    const attributes = this.parseParagraphAttributes(pPr);
    const numbering = this.parseNumbering(pPr);

    const content: WriterContent[] = [];
    const runs = element.querySelectorAll('r');

    runs.forEach((run) => {
      const runContent = this.parseRun(run);
      if (runContent) content.push(runContent);
    });

    if (content.length === 0) {
      content.push({
        id: crypto.randomUUID(),
        type: 'text',
        text: '',
        formatting: {},
      });
    }

    return {
      id: crypto.randomUUID(),
      type: this.inferBlockType(style, attributes),
      content,
      style: style ?? undefined,
      attributes: { ...attributes, numbering },
    };
  }

  private inferBlockType(style?: string | null, attributes?: WriterBlockAttributes): WriterBlock['type'] {
    if (!style) return 'paragraph';
    const styleDef = this.styleMap.get(style);
    if (styleDef?.type === 'paragraph') {
      if (style.toLowerCase().includes('heading')) return 'heading';
      if (style.toLowerCase().includes('list')) return 'list';
    }
    if (attributes?.numbering) return 'list';
    return 'paragraph';
  }

  private parseRun(element: Element): WriterContent | null {
    const rPr = element.querySelector('rPr');
    const formatting = this.parseFormatting(rPr);

    const textNodes = element.querySelectorAll('t');
    let text = '';
    textNodes.forEach((t) => {
      const space = t.getAttribute('xml:space');
      text += space === 'preserve' ? t.textContent || '' : (t.textContent || '').replace(/\s+/g, ' ');
    });

    const hyperlink = element.closest('hyperlink');
    const linkId = hyperlink?.getAttribute('r:id');
    const link = linkId ? this.documentRels.get(linkId) : undefined;

    const drawing = element.querySelector('drawing');
    let imageData: Uint8Array | undefined;
    if (drawing) {
      const blip = drawing.querySelector('blip');
      const embedId = blip?.getAttribute('r:embed');
      if (embedId && this.documentRels.has(embedId)) {
        const imagePath = this.documentRels.get(embedId);
        if (imagePath) {
          const imageName = imagePath.replace('word/media/', '');
          imageData = this.images.get(imageName);
        }
      }
    }

    if (!text && !imageData) return null;

    return {
      id: crypto.randomUUID(),
      type: imageData ? 'inlineImage' : 'text',
      text,
      formatting,
      link,
      imageData,
    };
  }

  private parseFormatting(element: Element | null): WriterFormatting {
    if (!element) return {};

    return {
      bold: element.querySelector('b') !== null,
      italic: element.querySelector('i') !== null,
      underline: element.querySelector('u') !== null,
      strikethrough: element.querySelector('strike') !== null,
      fontFamily: element.querySelector('rFonts')?.getAttribute('ascii') || undefined,
      fontSize: element.querySelector('sz') ? parseInt(element.querySelector('sz')!.getAttribute('val') || '0', 10) / 2 : undefined,
      color: element.querySelector('color')?.getAttribute('val') ? `#${element.querySelector('color')!.getAttribute('val')}` : undefined,
      backgroundColor: element.querySelector('highlight')?.getAttribute('val') ? `#${element.querySelector('highlight')!.getAttribute('val')}` : undefined,
      superscript: element.querySelector('vertAlign')?.getAttribute('val') === 'superscript',
      subscript: element.querySelector('vertAlign')?.getAttribute('val') === 'subscript',
    };
  }

  private parseParagraphAttributes(element: Element | null): WriterBlockAttributes {
    if (!element) return {};

    const jc = element.querySelector('jc')?.getAttribute('val') as WriterBlockAttributes['alignment'];
    const ind = element.querySelector('ind');
    const spacingEl = element.querySelector('spacing');
    const pBdr = element.querySelector('pBdr');
    const shd = element.querySelector('shd');
    const keepLines = element.querySelector('keepLines') !== null;
    const keepNext = element.querySelector('keepNext') !== null;
    const pageBreakBefore = element.querySelector('pageBreakBefore') !== null;
    const widowControl = element.querySelector('widowControl') !== null;

    type LineRule = 'auto' | 'exact' | 'atLeast';
    const lineRuleValue = spacingEl?.getAttribute('lineRule') as LineRule | undefined;

    const spacingAttrs = spacingEl ? {
      before: parseInt(spacingEl.getAttribute('before') || '0', 10),
      after: parseInt(spacingEl.getAttribute('after') || '0', 10),
      line: parseInt(spacingEl.getAttribute('line') || '0', 10),
      lineRule: lineRuleValue ?? 'auto',
    } : undefined;

    return {
      alignment: jc || 'left',
      indentation: ind ? {
        left: parseInt(ind.getAttribute('left') || '0', 10),
        right: parseInt(ind.getAttribute('right') || '0', 10),
        firstLine: parseInt(ind.getAttribute('firstLine') || '0', 10),
        hanging: parseInt(ind.getAttribute('hanging') || '0', 10),
      } : undefined,
      spacing: spacingAttrs,
      borders: pBdr ? this.parseBorders(pBdr) : undefined,
      shading: shd ? this.parseShading(shd) : undefined,
      pageBreakBefore,
      keepWithNext: keepNext,
      keepLinesTogether: keepLines,
      widowControl,
    };
  }

  private parseNumbering(element: Element | null): WriterBlockAttributes['numbering'] {
    if (!element) return undefined;
    const numPr = element.querySelector('numPr');
    if (!numPr) return undefined;

    const numId = numPr.querySelector('numId')?.getAttribute('val') || '';
    const ilvl = numPr.querySelector('ilvl')?.getAttribute('val');

    if (numId && ilvl) {
      return { level: parseInt(ilvl, 10), numId };
    }
    return undefined;
  }

  private parseBorders(element: Element): WriterBorders {
    const borders: WriterBorders = {};
    const borderTypes = ['top', 'bottom', 'left', 'right', 'between'];

    borderTypes.forEach((type) => {
      const borderEl = element.querySelector(type);
      if (borderEl) {
        borders[type as keyof WriterBorders] = {
          style: (borderEl.getAttribute('val') as WriterBorder['style']) || 'single',
          size: parseInt(borderEl.getAttribute('sz') || '4', 10),
          color: `#${borderEl.getAttribute('color') || '000000'}`,
          space: parseInt(borderEl.getAttribute('space') || '0', 10),
        };
      }
    });

    return borders;
  }

  private parseShading(element: Element): WriterShading {
    return {
      fill: element.getAttribute('fill') || 'clear',
      color: element.getAttribute('color') ? `#${element.getAttribute('color')}` : undefined,
      pattern: (element.getAttribute('val') as WriterShading['pattern']) || 'clear',
    };
  }

  private parseTable(element: Element): WriterBlock {
    const tblPr = element.querySelector('tblPr');
    const properties = this.parseTableProperties(tblPr);

    const rows: WriterTableRow[] = [];
    const trElements = element.querySelectorAll('tr');

    trElements.forEach((tr) => {
      const row = this.parseTableRow(tr);
      if (row) rows.push(row);
    });

    return {
      id: crypto.randomUUID(),
      type: 'table',
      content: [],
      attributes: {},
      children: rows.map((row) => ({
        id: crypto.randomUUID(),
        type: 'paragraph' as const,
        content: [],
        attributes: {},
        children: row.cells.map((cell) => ({
          id: crypto.randomUUID(),
          type: 'paragraph' as const,
          content: cell.blocks.flatMap(b => b.content),
          attributes: {},
        })),
      })),
    };
  }

  private parseTableProperties(element: Element | null): WriterTableProperties {
    if (!element) return {};

    const width = element.querySelector('tblW');
    const jc = element.querySelector('jc')?.getAttribute('val') as WriterTableProperties['alignment'];
    const borders = element.querySelector('tblBorders');
    const shd = element.querySelector('shd');
    const layout = element.querySelector('tblLayout')?.getAttribute('type') as WriterTableProperties['layout'];
    const cellSpacing = element.querySelector('tblCellSpacing')?.getAttribute('w');
    const cellMargin = element.querySelector('tblCellMar');

    return {
      width: width ? { value: parseInt(width.getAttribute('w') || '0', 10), type: (width.getAttribute('type') as 'dxa' | 'pct') || 'dxa' } : undefined,
      alignment: jc || 'left',
      borders: borders ? this.parseBorders(borders) : undefined,
      shading: shd ? this.parseShading(shd) : undefined,
      layout: layout || 'autofit',
      cellSpacing: cellSpacing ? parseInt(cellSpacing, 10) : undefined,
      cellMargin: cellMargin ? {
        top: parseInt(cellMargin.querySelector('top')?.getAttribute('w') || '0', 10),
        bottom: parseInt(cellMargin.querySelector('bottom')?.getAttribute('w') || '0', 10),
        left: parseInt(cellMargin.querySelector('left')?.getAttribute('w') || '0', 10),
        right: parseInt(cellMargin.querySelector('right')?.getAttribute('w') || '0', 10),
      } : undefined,
    };
  }

  private parseTableRow(element: Element): WriterTableRow {
    const trPr = element.querySelector('trPr');
    const properties = this.parseTableRowProperties(trPr);

    const cells: WriterTableCell[] = [];
    const tcElements = element.querySelectorAll('tc');

    tcElements.forEach((tc) => {
      const cell = this.parseTableCell(tc);
      if (cell) cells.push(cell);
    });

    return { cells, properties };
  }

  private parseTableRowProperties(element: Element | null): WriterTableRowProperties {
    if (!element) return {};

    const height = element.querySelector('trHeight');
    const cantSplit = element.querySelector('cantSplit') !== null;
    const header = element.querySelector('tblHeader') !== null;

    return {
      height: height ? { value: parseInt(height.getAttribute('val') || '0', 10), rule: (height.getAttribute('hRule') as 'auto' | 'exact' | 'atLeast') || 'auto' } : undefined,
      cantSplit,
      header,
    };
  }

  private parseTableCell(element: Element): WriterTableCell {
    const tcPr = element.querySelector('tcPr');
    const properties = this.parseTableCellProperties(tcPr);

    const blocks: WriterBlock[] = [];
    const contentElements = Array.from(element.children).filter((el) => {
      const tag = el.tagName.split('}').pop()?.toLowerCase();
      return tag === 'p' || tag === 'tbl';
    });

    contentElements.forEach((child) => {
      const block = this.parseBlock(child);
      if (block) blocks.push(block);
    });

    return { blocks, properties };
  }

  private parseTableCellProperties(element: Element | null): WriterTableCellProperties {
    if (!element) return {};

    const width = element.querySelector('tcW');
    const vAlign = element.querySelector('vAlign')?.getAttribute('val') as WriterTableCellProperties['verticalAlignment'];
    const borders = element.querySelector('tcBorders');
    const shd = element.querySelector('shd');
    const margins = element.querySelector('tcMar');

    return {
      width: width ? { value: parseInt(width.getAttribute('w') || '0', 10), type: (width.getAttribute('type') as 'dxa' | 'pct') || 'dxa' } : undefined,
      verticalAlignment: vAlign || 'top',
      borders: borders ? this.parseBorders(borders) : undefined,
      shading: shd ? this.parseShading(shd) : undefined,
      margins: margins ? {
        top: parseInt(margins.querySelector('top')?.getAttribute('w') || '0', 10),
        bottom: parseInt(margins.querySelector('bottom')?.getAttribute('w') || '0', 10),
        left: parseInt(margins.querySelector('left')?.getAttribute('w') || '0', 10),
        right: parseInt(margins.querySelector('right')?.getAttribute('w') || '0', 10),
      } : undefined,
    };
  }

  async terminate(): Promise<void> {
    this.zipReader = null;
    this.documentRels.clear();
    this.images.clear();
    this.styleMap.clear();
    this.numberingMap.clear();
    this.abstractNumMap.clear();
  }
}

export const docxParserService = new DocxParserService();