import {
  WriterBlock,
  WriterContent,
  WriterFormatting,
  WriterBlockAttributes,
  WriterSettings,
  WriterTable,
  WriterTableRow,
  WriterTableCell,
} from '../../types/writer/document';

// Layout constants (in twips - 1/1440 inch)
const TWIPS_PER_INCH = 1440;
const TWIPS_PER_CM = 567;
const TWIPS_PER_POINT = 20;

// Exported layout types
export interface LayoutContext {
  pageWidth: number;
  pageHeight: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    header: number;
    footer: number;
    gutter: number;
  };
  currentPage: number;
  currentY: number;
  availableWidth: number;
  availableHeight: number;
}

export interface LayoutBlock {
  block: WriterBlock;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  lines: LayoutLine[];
  overflows: boolean;
}

export interface LayoutLine {
  content: WriterContent[];
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number;
  ascent: number;
  descent: number;
}

export interface LayoutResult {
  pages: LayoutPage[];
  totalPages: number;
  blocks: LayoutBlock[];
}

export interface LayoutPage {
  pageNumber: number;
  blocks: LayoutBlock[];
  width: number;
  height: number;
}

export class LayoutEngineService {
  private context: LayoutContext;
  private fontCache: Map<string, FontMetrics> = new Map();

  constructor(settings: WriterSettings) {
    this.context = this.createContext(settings);
  }

  private createContext(settings: WriterSettings): LayoutContext {
    const { pageSize, margins } = settings;
    return {
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      margins,
      currentPage: 1,
      currentY: margins.top,
      availableWidth: pageSize.width - margins.left - margins.right - margins.gutter,
      availableHeight: pageSize.height - margins.top - margins.bottom,
    };
  }

  layout(blocks: WriterBlock[]): LayoutResult {
    const layoutBlocks: LayoutBlock[] = [];
    const pages: LayoutPage[] = [];
    let currentPageBlocks: LayoutBlock[] = [];

    for (const block of blocks) {
      const layoutBlock = this.layoutBlock(block);

      // Check if block fits on current page
      if (this.context.currentY + layoutBlock.height > this.context.pageHeight - this.context.margins.bottom) {
        // Start new page
        if (currentPageBlocks.length > 0) {
          pages.push({
            pageNumber: this.context.currentPage,
            blocks: currentPageBlocks,
            width: this.context.pageWidth,
            height: this.context.pageHeight,
          });
        }
        this.context.currentPage++;
        this.context.currentY = this.context.margins.top;
        currentPageBlocks = [];

        // Re-layout block on new page
        const newLayoutBlock = this.layoutBlock(block);
        layoutBlocks.push(newLayoutBlock);
        currentPageBlocks.push(newLayoutBlock);
        this.context.currentY += newLayoutBlock.height;
      } else {
        layoutBlocks.push(layoutBlock);
        currentPageBlocks.push(layoutBlock);
        this.context.currentY += layoutBlock.height;
      }
    }

    // Add last page
    if (currentPageBlocks.length > 0) {
      pages.push({
        pageNumber: this.context.currentPage,
        blocks: currentPageBlocks,
        width: this.context.pageWidth,
        height: this.context.pageHeight,
      });
    }

    return {
      pages,
      totalPages: this.context.currentPage,
      blocks: layoutBlocks,
    };
  }

