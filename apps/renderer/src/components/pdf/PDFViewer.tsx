import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { pdfjsLib } from '../../lib/pdf-worker';
import type { PDFPageInfo } from '../../services/pdf-lib.service';

// PDF.js types
import type { PDFDocumentProxy as PDFJSDocumentProxy, PDFPageProxy as PDFJSPageProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
  destroy(): void;
}

interface PDFPageProxy {
  getViewport(params: { scale: number }): { width: number; height: number; rotation: number };
  getTextContent(): Promise<{ items: Array<TextItem | TextMarkedContent> }>;
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: any; canvas?: HTMLCanvasElement }): { promise: Promise<void> };
}

export interface PDFViewerProps {
  fileBytes?: Uint8Array;
  fileUrl?: string;
  onPageChange?: (pageNumber: number) => void;
  onTextSelection?: (text: string, pageNumber: number) => void;
  onRenderError?: (error: Error) => void;
  scale?: number;
  theme?: 'light' | 'dark';
}

interface RenderedPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  viewport: { width: number; height: number };
}

export function PDFViewer({
  fileBytes,
  fileUrl,
  onPageChange,
  onTextSelection,
  onRenderError,
  scale = 1.5,
  theme = 'light',
}: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageInfoList, setPageInfoList] = useState<PDFPageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [renderedPages, setRenderedPages] = useState<Map<number, RenderedPage>>(new Map());
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const renderQueueRef = useRef<Set<number>>(new Set());
  const isRenderingRef = useRef(false);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;

    async function loadPDF() {
      try {
        setLoading(true);
        setError(null);

        let data: Uint8Array | ArrayBuffer;
        if (fileBytes) {
          data = fileBytes;
        } else if (fileUrl) {
          const response = await fetch(fileUrl);
          data = await response.arrayBuffer();
        } else {
          throw new Error('No PDF source provided');
        }

        const loadingTask = pdfjsLib.getDocument({ data });
        loadingTask.onPassword = (_updateCallback: any, reason: number) => {
          if (reason === pdfjsLib.PasswordResponses.NEED_PASSWORD) {
            const password = window.prompt('Ingrese la contraseña del PDF:');
            if (password) {
              return password;
            }
          }
          throw new Error('Contraseña requerida');
        };

        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc as unknown as PDFDocumentProxy);

        const pageInfos: PDFPageInfo[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          pageInfos.push({
            index: i - 1,
            width: viewport.width,
            height: viewport.height,
            rotation: viewport.rotation,
          });
        }
        setPageInfoList(pageInfos);
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onRenderError?.(error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPDF();

    return () => {
      cancelled = true;
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [fileBytes, fileUrl, onRenderError]);

  // Virtualizer for large documents
  const virtualizer = useVirtualizer({
    count: pageInfoList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const info = pageInfoList[index];
      return info ? info.height * scale + 20 : 800;
    },
    overscan: 5,
    paddingStart: 40,
    paddingEnd: 40,
  });

  // Track visible pages for lazy rendering
  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length > 0) {
      const firstItem = virtualItems[0];
      const lastItem = virtualItems[virtualItems.length - 1];
      if (firstItem && lastItem) {
        const start = firstItem.index;
        const end = lastItem.index;
        setVisibleRange({ start, end });
      }
    }
  }, [virtualizer]);

  // Render pages in viewport
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || renderQueueRef.current.has(pageNumber) || renderedPagesRef.current.get(pageNumber)) {
      return;
    }

    renderQueueRef.current.add(pageNumber);

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false })!;
      canvas.width = viewport.width * window.devicePixelRatio;
      canvas.height = viewport.height * window.devicePixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const renderContext = {
        canvasContext: context,
        viewport: page.getViewport({ scale: scale * window.devicePixelRatio }),
        canvas,
      };

      await page.render(renderContext).promise;

      const renderedPage: RenderedPage = {
        pageNumber,
        canvas,
        width: viewport.width,
        height: viewport.height,
        viewport: { width: viewport.width, height: viewport.height },
      };

      setRenderedPages((prev) => {
        const next = new Map(prev);
        next.set(pageNumber, renderedPage);
        return next;
      });
      renderedPagesRef.current.set(pageNumber, renderedPage);
    } catch (err) {
      console.error(`Error rendering page ${pageNumber}:`, err);
    } finally {
      renderQueueRef.current.delete(pageNumber);
    }
  }, [pdfDoc, scale]);

  const renderedPagesRef = useRef(renderedPages);
  renderedPagesRef.current = renderedPages;

  useEffect(() => {
    const pageNumbers = Array.from({ length: visibleRange.end - visibleRange.start + 1 }, (_, i) => visibleRange.start + i + 1);
    pageNumbers.forEach(renderPage);
  }, [visibleRange, renderPage]);

  // Handle text selection
  const handleTextSelection = useCallback(async (pageNumber: number) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .filter((item): item is TextItem => 'str' in item)
        .map((item) => item.str)
        .join(' ');
      onTextSelection?.(text, pageNumber);
    } catch (err) {
      console.error('Text selection error:', err);
    }
  }, [pdfDoc, onTextSelection]);

  // Calculate total height for scroll
  const totalHeight = useMemo(() => {
    return pageInfoList.reduce((sum, info) => sum + info.height * scale + 20, 0) + 80;
  }, [pageInfoList, scale]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-8">
        <div className="text-center text-red-500">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-lg font-medium">Error al cargar el PDF</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!pdfDoc || pageInfoList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">No hay páginas para mostrar</p>
      </div>
    );
  }

  const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const pageBgColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
  const shadowColor = theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)';

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto"
      style={{ backgroundColor: bgColor }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        }
      }}
    >
      <div
        ref={containerRef}
        style={{
          height: totalHeight,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const pageNumber = virtualRow.index + 1;
          const pageInfo = pageInfoList[virtualRow.index];
          const rendered = renderedPages.get(pageNumber);

          if (!pageInfo) return null;

          return (
            <div
              key={pageNumber}
              style={{
                position: 'absolute',
                top: virtualRow.start,
                left: 0,
                right: 0,
                height: virtualRow.size,
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0',
              }}
            >
              <div
                style={{
                  width: pageInfo.width * scale,
                  height: pageInfo.height * scale,
                  backgroundColor: pageBgColor,
                  boxShadow: `0 2px 8px ${shadowColor}`,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleTextSelection(pageNumber);
                }}
              >
                {rendered ? (
                  <div style={{ width: '100%', height: '100%' }}>
                    <img
                      src={rendered.canvas.toDataURL()}
                      alt={`Página ${pageNumber}`}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: theme === 'dark' ? '#3d3d3d' : '#f5f5f5' }}
                  >
                    <div className="animate-pulse flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span className="text-sm">Renderizando página {pageNumber}...</span>
                    </div>
                  </div>
                )}

                {/* Page number indicator */}
                <div
                  className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
                    color: theme === 'dark' ? '#fff' : '#333',
                  }}
                >
                  {pageNumber} / {pageInfoList.length}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PDFViewer;