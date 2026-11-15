import { useEffect, useRef, useCallback } from 'react';
import { WriterEditor } from './WriterEditor';
import { useTabs } from '../../hooks/useTabs';
import { useDocumentsStore } from '../../stores/documents';
import type { Tab } from '../../types/tab';
import type { WriterEditorRef } from '../../types/writer/document';

interface WriterTabProps {
  tab: Tab;
}

export function WriterTab({ tab }: WriterTabProps) {
  const writerEditorRef = useRef<WriterEditorRef | null>(null);
  const { updateTab, activateTab } = useTabs();
  const { getDocument, updateDocument } = useDocumentsStore();

  const document = getDocument(tab.documentId);

  // Handle file loading from document store
  useEffect(() => {
    if (document?.fileBytes && writerEditorRef.current) {
      writerEditorRef.current.loadFile(document.fileBytes);
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
    <WriterEditor
      ref={writerEditorRef}
      initialFile={document?.fileBytes}
      onSave={handleSave}
      onClose={handleClose}
      theme="light"
      readOnly={false}
    />
  );
}

export default WriterTab;