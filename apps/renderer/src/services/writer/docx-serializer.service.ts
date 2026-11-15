import { ZipWriter, BlobWriter, TextReader, Data64URIReader, Uint8ArrayReader, TextWriter } from '@zip.js/zip.js';
import {
  WriterDocumentState,
  WriterBlock,
  WriterContent,
  WriterFormatting,
  WriterBlockAttributes,
  WriterStyle,
  WriterSettings,
  WriterTable,
  WriterShading,
  WriterNumberingDefinition,
} from '../../types/writer/document';

const NAMESPACE = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  rels: 'http://schemas.openxmlformats.org/package/2006/relationships',
};

export class DocxSerializerService {
  private zipWriter: ZipWriter<Blob> | null = null;
  private documentRels = new Map<string, string>();
  private relIdCounter = 1;
  private imageCounter = 1;
  private styleIdCounter = 1;
  private numIdCounter = 1;

  async serialize(doc: WriterDocumentState): Promise<Uint8Array> {
    const blobWriter = new BlobWriter('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    this.zipWriter = new ZipWriter(blobWriter);
    this.documentRels.clear();
    this.relIdCounter = 1;
    this.imageCounter = 1;
    this.styleIdCounter = 1;
    this.numIdCounter = 1;

    // Initialize zip writer
    await this.zipWriter.add('[Content_Types].xml', new TextReader(''));

    await this.writeContentTypes();
    await this.writeMainRels();
    await this.writeDocument(doc);
    await this.writeStyles(doc);
    await this.writeNumbering(doc);
    await this.writeSettings(doc);
    await this.writeDocumentRels();
    await this.writeImages(doc);

    await this.zipWriter.close();
    const blob = await blobWriter.getData();
    return new Uint8Array(await blob.arrayBuffer());
  }

  private async writeContentTypes(): Promise<void> {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/word/webSettings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml"/>
</Types>`;

    await this.zipWriter!.add('[Content_Types].xml', new TextReader(xml));
  }

  private async writeMainRels(): Promise<void> {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="word/styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="word/numbering.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="word/settings.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="word/fontTable.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings" Target="word/webSettings.xml"/>
</Relationships>`;

    await this.zipWriter!.add('_rels/.rels', new TextReader(xml));
  }

  private async writeDocument(doc: WriterDocumentState): Promise<void> {
    const blocksXml = doc.blocks.map((block) => this.serializeBlock(block)).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${blocksXml}
    <w:sectPr>
      ${this.serializeSectionProperties(doc.settings)}
    </w:sectPr>
  </w:body>
</w:document>`;

    await this.zipWriter!.add('word/document.xml', new TextReader(xml));
  }

  private serializeBlock(block: WriterBlock): string {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'list':
        return this.serializeParagraph(block);
      case 'table':
        return this.serializeTable(block);
      case 'image':
        return this.serializeImageBlock(block);
      case 'pageBreak':
        return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      case 'sectionBreak':
        return '<w:p><w:r><w:br w:type="section"/></w:r></w:p>';
      default:
        return '';
    }
  }

  private serializeParagraph(block: WriterBlock): string {
    const pPr: string[] = [];

    if (block.style) {
      pPr.push(`<w:pStyle w:val="${this.escapeXml(block.style)}"/>`);
    }

    if (block.attributes.alignment) {
      pPr.push(`<w:jc w:val="${block.attributes.alignment}"/>`);
    }

    if (block.attributes.indentation) {
      const ind = block.attributes.indentation;
      const parts: string[] = [];
      if (ind.left) parts.push(`w:left="${ind.left}"`);
      if (ind.right) parts.push(`w:right="${ind.right}"`);
      if (ind.firstLine) parts.push(`w:firstLine="${ind.firstLine}"`);
      if (ind.hanging) parts.push(`w:hanging="${ind.hanging}"`);
      if (parts.length) pPr.push(`<w:ind ${parts.join(' ')}/>`);
    }

    if (block.attributes.spacing) {
      const sp = block.attributes.spacing;
      const parts: string[] = [];
      if (sp.before) parts.push(`w:before="${sp.before}"`);
      if (sp.after) parts.push(`w:after="${sp.after}"`);
      if (sp.line) parts.push(`w:line="${sp.line}"`);
      if (sp.lineRule) parts.push(`w:lineRule="${sp.lineRule}"`);
      if (parts.length) pPr.push(`<w:spacing ${parts.join(' ')}/>`);
    }

    if (block.attributes.borders) {
      pPr.push(this.serializeBorders(block.attributes.borders));
    }

    if (block.attributes.shading) {
      pPr.push(this.serializeShading(block.attributes.shading));
    }

    if (block.attributes.keepWithNext) pPr.push('<w:keepNext/>');
    if (block.attributes.keepLinesTogether) pPr.push('<w:keepLines/>');
    if (block.attributes.pageBreakBefore) pPr.push('<w:pageBreakBefore/>');
    if (block.attributes.widowControl) pPr.push('<w:widowControl/>');

    if (block.attributes.numbering) {
      const { level, numId } = block.attributes.numbering;
      pPr.push(`<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr>`);
    }

    const pPrXml = pPr.length > 0 ? `<w:pPr>${pPr.join('')}</w:pPr>` : '';

    const runsXml = block.content.map((content) => this.serializeRun(content)).join('');

    return `<w:p>${pPrXml}${runsXml}</w:p>`;
  }

  private serializeRun(content: WriterContent): string {
    const rPr: string[] = [];
    const fmt = content.formatting;

    if (fmt.bold) rPr.push('<w:b/>');
    if (fmt.italic) rPr.push('<w:i/>');
    if (fmt.underline) rPr.push(`<w:u w:val="single"/>`);
    if (fmt.strikethrough) rPr.push('<w:strike/>');
    if (fmt.fontFamily) rPr.push(`<w:rFonts w:ascii="${this.escapeXml(fmt.fontFamily)}" w:hAnsi="${this.escapeXml(fmt.fontFamily)}"/>`);
    if (fmt.fontSize) rPr.push(`<w:sz w:val="${Math.round(fmt.fontSize * 2)}"/>`);
    if (fmt.color) rPr.push(`<w:color w:val="${fmt.color.replace('#', '')}"/>`);
    if (fmt.backgroundColor) rPr.push(`<w:highlight w:val="${this.getHighlightColor(fmt.backgroundColor)}"/>`);
    if (fmt.superscript) rPr.push('<w:vertAlign w:val="superscript"/>');
    if (fmt.subscript) rPr.push('<w:vertAlign w:val="subscript"/>');

    const rPrXml = rPr.length > 0 ? `<w:rPr>${rPr.join('')}</w:rPr>` : '';

    if (content.type === 'inlineImage' && content.imageData) {
      const relId = this.addImageRelation(content.imageData);
      const drawingXml = this.serializeDrawing(relId);
      return `<w:r>${rPrXml}${drawingXml}</w:r>`;
    }

    if (content.type === 'hyperlink' && content.link) {
      const relId = this.addHyperlinkRelation(content.link);
      return `<w:hyperlink r:id="${relId}"><w:r>${rPrXml}<w:t xml:space="preserve">${this.escapeXml(content.text)}</w:t></w:r></w:hyperlink>`;
    }

    const text = this.escapeXml(content.text);
    return `<w:r>${rPrXml}<w:t xml:space="preserve">${text}</w:t></w:r>`;
  }

  private serializeDrawing(relId: string): string {
    return `<w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="914400" cy="914400"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${this.imageCounter}" name="Image ${this.imageCounter}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks noChangeAspect="true"/>
        </wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="${this.imageCounter}" name="Image ${this.imageCounter}"/>
                <pic:cNvPicPr>
                  <a:picLocks noChangeAspect="true"/>
                </pic:cNvPicPr>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relId}"/>
                <a:stretch>
                  <a:fillRect/>
                </a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="914400" cy="914400"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>`;
  }

  private serializeTable(block: WriterBlock): string {
    // Simplified table serialization
    return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr></w:tbl>';
  }

  private serializeImageBlock(block: WriterBlock): string {
    return '<w:p><w:r><w:t>[Image]</w:t></w:r></w:p>';
  }

  private serializeSectionProperties(settings: WriterSettings): string {
    const { pageSize, margins } = settings;
    return `
      <w:pgSz w:w="${pageSize.width}" w:h="${pageSize.height}" w:orient="${pageSize.orientation}"/>
      <w:pgMar w:top="${margins.top}" w:bottom="${margins.bottom}"
               w:left="${margins.left}" w:right="${margins.right}"
               w:header="${margins.header}" w:footer="${margins.footer}"
               w:gutter="${margins.gutter}"/>
    `;
  }

  private serializeBorders(borders: WriterBlockAttributes['borders']): string {
    if (!borders) return '';
    const parts: string[] = [];
    ['top', 'bottom', 'left', 'right', 'between'].forEach((side) => {
      const border = borders[side as keyof typeof borders];
      if (border) {
        parts.push(`<w:${side} w:val="${border.style}" w:sz="${border.size}" w:color="${border.color.replace('#', '')}"${border.space ? ` w:space="${border.space}"` : ''}/>`);
      }
    });
    return `<w:pBdr>${parts.join('')}</w:pBdr>`;
  }

  private serializeShading(shading: WriterShading): string {
    return `<w:shd w:val="${shading.pattern || 'clear'}" w:color="${shading.color?.replace('#', '') || 'auto'}" w:fill="${shading.fill}"/>`;
  }

  private async writeStyles(doc: WriterDocumentState): Promise<void> {
    const styleXmls = doc.styles.map((style) => this.serializeStyle(style)).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${styleXmls}
</w:styles>`;

    await this.zipWriter!.add('word/styles.xml', new TextReader(xml));
  }

