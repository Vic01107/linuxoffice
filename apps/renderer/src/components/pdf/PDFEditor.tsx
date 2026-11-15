import { useState, useCallback, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { PDFViewer } from './PDFViewer';
import { PageManager } from './PageManager';
import { PDFToolbar } from './PDFToolbar';
import { pdfLibService, PDFPageInfo, CompressOptions } from '../../services/pdf-lib.service';
import { conversionService } from '../../services/conversion.service';
import { ocrService, OCROptions, OCRProgress } from '../../services/ocr.service';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Image,
  Download,
  Save,
  Upload,
  Trash2,
  RotateCcw,
  RotateCw,
  FolderOpen,
} from 'lucide-react';

export interface PDFEditorProps {
  initialFile?: File | Uint8Array;
  onClose?: () => void;
  onSave?: (bytes: Uint8Array, fileName: string) => void;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
}

export interface PDFEditorRef {
  loadFile: (file: File | Uint8Array) => Promise<void>;
  save: () => Promise<Uint8Array>;
}

const PDFEditorComponent = forwardRef<PDFEditorRef, PDFEditorProps>(({
  initialFile,
  onClose: _onClose,
  onSave,
  theme = 'light',
  readOnly = false,
}, ref) => {
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('documento.pdf');
  const [pageInfoList, setPageInfoList] = useState<PDFPageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [viewMode, setViewMode] = useState<'single' | 'continuous' | 'facing'>('continuous');
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showOutline, setShowOutline] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProtected, setIsProtected] = useState(false);
  const [canEdit, setCanEdit] = useState(!readOnly);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPageManager, setShowPageManager] = useState(false);
  const [showCompressDialog, setShowCompressDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showOCRDialog, setShowOCRDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [splitRanges, setSplitRanges] = useState<Array<{ start: number; end: number }>>([]);
  const [compressOptions, setCompressOptions] = useState<CompressOptions>({ quality: 'medium' });

  const pdfViewerRef = useRef<HTMLDivElement>(null);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    loadFile,
    save: async () => {
      if (!fileBytes) throw new Error('No file loaded');
      return pdfLibService.save();
    },
  }));

  // Load initial file
  useEffect(() => {
    if (initialFile) {
      loadFile(initialFile);
    }
  }, [initialFile]);

  // Load file into pdf-lib service
  const loadFile = useCallback(async (file: File | Uint8Array) => {
    setLoading(true);
    setError(null);
    try {
      let bytes: Uint8Array;
      let name: string;

      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        bytes = new Uint8Array(arrayBuffer);
        name = file.name;
      } else {
        bytes = file;
        name = 'documento.pdf';
      }

      await pdfLibService.loadFromBytes(bytes);
      const pageInfos = pdfLibService.getAllPageInfo();

      setFileBytes(bytes);
      setFileName(name);
      setPageInfoList(pageInfos);
      setCurrentPage(1);
      setSelectedPages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el archivo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle scale change
  const handleScaleChange = useCallback((newScale: number) => {
    setScale(Math.max(0.1, Math.min(5, newScale)));
  }, []);

  // File operations
  const handleOpenFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) loadFile(file);
    };
    input.click();
  }, [loadFile]);

  const handleSaveFile = useCallback(async () => {
    if (!fileBytes) return;
    try {
      const savedBytes = await pdfLibService.save();
      onSave?.(savedBytes, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  }, [fileBytes, fileName, onSave]);

  const handleSaveAsFile = useCallback(async () => {
    if (!fileBytes) return;
    try {
      const savedBytes = await pdfLibService.save();
      const blob = new Blob([savedBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar como');
    }
  }, [fileBytes, fileName]);

  // Merge PDFs
  const executeMerge = useCallback(async () => {
    if (mergeFiles.length === 0) return;
    setLoading(true);
    try {
      const otherBytes = await Promise.all(
        mergeFiles.map(f => f.arrayBuffer().then(b => new Uint8Array(b)))
      );
      const mergedBytes = await pdfLibService.mergePDFs(otherBytes);
      setFileBytes(mergedBytes);
      setPageInfoList(pdfLibService.getAllPageInfo());
      setMergeFiles([]);
      setShowMergeDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al combinar');
    } finally {
      setLoading(false);
    }
  }, [mergeFiles]);

  // Split PDF
  const executeSplit = useCallback(async () => {
    if (splitRanges.length === 0) return;
    setLoading(true);
    try {
      const results = await pdfLibService.splitPDF({ ranges: splitRanges });
      // Save each split as separate file
      results.forEach((bytes, i) => {
        const blob = new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.replace(/\.pdf$/i, '')}_parte${i + 1}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
      setSplitRanges([]);
      setShowSplitDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al dividir');
    } finally {
      setLoading(false);
    }
  }, [splitRanges, fileName]);

  // Compress PDF
  const executeCompress = useCallback(async () => {
    setLoading(true);
    try {
      const compressedBytes = await pdfLibService.compressPDF(compressOptions);
      setFileBytes(compressedBytes);
      setPageInfoList(pdfLibService.getAllPageInfo());
      setShowCompressDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al comprimir');
    } finally {
      setLoading(false);
    }
  }, [compressOptions]);

  // Conversion
  const handleConvertPDF = useCallback(async (format: 'docx' | 'xlsx' | 'pptx' | 'images') => {
    if (!fileBytes) return;
    setLoading(true);
    try {
      let result;
      switch (format) {
        case 'docx':
          result = await conversionService.pdfToDocx(fileBytes);
          break;
        case 'xlsx':
          result = await conversionService.pdfToXlsx(fileBytes);
          break;
        case 'pptx':
          result = await conversionService.pdfToPptx(fileBytes);
          break;
        case 'images':
          result = await conversionService.pdfToImages(fileBytes);
          break;
      }

      if (result.success && result.data) {
        const dataArray = Array.isArray(result.data) ? result.data : [result.data];
        const data = dataArray[0] as Uint8Array | undefined;
        if (data) {
          const blob = new Blob([data as unknown as ArrayBuffer], { type: result.mimeType || 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.fileName || `documento.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        setError(result.error || 'Error en la conversión');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la conversión');
    } finally {
      setLoading(false);
      setShowConvertDialog(false);
    }
  }, [fileBytes]);

  // OCR
  const executeOCR = useCallback(async () => {
    if (!fileBytes) return;
    setLoading(true);
    setOcrProgress({ status: 'loading', progress: 0 });
    try {
      const searchablePdf = await ocrService.createSearchablePDF(fileBytes, {
        onProgress: setOcrProgress,
      });
      setFileBytes(searchablePdf);
      setPageInfoList(pdfLibService.getAllPageInfo());
      setOcrProgress({ status: 'done', progress: 100 });
      setShowOCRDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en OCR');
      setOcrProgress(null);
    } finally {
      setLoading(false);
    }
  }, [fileBytes]);

  // Page management
  const handleRotatePages = useCallback(async (rotation: 90 | 180 | 270) => {
    if (selectedPages.length === 0) return;
    setLoading(true);
    try {
      const rotatedBytes = await pdfLibService.rotatePages(selectedPages, rotation);
      setFileBytes(rotatedBytes);
      setPageInfoList(pdfLibService.getAllPageInfo());
      setSelectedPages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rotar');
    } finally {
      setLoading(false);
    }
  }, [selectedPages]);

  const handleDeletePages = useCallback(async () => {
    if (selectedPages.length === 0) return;
    setLoading(true);
    try {
      const newBytes = await pdfLibService.deletePages(selectedPages);
      setFileBytes(newBytes);
      setPageInfoList(pdfLibService.getAllPageInfo());
      setSelectedPages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  }, [selectedPages]);

  const handleExtractPages = useCallback(async () => {
    if (selectedPages.length === 0) return;
    setLoading(true);
    try {
      const extractedBytes = await pdfLibService.extractPages(selectedPages);
      const blob = new Blob([extractedBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.pdf$/i, '')}_extracted.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSelectedPages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al extraer');
    } finally {
      setLoading(false);
    }
  }, [selectedPages, fileName]);

  const handleReorderPages = useCallback(async (newOrder: number[]) => {
    setLoading(true);
    try {
      const reorderedBytes = await pdfLibService.reorderPages(newOrder);
      setFileBytes(reorderedBytes);
      setPageInfoList(pdfLibService.getAllPageInfo());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reordenar');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTogglePageSelection = useCallback((pageNumber: number) => {
    setSelectedPages(prev => prev.includes(pageNumber)
      ? prev.filter(p => p !== pageNumber)
      : [...prev, pageNumber]
    );
  }, []);

  // Render dialogs
  const renderMergeDialog = () => (
    <div className="p-4 space-y-4" style={{ color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
      <h3 className="text-lg font-medium">Combinar PDFs</h3>
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
        style={{
          borderColor: theme === 'dark' ? '#444' : '#ddd',
          backgroundColor: theme === 'dark' ? '#2d2d2d' : '#fafafa',
        }}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = theme === 'dark' ? '#444' : '#ddd'; }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = theme === 'dark' ? '#444' : '#ddd';
          const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
          setMergeFiles(prev => [...prev, ...files]);
        }}
      >
        <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Soltar archivos PDF aquí</p>
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.multiple = true;
            input.onchange = (e) => {
              const files = Array.from((e.target as HTMLInputElement).files || []).filter(f => f.type === 'application/pdf');
              setMergeFiles(prev => [...prev, ...files]);
            };
            input.click();
          }}
          className="mt-2 text-sm underline"
        >
          o haz clic para seleccionar
        </button>
      </div>
      {mergeFiles.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-auto">
          {mergeFiles.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5' }}>
              <span className="text-sm truncate flex-1">{file.name}</span>
              <button onClick={() => setMergeFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => { setMergeFiles([]); setShowMergeDialog(false); }} className="px-4 py-2 rounded border" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>Cancelar</button>
        <button onClick={executeMerge} disabled={mergeFiles.length === 0 || loading} className="px-4 py-2 rounded" style={{ backgroundColor: '#3b82f6', color: 'white', opacity: mergeFiles.length === 0 || loading ? 0.5 : 1 }}>Combinar ({mergeFiles.length})</button>
      </div>
    </div>
  );

  const renderSplitDialog = () => (
    <div className="p-4 space-y-4" style={{ color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
      <h3 className="text-lg font-medium">Dividir PDF</h3>
      <p className="text-sm opacity-70">Total de páginas: {pageInfoList.length}</p>
      <div className="space-y-2">
        {splitRanges.map((range, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="number" min="1" max={pageInfoList.length} value={range.start} onChange={(e) => setSplitRanges(prev => { const n = [...prev]; const val = parseInt(e.target.value, 10); n[i] = { start: Math.min(isNaN(val) ? 1 : val, pageInfoList.length), end: range.end }; return n; })} className="w-20 px-2 py-1 rounded border text-sm" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', backgroundColor: theme === 'dark' ? '#2d2d2d' : 'white', color: theme === 'dark' ? '#e0e0e0' : '#333' }} />
            <span>a</span>
            <input type="number" min="1" max={pageInfoList.length} value={range.end} onChange={(e) => setSplitRanges(prev => { const n = [...prev]; const val = parseInt(e.target.value, 10); n[i] = { start: range.start, end: Math.min(isNaN(val) ? pageInfoList.length : val, pageInfoList.length) }; return n; })} className="w-20 px-2 py-1 rounded border text-sm" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', backgroundColor: theme === 'dark' ? '#2d2d2d' : 'white', color: theme === 'dark' ? '#e0e0e0' : '#333' }} />
            <button onClick={() => setSplitRanges(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <button onClick={() => setSplitRanges(prev => [...prev, { start: 1, end: pageInfoList.length }])} className="text-sm text-blue-500 hover:underline">Añadir rango</button>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => { setSplitRanges([]); setShowSplitDialog(false); }} className="px-4 py-2 rounded border" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>Cancelar</button>
        <button onClick={executeSplit} disabled={splitRanges.length === 0 || loading} className="px-4 py-2 rounded" style={{ backgroundColor: '#3b82f6', color: 'white', opacity: splitRanges.length === 0 || loading ? 0.5 : 1 }}>Dividir</button>
      </div>
    </div>
  );

  const renderCompressDialog = () => (
    <div className="p-4 space-y-4" style={{ color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
      <h3 className="text-lg font-medium">Comprimir PDF</h3>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="quality" value="high" checked={compressOptions.quality === 'high'} onChange={() => setCompressOptions({ ...compressOptions, quality: 'high' })} />
          <span>Alta calidad (menos compresión)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="quality" value="medium" checked={compressOptions.quality === 'medium'} onChange={() => setCompressOptions({ ...compressOptions, quality: 'medium' })} />
          <span>Calidad media (recomendado)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="quality" value="low" checked={compressOptions.quality === 'low'} onChange={() => setCompressOptions({ ...compressOptions, quality: 'low' })} />
          <span>Baja calidad (máxima compresión)</span>
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => setShowCompressDialog(false)} className="px-4 py-2 rounded border" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>Cancelar</button>
        <button onClick={executeCompress} disabled={loading} className="px-4 py-2 rounded" style={{ backgroundColor: '#3b82f6', color: 'white', opacity: loading ? 0.5 : 1 }}>Comprimir</button>
      </div>
    </div>
  );

  const renderOCRDialog = () => (
    <div className="p-4 space-y-4" style={{ color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
      <h3 className="text-lg font-medium">OCR (Reconocimiento de Texto)</h3>
      <p className="text-sm opacity-70">Convierte PDF escaneado en texto buscable</p>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="language" value="spa+eng" checked={true} onChange={() => {}} />
          <span>Español + Inglés</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="language" value="eng" onChange={() => {}} />
          <span>Solo Inglés</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="language" value="spa" onChange={() => {}} />
          <span>Solo Español</span>
        </label>
      </div>
      {ocrProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{ocrProgress.status === 'recognizing' ? `Página ${ocrProgress.currentPage} de ${ocrProgress.totalPages}` : ocrProgress.status}</span>
            <span>{Math.round(ocrProgress.progress)}%</span>
          </div>
          <div className="w-full h-2 rounded overflow-hidden" style={{ backgroundColor: theme === 'dark' ? '#2d2d2d' : '#e0e0e0' }}>
            <div className="h-full transition-all duration-300" style={{ width: `${ocrProgress.progress}%`, backgroundColor: '#3b82f6' }} />
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => { setOcrProgress(null); setShowOCRDialog(false); }} className="px-4 py-2 rounded border" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>Cancelar</button>
        <button onClick={executeOCR} disabled={loading} className="px-4 py-2 rounded" style={{ backgroundColor: '#3b82f6', color: 'white', opacity: loading ? 0.5 : 1 }}>Ejecutar OCR</button>
      </div>
    </div>
  );

  const renderConvertDialog = () => (
    <div className="p-4 space-y-4" style={{ color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
      <h3 className="text-lg font-medium">Convertir PDF</h3>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleConvertPDF('docx')} className="p-4 rounded-lg text-left border transition-colors" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', backgroundColor: theme === 'dark' ? '#2d2d2d' : '#fafafa', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
          <FileText className="w-8 h-8 mb-2 text-blue-500" />
          <div className="font-medium">DOCX (Word)</div>
          <div className="text-sm opacity-70">Documento editable</div>
        </button>
        <button onClick={() => handleConvertPDF('xlsx')} className="p-4 rounded-lg text-left border transition-colors" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', backgroundColor: theme === 'dark' ? '#2d2d2d' : '#fafafa', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
          <FileText className="w-8 h-8 mb-2 text-green-500" />
          <div className="font-medium">XLSX (Excel)</div>
          <div className="text-sm opacity-70">Hoja de cálculo</div>
        </button>
        <button onClick={() => handleConvertPDF('pptx')} className="p-4 rounded-lg text-left border transition-colors" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', backgroundColor: theme === 'dark' ? '#2d2d2d' : '#fafafa', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
          <FileText className="w-8 h-8 mb-2 text-orange-500" />
          <div className="font-medium">PPTX (PowerPoint)</div>
          <div className="text-sm opacity-70">Presentación</div>
        </button>
        <button onClick={() => handleConvertPDF('images')} className="p-4 rounded-lg text-left border transition-colors" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', backgroundColor: theme === 'dark' ? '#2d2d2d' : '#fafafa', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>
          <Image className="w-8 h-8 mb-2 text-purple-500" />
          <div className="font-medium">Imágenes (PNG/JPG)</div>
          <div className="text-sm opacity-70">Páginas como imágenes</div>
        </button>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => setShowConvertDialog(false)} className="px-4 py-2 rounded border" style={{ borderColor: theme === 'dark' ? '#444' : '#ddd', color: theme === 'dark' ? '#e0e0e0' : '#333' }}>Cancelar</button>
      </div>
    </div>
  );

  const renderDialog = () => {
    if (showMergeDialog) return renderMergeDialog();
    if (showSplitDialog) return renderSplitDialog();
    if (showCompressDialog) return renderCompressDialog();
    if (showOCRDialog) return renderOCRDialog();
    if (showConvertDialog) return renderConvertDialog();
    return null;
  };

  // Render
  const borderColor = theme === 'dark' ? '#333' : '#e0e0e0';
  const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgColor }}>
      {/* Toolbar */}
      <PDFToolbar
        theme={theme}
        currentPage={currentPage}
        pageCount={pageInfoList.length}
        scale={scale}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showThumbnails={showThumbnails}
        showOutline={showOutline}
        showAnnotations={showAnnotations}
        isSearchOpen={isSearchOpen}
        setSearchOpen={setSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedPagesCount={selectedPages.length}
        canEdit={canEdit}
        isProtected={isProtected}
        loading={loading}
        onPageChange={handlePageChange}
        onScaleChange={handleScaleChange}
        onViewModeChange={setViewMode}
        onThumbnailsToggle={setShowThumbnails}
        onToggleOutline={setShowOutline}
        onToggleAnnotations={setShowAnnotations}
        onSearchToggle={setSearchOpen}
        onSearchChange={setSearchQuery}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onSaveAsFile={handleSaveAsFile}
        onPrint={() => window.print()}
        onRotateLeft={() => handleRotatePages(270)}
        onRotateRight={() => handleRotatePages(90)}
        onDeletePages={handleDeletePages}
        onExtractPages={handleExtractPages}
        onShowPageManager={setShowPageManager}
        onShowCompressDialog={setShowCompressDialog}
        onShowConvertDialog={setShowConvertDialog}
        onShowOCRDialog={setShowOCRDialog}
        onShowMergeDialog={setShowMergeDialog}
        onShowSplitDialog={setShowSplitDialog}
        onMergePDFs={() => setShowMergeDialog(true)}
        onSplitPDF={() => setShowSplitDialog(true)}
        onCompressPDF={() => setShowCompressDialog(true)}
        onConvertPDF={() => setShowConvertDialog(true)}
        onOCR={() => setShowOCRDialog(true)}
        onAddText={() => {}}
        onAddImage={() => {}}
        onAddAnnotation={() => {}}
        onSearch={setSearchQuery}
        onFirstPage={() => handlePageChange(1)}
        onLastPage={() => handlePageChange(pageInfoList.length)}
        onPrevPage={() => handlePageChange(Math.max(1, currentPage - 1))}
        onNextPage={() => handlePageChange(Math.min(pageInfoList.length, currentPage + 1))}
        onPresentationMode={() => {}}
        onProtectPDF={() => {}}
        onUnprotectPDF={() => {}}
        onSignPDF={() => {}}
        onRedact={() => {}}
        onComparePDFs={() => {}}
        onExtractImages={() => {}}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {(showThumbnails || showOutline || showAnnotations) && (
          <div className="w-64 border-r flex-shrink-0 flex flex-col" style={{ borderColor, backgroundColor: theme === 'dark' ? '#252525' : '#fafafa' }}>
            <div className="flex border-b px-2 py-1" style={{ borderColor }}>
              {showThumbnails && (
                <button
                  onClick={() => setShowThumbnails(true)}
                  className="flex-1 py-1 text-sm font-medium rounded"
                  style={{
                    backgroundColor: showThumbnails ? (theme === 'dark' ? '#3b82f6' : '#e0e0e0') : 'transparent',
                    color: showThumbnails ? (theme === 'dark' ? 'white' : '#333') : (theme === 'dark' ? '#ccc' : '#666'),
                  }}
                >
                  Miniaturas
                </button>
              )}
              {showOutline && (
                <button
                  onClick={() => setShowOutline(true)}
                  className="flex-1 py-1 text-sm font-medium rounded"
                  style={{
                    backgroundColor: showOutline ? (theme === 'dark' ? '#3b82f6' : '#e0e0e0') : 'transparent',
                    color: showOutline ? (theme === 'dark' ? 'white' : '#333') : (theme === 'dark' ? '#ccc' : '#666'),
                  }}
                >
                  Esquema
                </button>
              )}
              {showAnnotations && (
                <button
                  onClick={() => setShowAnnotations(true)}
                  className="flex-1 py-1 text-sm font-medium rounded"
                  style={{
                    backgroundColor: showAnnotations ? (theme === 'dark' ? '#3b82f6' : '#e0e0e0') : 'transparent',
                    color: showAnnotations ? (theme === 'dark' ? 'white' : '#333') : (theme === 'dark' ? '#ccc' : '#666'),
                  }}
                >
                  Anotaciones
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto">
              {showThumbnails && (
                <div className="p-2">
                  {pageInfoList.map((info, i) => (
                    <div
                      key={i}
                      className="mb-2 cursor-pointer relative"
                      onClick={() => handlePageChange(i + 1)}
                      style={{
                        border: selectedPages.includes(i + 1) ? '2px solid #3b82f6' : '1px solid transparent',
                        borderRadius: '4px',
                        opacity: selectedPages.includes(i + 1) ? 0.7 : 1,
                      }}
                    >
                      <div className="aspect-[0.7] bg-white rounded shadow-sm overflow-hidden" style={{ borderColor }}>
                        <canvas
                          ref={(canvas) => {
                            if (canvas && pdfLibService.getPDFDocProxy()) {
                              pdfLibService.getPDFDocProxy()!.getPage(i + 1).then(page => {
                                const viewport = page.getViewport({ scale: 0.3 });
                                canvas.width = viewport.width;
                                canvas.height = viewport.height;
                                const context = canvas.getContext('2d')!;
                                void page.render({ canvasContext: context, viewport, canvas }).promise;
                              });
                            }
                          }}
                        />
                      </div>
                      <div className="text-xs text-center mt-1" style={{ color: theme === 'dark' ? '#ccc' : '#666' }}>
                        {i + 1}
                      </div>
                      {selectedPages.includes(i + 1) && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#3b82f6' }}>
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showOutline && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Esquema no disponible
                </div>
              )}
              {showAnnotations && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Anotaciones no disponibles
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Manager Sidebar */}
        {showPageManager && (
          <div className="w-80 border-l flex-shrink-0" style={{ borderColor }}>
            <PageManager
              pageInfoList={pageInfoList}
              selectedPages={selectedPages}
              onSelectionChange={setSelectedPages}
              onReorder={handleReorderPages}
              onRotatePages={(indices, rotation) => handleRotatePages(rotation)}
              onDeletePages={handleDeletePages}
              onExtractPages={handleExtractPages}
              theme={theme}
            />
          </div>
        )}

        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          <PDFViewer
            fileBytes={fileBytes || undefined}
            onPageChange={handlePageChange}
            scale={scale}
            theme={theme}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-t text-xs" style={{ borderColor, color: theme === 'dark' ? '#888' : '#666' }}>
        <span>Página {currentPage} de {pageInfoList.length}</span>
        <span className="px-2 py-0.5 rounded" style={{ backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f0f0f0' }}>
          {Math.round(scale * 100)}%
        </span>
        <span>{fileName}</span>
        <div className="flex-1" />
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#3b82f6' }} />
        )}
      </div>

      {/* Dialogs */}
      {(showMergeDialog || showSplitDialog || showCompressDialog || showOCRDialog || showConvertDialog) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => { setShowMergeDialog(false); setShowSplitDialog(false); setShowCompressDialog(false); setShowOCRDialog(false); setShowConvertDialog(false); }}>
          <div className="w-full max-w-md rounded-lg shadow-xl animate-in zoom-in-95 fade-in duration-200" style={{ backgroundColor: theme === 'dark' ? '#1e1e1e' : 'white' }} onClick={e => e.stopPropagation()}>
            {renderDialog()}
          </div>
        </div>
      )}
    </div>
  );
});

PDFEditorComponent.displayName = 'PDFEditor';
export const PDFEditor = PDFEditorComponent;