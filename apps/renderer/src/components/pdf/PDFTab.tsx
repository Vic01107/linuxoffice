import { useEffect, useRef, useCallback } from 'react';
import { PDFEditor, PDFEditorRef } from './PDFEditor';
import { useTabs } from '../../hooks/useTabs';
import { useDocumentsStore } from '../../stores/documents';
import type { Tab } from '../../types/tab';

interface PDFTabProps {
  tab: Tab;
}

export function PDFTab({ tab }: PDFTabProps) {
  const pdfEditorRef = useRef<PDFEditorRef | null>(null);
  const { updateTab, activateTab } = useTabs();
  const { getDocument, updateDocument } = useDocumentsStore();

  const document = getDocument(tab.documentId);

  // Handle file loading from document store
  useEffect(() => {
    if (document?.fileBytes && pdfEditorRef.current) {
      pdfEditorRef.current.loadFile(document.fileBytes);
    }
  }, [document]);

  const handleSave = useCallback(async (bytes: Uint8Array, fileName: string) => {
    // Update document store
    updateDocument(tab.documentId, {
      fileBytes: bytes,
      fileName,
      isDirty: false,
    });

    // Update tab
    updateTab(tab.id, {
      title: fileName,
      filePath: fileName,
      isDirty: false,
      updatedAt: Date.now(),
    });
  }, [tab.documentId, tab.id, updateDocument, updateTab]);

  const handleClose = useCallback(() => {
    // The tab close is handled by the tab bar
  }, []);

  return (
    <PDFEditor
      ref={pdfEditorRef}
      initialFile={document?.fileBytes}
      onSave={handleSave}
      onClose={handleClose}
      theme="light"
      readOnly={false}
    />
  );
}

export default PDFTab;