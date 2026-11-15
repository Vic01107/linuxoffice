import { PDFDocument, PDFPage, rgb, StandardFonts, degrees } from 'pdf-lib';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { pdfjsLib } from '../lib/pdf-worker';

export interface PDFPageInfo {
  index: number;
  width: number;
  height: number;
  rotation: number;
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

export interface MergeOptions {
  pageRanges?: { start: number; end: number }[];
}

export interface SplitOptions {
  ranges: { start: number; end: number }[];
}

export interface CompressOptions {
  quality: 'low' | 'medium' | 'high';
  downsampleImages?: boolean;
  maxImageDimension?: number;
}

export interface PageManipulationOptions {
  rotate?: number;
  delete?: boolean;
  extract?: boolean;
}

export class PDFLibService {
  private pdfDoc: PDFDocument | null = null;
  private pdfDocProxy: PDFDocumentProxy | null = null;
  private originalBytes: Uint8Array | null = null;

  async loadFromBytes(bytes: Uint8Array): Promise<void> {
    this.originalBytes = bytes;
    this.pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    this.pdfDocProxy = await pdfjsLib.getDocument({ data: bytes }).promise;
  }

  async loadFromFile(file: File): Promise<void> {
    const bytes = await file.arrayBuffer();
    await this.loadFromBytes(new Uint8Array(bytes));
  }

  getPageCount(): number {
    return this.pdfDoc?.getPageCount() ?? 0;
  }

  getPageInfo(pageIndex: number): PDFPageInfo | null {
    const page = this.pdfDoc?.getPages()[pageIndex];
    if (!page) return null;
    const { width, height } = page.getSize();
    return {
      index: pageIndex,
      width,
      height,
      rotation: page.getRotation().angle,
    };
  }

  getAllPageInfo(): PDFPageInfo[] {
    const count = this.getPageCount();
    return Array.from({ length: count }, (_, i) => this.getPageInfo(i)!).filter(Boolean);
  }

  getMetadata(): PDFMetadata | null {
    if (!this.pdfDoc) return null;
    return {
      title: this.pdfDoc.getTitle() || undefined,
      author: this.pdfDoc.getAuthor() || undefined,
      subject: this.pdfDoc.getSubject() || undefined,
      keywords: this.pdfDoc.getKeywords() || undefined,
      creator: this.pdfDoc.getCreator() || undefined,
      producer: this.pdfDoc.getProducer() || undefined,
      creationDate: this.pdfDoc.getCreationDate() || undefined,
      modificationDate: this.pdfDoc.getModificationDate() || undefined,
    };
  }

  setMetadata(metadata: Partial<PDFMetadata>): void {
    if (!this.pdfDoc) return;
    if (metadata.title !== undefined) this.pdfDoc.setTitle(metadata.title);
    if (metadata.author !== undefined) this.pdfDoc.setAuthor(metadata.author);
    if (metadata.subject !== undefined) this.pdfDoc.setSubject(metadata.subject);
    if (metadata.keywords !== undefined) this.pdfDoc.setKeywords(metadata.keywords.split(',').map(k => k.trim()));
    if (metadata.creator !== undefined) this.pdfDoc.setCreator(metadata.creator);
    if (metadata.producer !== undefined) this.pdfDoc.setProducer(metadata.producer);
    if (metadata.creationDate !== undefined) this.pdfDoc.setCreationDate(metadata.creationDate);
    if (metadata.modificationDate !== undefined) this.pdfDoc.setModificationDate(metadata.modificationDate);
  }

  async mergePDFs(otherBytes: Uint8Array[], options?: MergeOptions): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const mergedDoc = await PDFDocument.create();
    const pages = this.pdfDoc.getPages();

    for (const page of pages) {
      const [copiedPage] = await mergedDoc.copyPages(this.pdfDoc, [pages.indexOf(page)]);
      mergedDoc.addPage(copiedPage);
    }

    for (const bytes of otherBytes) {
      const otherDoc = await PDFDocument.load(bytes);
      const otherPages = otherDoc.getPages();
      const indices = options?.pageRanges
        ? options.pageRanges.flatMap(r => Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i))
        : otherPages.map((_, i) => i);