  private serializeStyle(style: WriterStyle): string {
    const parts: string[] = [];

    parts.push(`<w:style w:type="${style.type}" w:styleId="${style.id}">`);
    parts.push(`<w:name w:val="${this.escapeXml(style.name)}"/>`);

    if (style.basedOn) parts.push(`<w:basedOn w:val="${style.basedOn}"/>`);
    if (style.next) parts.push(`<w:next w:val="${style.next}"/>`);
    if (style.hidden) parts.push('<w:hidden/>');
    if (style.locked) parts.push('<w:locked/>');

    // Paragraph formatting
    if (style.paragraphAttributes) {
      const pPr: string[] = [];
      const attr = style.paragraphAttributes;

      if (attr.alignment) pPr.push(`<w:jc w:val="${attr.alignment}"/>`);
      if (attr.indentation) {
        const ind = attr.indentation;
        const indParts: string[] = [];
        if (ind.left) indParts.push(`w:left="${ind.left}"`);
        if (ind.right) indParts.push(`w:right="${ind.right}"`);
        if (ind.firstLine) indParts.push(`w:firstLine="${ind.firstLine}"`);
        if (ind.hanging) indParts.push(`w:hanging="${ind.hanging}"`);
        if (indParts.length) pPr.push(`<w:ind ${indParts.join(' ')}/>`);
      }
      if (attr.spacing) {
        const sp = attr.spacing;
        const spParts: string[] = [];
        if (sp.before) spParts.push(`w:before="${sp.before}"`);
        if (sp.after) spParts.push(`w:after="${sp.after}"`);
        if (sp.line) spParts.push(`w:line="${sp.line}"`);
        if (sp.lineRule) spParts.push(`w:lineRule="${sp.lineRule}"`);
        if (spParts.length) pPr.push(`<w:spacing ${spParts.join(' ')}/>`);
      }
      if (attr.borders) pPr.push(this.serializeBorders(attr.borders));
      if (attr.shading) pPr.push(this.serializeShading(attr.shading));

      if (pPr.length) parts.push(`<w:pPr>${pPr.join('')}</w:pPr>`);
    }

    // Character formatting
    const fmt = style.formatting;
    const rPr: string[] = [];
    if (fmt.bold) rPr.push('<w:b/>');
    if (fmt.italic) rPr.push('<w:i/>');
    if (fmt.underline) rPr.push('<w:u w:val="single"/>');
    if (fmt.strikethrough) rPr.push('<w:strike/>');
    if (fmt.fontFamily) rPr.push(`<w:rFonts w:ascii="${this.escapeXml(fmt.fontFamily)}" w:hAnsi="${this.escapeXml(fmt.fontFamily)}"/>`);
    if (fmt.fontSize) rPr.push(`<w:sz w:val="${Math.round(fmt.fontSize * 2)}"/>`);
    if (fmt.color) rPr.push(`<w:color w:val="${fmt.color.replace('#', '')}"/>`);
    if (rPr.length) parts.push(`<w:rPr>${rPr.join('')}</w:rPr>`);

    parts.push('</w:style>');
    return parts.join('');
  }