  private layoutBlock(block: WriterBlock): LayoutBlock {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'list':
        return this.layoutParagraph(block);
      case 'table':
        return this.layoutTable(block);
      case 'image':
        return this.layoutImage(block);
      case 'pageBreak':
        return this.layoutPageBreak(block);
      case 'sectionBreak':
        return this.layoutSectionBreak(block);
      default:
        return this.createEmptyLayoutBlock(block);
    }
  }

  private layoutParagraph(block: WriterBlock): LayoutBlock {
    const attrs = block.attributes;
    const indentLeft = attrs.indentation?.left || 0;
    const indentRight = attrs.indentation?.right || 0;
    const firstLineIndent = attrs.indentation?.firstLine || 0;
    const hangingIndent = attrs.indentation?.hanging || 0;
    const alignment = attrs.alignment || 'left';
    const spacingBefore = attrs.spacing?.before || 0;
    const spacingAfter = attrs.spacing?.after || 0;
    const lineHeight = attrs.spacing?.line || 240; // 12pt default
    const lineRule = attrs.spacing?.lineRule || 'auto';

    const contentWidth = this.context.availableWidth - indentLeft - indentRight;
    let x = this.context.margins.left + indentLeft;
    let y = this.context.currentY + spacingBefore;

    // Apply first line indent
    if (firstLineIndent > 0) {
      x += firstLineIndent;
    } else if (hangingIndent > 0) {
      // Hanging indent handled in line layout
    }

    // Layout lines
    const lines = this.layoutLines(block.content, contentWidth, x, y, lineHeight, lineRule, alignment, firstLineIndent, hangingIndent);

    const blockHeight = lines.reduce((sum, line) => sum + line.height, 0) + spacingBefore + spacingAfter;
    const blockWidth = this.context.availableWidth;

    const layoutBlock: LayoutBlock = {
      block,
      x: this.context.margins.left,
      y: this.context.currentY,
      width: blockWidth,
      height: blockHeight,
      page: this.context.currentPage,
      lines,
      overflows: false,
    };

    return layoutBlock;
  }

  private layoutLines(
    content: WriterContent[],
    contentWidth: number,
    startX: number,
    startY: number,
    lineHeight: number,
    lineRule: 'auto' | 'exact' | 'atLeast',
    alignment: 'left' | 'center' | 'right' | 'justify',
    firstLineIndent: number,
    hangingIndent: number
  ): LayoutLine[] {
    const lines: LayoutLine[] = [];
    let currentLineContent: WriterContent[] = [];
    let currentLineWidth = 0;
    let currentX = startX;
    let currentY = startY;
    let isFirstLine = true;

    const getCharWidth = (char: string, formatting: WriterFormatting): number => {
      const metrics = this.getFontMetrics(formatting);
      return metrics.charWidths[char] || metrics.averageCharWidth;
    };

    const getContentWidth = (c: WriterContent): number => {
      if (c.type === 'inlineImage' && c.imageData) {
        return 914400; // Default image width in twips (1 inch)
      }
      return c.text.split('').reduce((w, char) => w + getCharWidth(char, c.formatting), 0);
    };

    for (const c of content) {
      const cWidth = getContentWidth(c);

      if (currentLineWidth + cWidth > contentWidth && currentLineContent.length > 0) {
        // Line break needed
        const line = this.createLayoutLine(
          currentLineContent,
          currentX,
          currentY,
          contentWidth,
          lineHeight,
          lineRule,
          alignment,
          isFirstLine ? firstLineIndent : hangingIndent
        );
        lines.push(line);

        currentY += line.height;
        currentLineContent = [c];
        currentLineWidth = cWidth;
        currentX = startX + (isFirstLine ? firstLineIndent : hangingIndent);
        isFirstLine = false;
      } else {
        currentLineContent.push(c);
        currentLineWidth += cWidth;
      }
    }

    // Last line
    if (currentLineContent.length > 0) {
      const line = this.createLayoutLine(
        currentLineContent,
        currentX,
        currentY,
        contentWidth,
        lineHeight,
        lineRule,
        alignment,
        isFirstLine ? firstLineIndent : hangingIndent
      );
      lines.push(line);
    }

    return lines;
  }

  private createLayoutLine(
    content: WriterContent[],
    x: number,
    y: number,
    contentWidth: number,
    lineHeight: number,
    lineRule: 'auto' | 'exact' | 'atLeast',
    alignment: 'left' | 'center' | 'right' | 'justify',
    indent: number
  ): LayoutLine {
    // Calculate line metrics
    let maxAscent = 0;
    let maxDescent = 0;

    for (const c of content) {
      const metrics = this.getFontMetrics(c.formatting);
      maxAscent = Math.max(maxAscent, metrics.ascent);
      maxDescent = Math.max(maxDescent, metrics.descent);
    }

    const baseline = y + maxAscent;
    const actualHeight = Math.max(lineHeight, maxAscent + maxDescent);

    // Calculate line width
    let lineWidth = 0;
    for (const c of content) {
      if (c.type === 'inlineImage' && c.imageData) {
        lineWidth += 914400; // Default image width
      } else {
        lineWidth += c.text.split('').reduce((w, char) => w + (this.getFontMetrics(c.formatting).charWidths[char] || this.getFontMetrics(c.formatting).averageCharWidth), 0);
      }
    }

    // Apply alignment
    let alignedX = x;
    if (alignment === 'center') {
      alignedX = x + (contentWidth - lineWidth) / 2;
    } else if (alignment === 'right') {
      alignedX = x + contentWidth - lineWidth;
    } else if (alignment === 'justify' && content.length > 1) {
      // Justify handled during rendering
      alignedX = x;
    }

    return {
      content,
      x: alignedX,
      y,
      width: lineWidth,
      height: actualHeight,
      baseline,
      ascent: maxAscent,
      descent: maxDescent,
    };
  }

  private getFontMetrics(formatting: WriterFormatting): FontMetrics {
    const key = `${formatting.fontFamily || 'Calibri'}-${formatting.fontSize || 11}-${formatting.bold}-${formatting.italic}`;
    let metrics = this.fontCache.get(key);

    if (!metrics) {
      metrics = this.calculateFontMetrics(formatting);
      this.fontCache.set(key, metrics);
    }

    return metrics;
  }

  private calculateFontMetrics(formatting: WriterFormatting): FontMetrics {
    const fontFamily = formatting.fontFamily || 'Calibri';
    const fontSize = (formatting.fontSize || 11) * TWIPS_PER_POINT; // Convert to twips
    const bold = formatting.bold || false;
    const italic = formatting.italic || false;

    // Approximate metrics (in twips)
    const ascent = Math.round(fontSize * 0.8);
    const descent = Math.round(fontSize * 0.2);
    const lineGap = Math.round(fontSize * 0.15);
    const averageCharWidth = Math.round(fontSize * 0.5);

    // Character widths (simplified - real implementation would use font metrics)
    const charWidths: Record<string, number> = {};
    for (let i = 32; i < 127; i++) {
      charWidths[String.fromCharCode(i)] = averageCharWidth;
    }
    // Space is wider
    charWidths[' '] = Math.round(averageCharWidth * 0.6);

    return {
      fontFamily,
      fontSize,
      bold,
      italic,
      ascent,
      descent,
      lineGap,
      averageCharWidth,
      charWidths,
    };
  }

  private layoutTable(block: WriterBlock): LayoutBlock {
    // Simplified table layout - would need full implementation
    const table = block.children?.[0] as unknown as WriterTable;
    const rowHeight = 240; // Default row height
    const rows = table?.rows?.length || 1;
    const height = rows * rowHeight;

    return {
      block,
      x: this.context.margins.left,
      y: this.context.currentY,
      width: this.context.availableWidth,
      height,
      page: this.context.currentPage,
      lines: [],
      overflows: false,
    };
  }

  private layoutImage(block: WriterBlock): LayoutBlock {
    // Default image size
    const width = Math.min(914400, this.context.availableWidth); // Max 1 inch or page width
    const height = 914400; // 1 inch default

    return {
      block,
      x: this.context.margins.left,
      y: this.context.currentY,
      width,
      height,
      page: this.context.currentPage,
      lines: [],
      overflows: false,
    };
  }

  private layoutPageBreak(block: WriterBlock): LayoutBlock {
    // Force new page
    this.context.currentPage++;
    this.context.currentY = this.context.margins.top;

    return {
      block,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      page: this.context.currentPage,
      lines: [],
      overflows: false,
    };
  }

  private layoutSectionBreak(block: WriterBlock): LayoutBlock {
    // Similar to page break but could have different section properties
    return this.layoutPageBreak(block);
  }

  private createEmptyLayoutBlock(block: WriterBlock): LayoutBlock {
    return {
      block,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      page: this.context.currentPage,
      lines: [],
      overflows: false,
    };
  }

  // Public method to get layout for a specific page
  getPageLayout(result: LayoutResult, pageNumber: number): LayoutBlock[] {
    return result.blocks.filter(b => b.page === pageNumber);
  }

  // Get block at position (for hit testing)
  getBlockAtPosition(result: LayoutResult, x: number, y: number, pageNumber: number): LayoutBlock | null {
    const pageBlocks = this.getPageLayout(result, pageNumber);
    for (const block of pageBlocks) {
      if (x >= block.x && x <= block.x + block.width &&
          y >= block.y && y <= block.y + block.height) {
        return block;
      }
    }
    return null;
  }

  // Get character position at point (for cursor placement)
  getCharacterPosition(block: LayoutBlock, x: number, y: number): { contentIndex: number; offset: number } | null {
    for (let i = 0; i < block.lines.length; i++) {
      const line = block.lines[i];
      if (!line) continue;
      if (y >= line.y && y <= line.y + line.height) {
        // Find character within line
        let currentX = line.x;
        for (let j = 0; j < line.content.length; j++) {
          const content = line.content[j];
          if (!content) continue;
          const contentWidth = content.type === 'inlineImage' ? 914400 :
            content.text.split('').reduce((w, char) => w + (this.getFontMetrics(content.formatting).charWidths[char] || this.getFontMetrics(content.formatting).averageCharWidth), 0);

          if (x >= currentX && x <= currentX + contentWidth) {
            // Within this content - calculate offset
            let offset = 0;
            if (content.type === 'text' && content.text) {
              for (let k = 0; k < content.text.length; k++) {
                const char = content.text[k];
                const charWidth = char ? this.getFontMetrics(content.formatting).charWidths[char] || this.getFontMetrics(content.formatting).averageCharWidth : this.getFontMetrics(content.formatting).averageCharWidth;
                if (x < currentX + charWidth / 2) {
                  offset = k;
                  break;
                }
                currentX += charWidth;
              }
            }
            return { contentIndex: j, offset };
          }
          currentX += contentWidth;
        }
        // Past end of line
        const lastContent = line.content[line.content.length - 1];
        return { contentIndex: line.content.length - 1, offset: lastContent?.text?.length || 0 };
      }
    }
    return null;
  }
}

export interface FontMetrics {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  ascent: number;
  descent: number;
  lineGap: number;
  averageCharWidth: number;
  charWidths: Record<string, number>;
}

export const layoutEngineService = new LayoutEngineService({
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
});