      const copiedPages = await mergedDoc.copyPages(otherDoc, indices);
      copiedPages.forEach(p => mergedDoc.addPage(p));
    }

    return mergedDoc.save();
  }

  async splitPDF(options: SplitOptions): Promise<Uint8Array[]> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const results: Uint8Array[] = [];
    const pages = this.pdfDoc.getPages();

    for (const range of options.ranges) {
      const newDoc = await PDFDocument.create();
      const indices = Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i);
      const copiedPages = await newDoc.copyPages(this.pdfDoc, indices);
      copiedPages.forEach(p => newDoc.addPage(p));
      results.push(await newDoc.save());
    }

    return results;
  }

  async extractPages(pageIndices: number[]): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(this.pdfDoc, pageIndices);
    copiedPages.forEach(p => newDoc.addPage(p));
    return newDoc.save();
  }

  async deletePages(pageIndices: number[]): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const newDoc = await PDFDocument.create();
    const allIndices = Array.from({ length: this.getPageCount() }, (_, i) => i);
    const keepIndices = allIndices.filter(i => !pageIndices.includes(i));
    const copiedPages = await newDoc.copyPages(this.pdfDoc, keepIndices);
    copiedPages.forEach(p => newDoc.addPage(p));
    return newDoc.save();
  }

  async reorderPages(newOrder: number[]): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(this.pdfDoc, newOrder);
    copiedPages.forEach(p => newDoc.addPage(p));
    return newDoc.save();
  }

  async rotatePages(pageIndices: number[], rotation: 90 | 180 | 270): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    for (const index of pageIndices) {
      const page = this.pdfDoc.getPages()[index];
      if (page) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotation));
      }
    }
    return this.pdfDoc.save();
  }

  async compressPDF(options: CompressOptions): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const qualityMap = { low: 0.3, medium: 0.6, high: 0.85 };
    const quality = qualityMap[options.quality];

    return this.pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
  }

  async addText(
    pageIndex: number,
    text: string,
    x: number,
    y: number,
    options: { fontSize?: number; color?: [number, number, number]; font?: string } = {}
  ): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const page = this.pdfDoc.getPages()[pageIndex];
    if (!page) throw new Error('Page not found');

    const font = await this.pdfDoc.embedFont(
      options.font ? StandardFonts[options.font as keyof typeof StandardFonts] : StandardFonts.Helvetica
    );

    page.drawText(text, {
      x,
      y,
      size: options.fontSize || 12,
      font,
      color: options.color ? rgb(...options.color) : rgb(0, 0, 0),
    });

    return this.pdfDoc.save();
  }

  async addImage(
    pageIndex: number,
    imageBytes: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const page = this.pdfDoc.getPages()[pageIndex];
    if (!page) throw new Error('Page not found');

    let image;
    if (imageBytes[0] === 0xFF && imageBytes[1] === 0xD8) {
      image = await this.pdfDoc.embedJpg(imageBytes);
    } else if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) {
      image = await this.pdfDoc.embedPng(imageBytes);
    } else {
      throw new Error('Unsupported image format');
    }

    page.drawImage(image, { x, y, width, height });
    return this.pdfDoc.save();
  }

  async save(): Promise<Uint8Array> {
    if (!this.pdfDoc) throw new Error('No PDF loaded');
    return this.pdfDoc.save();
  }

  async saveAsBase64(): Promise<string> {
    const bytes = await this.save();
    return btoa(String.fromCharCode(...bytes));
  }

  getPDFDocProxy(): PDFDocumentProxy | null {
    return this.pdfDocProxy;
  }

  async getPageText(pageIndex: number): Promise<string> {
    if (!this.pdfDocProxy) return '';
    const page = await this.pdfDocProxy.getPage(pageIndex + 1);
    const content = await page.getTextContent();
    return content.items
      .filter((item): item is { str: string; dir: string; transform: any[]; width: number; height: number; fontName: string; hasEOL: boolean } => 'str' in item)
      .map((item) => item.str)
      .join(' ');
  }

  async getAllText(): Promise<string[]> {
    if (!this.pdfDocProxy) return [];
    const count = this.getPageCount();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.getPageText(i));
    }
    return texts;
  }
}

export const pdfLibService = new PDFLibService();