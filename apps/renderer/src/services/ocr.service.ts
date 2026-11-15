import { createWorker, PSM, OEM, Worker, ImageLike } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
  lines: OCRLine[];
  paragraphs: OCRParagraph[];
  pages: OCRPage[];
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  baseline: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  baseline: { x0: number; y0: number; x1: number; y1: number };
  words: OCRWord[];
}

export interface OCRParagraph {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  lines: OCRLine[];
}

export interface OCRPage {
  pageNumber: number;
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words: OCRWord[];
  lines: OCRLine[];
  paragraphs: OCRParagraph[];
}

export interface OCROptions {
  language?: string | string[];
  dpi?: number;
  pageRange?: { start: number; end: number };
  onProgress?: (progress: OCRProgress) => void;
}

export interface OCRProgress {
  status: 'loading' | 'initialized' | 'recognizing' | 'done';
  progress: number;
  currentPage?: number;
  totalPages?: number;
}

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentLanguage = 'spa+eng';

  async initialize(languages: string | string[] = 'spa+eng'): Promise<void> {
    const lang = Array.isArray(languages) ? languages.join('+') : languages;
    if (this.isInitialized && this.currentLanguage === lang) {
      return;
    }

    this.currentLanguage = lang;

    if (this.worker) {
      await this.worker.terminate();
    }

    this.worker = await createWorker(lang, OEM.LSTM_ONLY, {
      logger: (m: { status: string; progress: number }) => console.log('[Tesseract]', m),
    });

    await this.worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    });

    this.isInitialized = true;
  }

  async recognize(
    imageData: ImageLike,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize(options.language || 'spa+eng');
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    const { pageRange, onProgress } = options;

    const jobId = `ocr-${pageRange?.start || 1}`;

    // Set logger for this job if progress callback provided
    if (onProgress) {
      await this.worker.setParameters({
        logger: (m: { jobId: string; progress: number; status: string; userJobId: string; workerId: string }) => {
          if (m.status === 'recognizing text') {
            onProgress({
              status: 'recognizing',
              progress: m.progress * 100,
              currentPage: pageRange?.start,
              totalPages: pageRange ? pageRange.end - pageRange.start + 1 : 1,
            });
          }
        },
      });
    }

    const result = await this.worker.recognize(imageData, {}, { text: true, hocr: true }, jobId);

    return this.formatResult(result.data, pageRange?.start || 1);
  }

  async recognizePDF(
    pdfBytes: Uint8Array,
    options: OCROptions = {}
  ): Promise<OCRResult[]> {
    const { pdfjsLib } = await import('../lib/pdf-worker');
    const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const pageRange = options.pageRange || { start: 1, end: doc.numPages };

    const results: OCRResult[] = [];

    const dpi = options.dpi || 300;
    for (let i = pageRange.start; i <= Math.min(pageRange.end, doc.numPages); i++) {
      if (options.onProgress) {
        options.onProgress({
          status: 'recognizing',
          progress: ((i - pageRange.start) / (pageRange.end - pageRange.start + 1)) * 100,
          currentPage: i,
          totalPages: pageRange.end - pageRange.start + 1,
        });
      }

      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: dpi / 72 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport, canvas }).promise;

      const pageResult = await this.recognize(canvas, {
        ...options,
        pageRange: { start: i, end: i },
      });

      if (pageResult.pages && pageResult.pages[0]) {
        pageResult.pages[0].pageNumber = i;
      }
      results.push(pageResult);
    }

    if (options.onProgress) {
      options.onProgress({ status: 'done', progress: 100 });
    }

    return results;
  }

  async createSearchablePDF(
    pdfBytes: Uint8Array,
    options: OCROptions = {}
  ): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const { pdfjsLib } = await import('../lib/pdf-worker');

    const srcDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const pageRange = options.pageRange || { start: 1, end: srcDoc.numPages };

    const newDoc = await PDFDocument.create();
    const font = await newDoc.embedFont(StandardFonts.Helvetica);
      const { rgb } = await import('pdf-lib');

    for (let i = pageRange.start; i <= Math.min(pageRange.end, srcDoc.numPages); i++) {
      const page = await srcDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport, canvas }).promise;

      // OCR the page
      const ocrResult = await this.recognize(canvas);

      // Create new page in output PDF
      const newPage = newDoc.addPage([viewport.width, viewport.height]);

      // Draw the original page as image
      const imageBytes = await this.canvasToImageBytes(canvas, 'png');
      const image = await newDoc.embedPng(imageBytes);
      newPage.drawImage(image, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
        opacity: 1,
      });

      // Add invisible text layer for searchability
      for (const paragraph of ocrResult.paragraphs) {
        for (const line of paragraph.lines) {
          const scale = 72 / 300; // Convert from 300 DPI to PDF points
          const x = line.bbox.x0 * scale;
          const y = (viewport.height - line.bbox.y1) * scale;
          const fontSize = Math.max(6, (line.bbox.y1 - line.bbox.y0) * scale * 0.8);

          newPage.drawText(line.text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            opacity: 0, // Invisible text layer
          });
        }
      }

      if (options.onProgress) {
        options.onProgress({
          status: 'recognizing',
          progress: ((i - pageRange.start + 1) / (pageRange.end - pageRange.start + 1)) * 100,
          currentPage: i,
          totalPages: pageRange.end - pageRange.start + 1,
        });
      }
    }

    return newDoc.save();
  }

  private async canvasToImageBytes(
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const arrayBuffer = await blob.arrayBuffer();
          resolve(new Uint8Array(arrayBuffer));
        },
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        0.95
      );
    });
  }

  private formatResult(data: any, pageNumber: number): OCRResult {
    const words: OCRWord[] = data.words?.map((w: any) => ({
      text: w.text,
      confidence: w.confidence,
      bbox: {
        x0: w.bbox.x0,
        y0: w.bbox.y0,
        x1: w.bbox.x1,
        y1: w.bbox.y1,
      },
      baseline: w.baseline || { x0: w.bbox.x0, y0: w.bbox.y1, x1: w.bbox.x1, y1: w.bbox.y1 },
    })) || [];

    const lines: OCRLine[] = data.lines?.map((l: any) => ({
      text: l.text,
      confidence: l.confidence,
      bbox: {
        x0: l.bbox.x0,
        y0: l.bbox.y0,
        x1: l.bbox.x1,
        y1: l.bbox.y1,
      },
      baseline: l.baseline || { x0: l.bbox.x0, y0: l.bbox.y1, x1: l.bbox.x1, y1: l.bbox.y1 },
      words: words.filter(w =>
        w.bbox.x0 >= l.bbox.x0 && w.bbox.x1 <= l.bbox.x1 &&
        w.bbox.y0 >= l.bbox.y0 && w.bbox.y1 <= l.bbox.y1
      ),
    })) || [];

    const paragraphs: OCRParagraph[] = data.paragraphs?.map((p: any) => ({
      text: p.text,
      confidence: p.confidence,
      bbox: {
        x0: p.bbox.x0,
        y0: p.bbox.y0,
        x1: p.bbox.x1,
        y1: p.bbox.y1,
      },
      lines: lines.filter(l =>
        l.bbox.x0 >= p.bbox.x0 && l.bbox.x1 <= p.bbox.x1 &&
        l.bbox.y0 >= p.bbox.y0 && l.bbox.y1 <= p.bbox.y1
      ),
    })) || [];

    const pages: OCRPage[] = [{
      pageNumber,
      text: data.text,
      confidence: data.confidence,
      bbox: { x0: 0, y0: 0, x1: data.width || 0, y1: data.height || 0 },
      words,
      lines,
      paragraphs,
    }];

    return {
      text: data.text,
      confidence: data.confidence,
      words,
      lines,
      paragraphs,
      pages,
    };
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  getSupportedLanguages(): string[] {
    return [
      'afr', 'amh', 'ara', 'asm', 'aze', 'aze_cyrl', 'bel', 'ben', 'bod', 'bos',
      'bre', 'bul', 'cat', 'ceb', 'ces', 'chi_sim', 'chi_tra', 'chr', 'cym',
      'dan', 'deu', 'dzo', 'ell', 'eng', 'enm', 'epo', 'equ', 'est', 'eus',
      'fao', 'fas', 'fil', 'fin', 'fra', 'frk', 'frm', 'gla', 'gle', 'glg',
      'grc', 'guj', 'hat', 'heb', 'hin', 'hrv', 'hun', 'iku', 'ind', 'isl',
      'ita', 'ita_old', 'jav', 'jpn', 'kan', 'kat', 'kat_old', 'kaz', 'khm',
      'kir', 'kmr', 'kor', 'kur', 'lao', 'lat', 'lav', 'lit', 'ltz', 'mal',
      'mar', 'mkd', 'mlt', 'mon', 'mri', 'msa', 'mya', 'nep', 'nld', 'nor',
      'oci', 'ori', 'pan', 'pol', 'por', 'pus', 'ron', 'rus', 'san', 'sin',
      'slk', 'slv', 'snd', 'spa', 'spa_old', 'sqi', 'srp', 'srp_latn', 'sun',
      'swa', 'swe', 'syr', 'tam', 'tat', 'tel', 'tgk', 'tgl', 'tha', 'tir',
      'ton', 'tur', 'uig', 'ukr', 'urd', 'uzb', 'uzb_cyrl', 'vie', 'yid', 'yor',
    ];
  }
}

export const ocrService = new OCRService();

// Need StandardFonts import
import { StandardFonts } from 'pdf-lib';