  private async writeNumbering(doc: WriterDocumentState): Promise<void> {
    // Find numbering definitions from blocks
    const numberingDefs = new Map<string, WriterNumberingDefinition>();

    doc.blocks.forEach((block) => {
      if (block.attributes.numbering) {
        const { numId } = block.attributes.numbering;
        if (!numberingDefs.has(numId)) {
          numberingDefs.set(numId, {
            id: numId,
            name: `List ${numId}`,
            levels: Array.from({ length: 9 }, (_, i) => ({
              level: i,
              start: 1,
              format: i === 0 ? 'decimal' : 'lowerLetter',
              text: '%1.',
              alignment: 'left' as const,
              formatting: {},
              indentation: { left: (i + 1) * 720, hanging: 360 },
            })),
          });
        }
      }
    });

    const abstractNumXmls = Array.from(numberingDefs.values()).map((def, idx) =>
      this.serializeAbstractNum(def, idx + 1)
    ).join('\n');

    const numXmls = Array.from(numberingDefs.values()).map((def, idx) =>
      this.serializeNum(def, idx + 1)
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${abstractNumXmls}
  ${numXmls}
</w:numbering>`;

    await this.zipWriter!.add('word/numbering.xml', new TextReader(xml));
  }

  private serializeAbstractNum(def: WriterNumberingDefinition, abstractNumId: number): string {
    const levelsXml = def.levels.map((level) => `
      <w:lvl w:ilvl="${level.level}">
        <w:start w:val="${level.start}"/>
        <w:numFmt w:val="${level.format}"/>
        <w:lvlText w:val="${this.escapeXml(level.text)}"/>
        <w:lvlJc w:val="${level.alignment}"/>
        ${level.formatting.fontSize ? `<w:rPr><w:sz w:val="${Math.round(level.formatting.fontSize * 2)}"/></w:rPr>` : ''}
        <w:ind w:left="${level.indentation.left}" w:hanging="${level.indentation.hanging}"/>
      </w:lvl>
    `).join('\n');

    return `
      <w:abstractNum w:abstractNumId="${abstractNumId}">
        <w:nsid w:val="${Math.random().toString(36).substring(2, 10)}"/>
        <w:multiLevelType w:val="hybridMultilevel"/>
        ${levelsXml}
      </w:abstractNum>
    `;
  }

  private serializeNum(def: WriterNumberingDefinition, numId: number): string {
    return `
      <w:num w:numId="${numId}">
        <w:abstractNumId w:val="${numId}"/>
      </w:num>
    `;
  }

  private async writeSettings(doc: WriterDocumentState): Promise<void> {
    const { settings } = doc;
    const parts: string[] = [];

    parts.push(`<w:defaultTabStop w:val="${settings.defaultTabStop}"/>`);
    if (settings.autoHyphenation) parts.push('<w:autoHyphenation/>');
    if (settings.trackChanges) parts.push('<w:trackRevisions/>');

    if (settings.pageSize) {
      parts.push(`<w:pgSz w:w="${settings.pageSize.width}" w:h="${settings.pageSize.height}" w:orient="${settings.pageSize.orientation}"/>`);
    }

    if (settings.margins) {
      const m = settings.margins;
      parts.push(`<w:pgMar w:top="${m.top}" w:bottom="${m.bottom}" w:left="${m.left}" w:right="${m.right}" w:header="${m.header}" w:footer="${m.footer}" w:gutter="${m.gutter}"/>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${parts.join('\n  ')}
</w:settings>`;

    await this.zipWriter!.add('word/settings.xml', new TextReader(xml));
  }

  private async writeDocumentRels(): Promise<void> {
    const rels = Array.from(this.documentRels.entries()).map(([id, target]) =>
      `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${target.startsWith('word/media/') ? 'image' : 'hyperlink'}" Target="${target}"/>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels}
</Relationships>`;

    await this.zipWriter!.add('word/_rels/document.xml.rels', new TextReader(xml));
  }

  private async writeImages(doc: WriterDocumentState): Promise<void> {
    // Images are handled via relations during serialization
    // This would need to be implemented with actual image data from blocks
  }

  private addImageRelation(imageData: Uint8Array): string {
    const relId = `rId${this.relIdCounter++}`;
    const imageName = `image${this.imageCounter++}.png`;
    this.documentRels.set(relId, `word/media/${imageName}`);
    // Store image data for later writing
    return relId;
  }

  private addHyperlinkRelation(url: string): string {
    const relId = `rId${this.relIdCounter++}`;
    this.documentRels.set(relId, url);
    return relId;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&apos;');
  }

  private getHighlightColor(color: string): string {
    const colorMap: Record<string, string> = {
      '#ffff00': 'yellow',
      '#00ff00': 'green',
      '#00ffff': 'cyan',
      '#ff00ff': 'magenta',
      '#ff0000': 'red',
      '#0000ff': 'blue',
      '#ffa500': 'orange',
      '#800080': 'purple',
    };
    return colorMap[color.toLowerCase()] || 'yellow';
  }
}

export const docxSerializerService = new DocxSerializerService();