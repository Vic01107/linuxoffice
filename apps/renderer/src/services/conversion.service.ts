import { PDFDocument } from 'pdf-lib';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { pdfjsLib } from '../lib/pdf-worker';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export interface ConversionOptions {
  format: 'docx' | 'xlsx' | 'pptx' | 'images';
  quality?: number;
  pageRange?: { start: number; end: number };
  imageFormat?: 'png' | 'jpeg' | 'webp';
  dpi?: number;
}

export interface ConversionResult {
  success: boolean;
  data?: Uint8Array | Uint8Array[];
  error?: string;
  fileName?: string;
  mimeType?: string;
}

export class ConversionService {
  /**
   * Convert PDF to DOCX using mammoth (via PDF.js text extraction)
   */
  async pdfToDocx(pdfBytes: Uint8Array, options: ConversionOptions = { format: 'docx' }): Promise<ConversionResult> {
    try {
      const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const pageRange = options.pageRange || { start: 1, end: doc.numPages };
      const pages = Math.min(pageRange.end, doc.numPages) - Math.max(pageRange.start, 1) + 1;

      let fullText = '';
      for (let i = pageRange.start; i <= Math.min(pageRange.end, doc.numPages); i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .filter((item): item is TextItem => 'str' in item)
          .map((item) => item.str)
          .join(' ');
        fullText += text + '\n\n';
      }

      // Create a simple HTML structure that mammoth can convert
      const html = `
        <html>
          <body>
            ${fullText.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '<br/>').join('')}
          </body>
        </html>
      `;

      // mammoth converts DOCX to HTML, not HTML to DOCX
      // Create a basic DOCX using a template approach
      return this.createDocxFromText(fullText);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir a DOCX',
      };
    }
  }

  private async createDocxFromText(text: string): Promise<ConversionResult> {
    // Simple DOCX creation using a basic XML structure
    const docxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${text.split('\n').map(line =>
      line.trim() ?
      `<w:p><w:r><w:t>${this.escapeXml(line)}</w:t></w:r></w:p>` :
      `<w:p/>`
    ).join('')}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>
  </w:body>
</w:document>`;

    // Create a minimal DOCX (zip with [Content_Types].xml, _rels/.rels, word/document.xml)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    const wordFolder = zip.folder('word');
    wordFolder?.file('document.xml', docxContent);
    wordFolder?.folder('_rels')?.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);

    const buffer = await zip.generateAsync({ type: 'uint8array' });

    return {
      success: true,
      data: buffer,
      fileName: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  /**
   * Convert PDF to XLSX (extract tables/text to spreadsheet)
   */
  async pdfToXlsx(pdfBytes: Uint8Array, options: ConversionOptions = { format: 'xlsx' }): Promise<ConversionResult> {
    try {
      const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const pageRange = options.pageRange || { start: 1, end: doc.numPages };

      const workbook = XLSX.utils.book_new();

      for (let i = pageRange.start; i <= Math.min(pageRange.end, doc.numPages); i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .filter((item): item is TextItem => 'str' in item)
          .map((item) => item.str)
          .join(' ');

        // Simple approach: each page becomes a sheet with text in column A
        const rows = text.split('\n').map(line => [line.trim()]);
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, `Página ${i}`);
      }

      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      return {
        success: true,
        data: new Uint8Array(buffer),
        fileName: 'spreadsheet.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir a XLSX',
      };
    }
  }

  /**
   * Convert PDF to PPTX (each page as a slide)
   */
  async pdfToPptx(pdfBytes: Uint8Array, options: ConversionOptions = { format: 'pptx' }): Promise<ConversionResult> {
    try {
      const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const pageRange = options.pageRange || { start: 1, end: doc.numPages };

      // Render each page as image and embed in PPTX
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const images: Uint8Array[] = [];
      for (let i = pageRange.start; i <= Math.min(pageRange.end, doc.numPages); i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport, canvas }).promise;

        const imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.9);
        });
        const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
        images.push(imageBytes);
      }

      // Create minimal PPTX structure
      zip.file('[Content_Types].xml', this.getPptxContentTypes(images.length));
      zip.folder('_rels')?.file('.rels', this.getPptxRels());

      const pptFolder = zip.folder('ppt');
      pptFolder?.file('presentation.xml', this.getPptxPresentation(images.length));
      pptFolder?.folder('_rels')?.file('presentation.xml.rels', this.getPptxPresentationRels(images.length));

      // Create slides folder and _rels subfolder
      const slidesFolder = pptFolder?.folder('slides');
      slidesFolder?.folder('_rels');

      // Add slide layouts and masters
      pptFolder?.folder('slideLayouts')?.file('slideLayout1.xml', this.getSlideLayout());
      pptFolder?.folder('slideMasters')?.file('slideMaster1.xml', this.getSlideMaster());
      pptFolder?.folder('theme')?.file('theme1.xml', this.getTheme());

      // Add slides and images
      for (let i = 0; i < images.length; i++) {
        const slideNum = i + 1;
        slidesFolder?.file(`slide${slideNum}.xml`, this.getSlide(slideNum));
        const slideRelsFolder = slidesFolder?.folder('_rels');
        if (slideRelsFolder) {
          slideRelsFolder.file(`slide${slideNum}.xml.rels`, this.getSlideRels(slideNum));
        }
        const mediaFolder = zip.folder('ppt/media');
        const img = images[i];
        if (mediaFolder && img) {
          mediaFolder.file(`image${slideNum}.png`, img);
        }
      }

      const buffer = await zip.generateAsync({ type: 'uint8array' });

      return {
        success: true,
        data: buffer,
        fileName: 'presentation.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir a PPTX',
      };
    }
  }

  /**
   * Convert PDF to Images (PNG/JPEG/WebP)
   */
  async pdfToImages(pdfBytes: Uint8Array, options: ConversionOptions = { format: 'images' }): Promise<ConversionResult> {
    try {
      const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const pageRange = options.pageRange || { start: 1, end: doc.numPages };
      const format = options.imageFormat || 'png';
      const dpi = options.dpi || 150;
      const scale = dpi / 72;

      const images: Uint8Array[] = [];

      for (let i = pageRange.start; i <= Math.min(pageRange.end, doc.numPages); i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        await page.render({ canvasContext: context, viewport, canvas }).promise;

        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const quality = format === 'jpeg' ? 0.9 : undefined;

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), mimeType, quality);
        });
        const imageBytes = new Uint8Array(await blob.arrayBuffer());
        images.push(imageBytes);
      }

      if (images.length === 1) {
        return {
          success: true,
          data: images[0],
          fileName: `page_1.${format}`,
          mimeType: format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png',
        };
      }

      // Return ZIP with all images
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      images.forEach((img, i) => {
        const ext = format === 'jpeg' ? 'jpg' : format;
        if (img) {
          zip.file(`page_${i + 1}.${ext}`, img);
        }
      });
      const buffer = await zip.generateAsync({ type: 'uint8array' });

      return {
        success: true,
        data: buffer,
        fileName: 'pdf_images.zip',
        mimeType: 'application/zip',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir a imágenes',
      };
    }
  }

  /**
   * Convert images to PDF
   */
  async imagesToPdf(imageFiles: File[], options: { pageSize?: 'A4' | 'Letter' | 'auto' } = {}): Promise<ConversionResult> {
    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of imageFiles) {
        const bytes = await file.arrayBuffer();
        let image;

        if (file.type === 'image/jpeg') {
          image = await pdfDoc.embedJpg(new Uint8Array(bytes));
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(new Uint8Array(bytes));
        } else {
          // Try PNG as fallback
          image = await pdfDoc.embedPng(new Uint8Array(bytes));
        }

        const page = pdfDoc.addPage();
        const { width, height } = image.scale(1);

        if (options.pageSize === 'auto') {
          page.setSize(width, height);
        } else {
          const pageWidth = options.pageSize === 'A4' ? 595.28 : 612;
          const pageHeight = options.pageSize === 'A4' ? 841.89 : 792;
          page.setSize(pageWidth, pageHeight);

          // Scale image to fit page
          const scale = Math.min(pageWidth / width, pageHeight / height) * 0.95;
          const scaledWidth = width * scale;
          const scaledHeight = height * scale;
          const x = (pageWidth - scaledWidth) / 2;
          const y = (pageHeight - scaledHeight) / 2;

          page.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight });
        }
      }

      const pdfBytes = await pdfDoc.save();
      return {
        success: true,
        data: pdfBytes,
        fileName: 'images_to_pdf.pdf',
        mimeType: 'application/pdf',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir imágenes a PDF',
      };
    }
  }

  /**
   * Convert DOCX to PDF (basic - would need LibreOffice or similar for full fidelity)
   */
  async docxToPdf(file: File): Promise<ConversionResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

      // This is a placeholder - full DOCX to PDF requires a rendering engine
      // For now, return the text content as a simple PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Extract text from HTML (simplified)
      const text = html.replace(/<[^>]*>/g, '\n').replace(/\s+/g, ' ').trim();
      const lines = this.wrapText(text, width - 100, font, 12);

      let y = height - 50;
      for (const line of lines) {
        if (y < 50) {
          const newPage = pdfDoc.addPage();
          y = newPage.getSize().height - 50;
        }
        page.drawText(line, { x: 50, y, size: 12, font });
        y -= 16;
      }

      const pdfBytes = await pdfDoc.save();
      return {
        success: true,
        data: pdfBytes,
        fileName: file.name.replace(/\.docx?$/i, '.pdf'),
        mimeType: 'application/pdf',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir DOCX a PDF',
      };
    }
  }

  /**
   * Convert XLSX to PDF
   */
  async xlsxToPdf(file: File): Promise<ConversionResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];

        if (rows.length === 0) continue;

        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        let y = height - 50;

        // Draw sheet name
        page.drawText(sheetName, { x: 50, y, size: 14, font: fontBold });
        y -= 24;

        // Calculate column widths
        const colWidths = this.calculateColumnWidths(rows, font, 10, width - 100);

        for (const row of rows) {
          if (y < 50) {
            const newPage = pdfDoc.addPage();
            y = newPage.getSize().height - 50;
          }

          let x = 50;
          for (let i = 0; i < row.length; i++) {
            const cellText = String(row[i] || '').substring(0, 50);
            const cellFont = y === height - 74 ? fontBold : font;
            page.drawText(cellText, { x, y, size: 10, font: cellFont });
            x += (colWidths[i] ?? 50) + 10;
          }
          y -= 16;
        }
      }

      const pdfBytes = await pdfDoc.save();
      return {
        success: true,
        data: pdfBytes,
        fileName: file.name.replace(/\.xlsx?$/i, '.pdf'),
        mimeType: 'application/pdf',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir XLSX a PDF',
      };
    }
  }

  /**
   * Convert PPTX to PDF (basic)
   */
  async pptxToPdf(file: File): Promise<ConversionResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Extract slide content (simplified - real implementation would parse OOXML)
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // This is a placeholder - full PPTX parsing is complex
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      page.drawText('Conversión de PPTX a PDF', { x: 50, y: height - 50, size: 24, font: fontBold });
      page.drawText(`Archivo: ${file.name}`, { x: 50, y: height - 90, size: 12, font });
      page.drawText('Nota: La conversión completa requiere LibreOffice u motor de renderizado avanzado.', { x: 50, y: height - 130, size: 10, font });

      const pdfBytes = await pdfDoc.save();
      return {
        success: true,
        data: pdfBytes,
        fileName: file.name.replace(/\.pptx?$/i, '.pdf'),
        mimeType: 'application/pdf',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al convertir PPTX a PDF',
      };
    }
  }

  // Helper methods
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&apos;');
  }

  private wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private calculateColumnWidths(rows: string[][], font: any, fontSize: number, maxTotalWidth: number): number[] {
    if (rows.length === 0) return [];
    const colCount = Math.max(...rows.map(r => r.length));
    const widths = new Array(colCount).fill(0);

    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        const width = font.widthOfTextAtSize(String(row[i]).substring(0, 50), fontSize);
        widths[i] = Math.max(widths[i], width);
      }
    }

    const totalWidth = widths.reduce((a, b) => a + b, 0) + (colCount - 1) * 10;
    if (totalWidth > maxTotalWidth) {
      const scale = maxTotalWidth / totalWidth;
      return widths.map(w => w * scale);
    }
    return widths;
  }

  // PPTX XML templates
  private getPptxContentTypes(imageCount: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${Array.from({ length: imageCount }, (_, i) =>
    `<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('')}
</Types>`;
  }

  private getPptxRels(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
  }

  private getPptxPresentation(slideCount: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    ${Array.from({ length: slideCount }, (_, i) =>
      `<p:sldId id="${256 + i}" r:id="rId${i+1}"/>`
    ).join('')}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:defaultTextStyle/>
</p:presentation>`;
  }

  private getPptxPresentationRels(slideCount: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMaster1.xml"/>
  ${Array.from({ length: slideCount }, (_, i) =>
    `<Relationship Id="rId${i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`
  ).join('')}
  <Relationship Id="rId${slideCount + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;
  }

  private getSlideLayout(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree/></p:cSld>
</p:sldLayout>`;
  }

  private getSlideMaster(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree/></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldMaster>`;
  }

  private getTheme(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="4472C4"/></a:dk2>
      <a:lt2><a:srgbClr val="D9E2F3"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="548235"/></a:accent2>
      <a:accent3><a:srgbClr val="BF8F00"/></a:accent3>
      <a:accent4><a:srgbClr val="C00000"/></a:accent4>
      <a:accent5><a:srgbClr val="7030A0"/></a:accent5>
      <a:accent6><a:srgbClr val="00B0F0"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office"/>
  </a:themeElements>
</a:theme>`;
  }

  private getSlide(slideNum: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="1" name="Picture ${slideNum}"/>
          <p:cNvPicPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" r:embed="rId1"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:off x="0" y="0"/>
            <a:ext cx="9144000" cy="6858000"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`;
  }

  private getSlideRels(slideNum: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${slideNum}.png"/>
</Relationships>`;
  }
}

export const conversionService = new ConversionService();

// Need to import StandardFonts
import { StandardFonts } from 'pdf-lib';