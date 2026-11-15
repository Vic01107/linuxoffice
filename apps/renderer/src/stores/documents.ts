import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DocumentState, AppType } from '../types/document';

interface DocumentsState {
  documents: Record<string, DocumentState>;

  createDocument: (id: string, appType: AppType, filePath?: string) => DocumentState;
  getDocument: (id: string) => DocumentState | undefined;
  updateDocument: (id: string, updates: Partial<DocumentState>) => void;
  setDocumentContent: (id: string, content: DocumentState['content']) => void;
  markDirty: (id: string, dirty: boolean) => void;
  markSaved: (id: string) => void;
  deleteDocument: (id: string) => void;
  pushUndo: (id: string, action: unknown) => void;
  pushRedo: (id: string, action: unknown) => void;
  popUndo: (id: string) => unknown | undefined;
  popRedo: (id: string) => unknown | undefined;
  canUndo: (id: string) => boolean;
  canRedo: (id: string) => boolean;
}

export const useDocumentsStore = create<DocumentsState>()(
  immer((set, get) => ({
    documents: {},

    createDocument: (id, appType, filePath) => {
      const initialContent: DocumentState['content'] = {};
      const newDoc: DocumentState = {
        id,
        appType,
        filePath,
        content: initialContent,
        isDirty: false,
        isReadOnly: false,
        version: 0,
        undoStack: [],
        redoStack: [],
      };
      set((state) => {
        state.documents[id] = newDoc;
      });
      return newDoc;
    },

    getDocument: (id) => get().documents[id],

    updateDocument: (id, updates) => {
      set((state) => {
        if (state.documents[id]) {
          Object.assign(state.documents[id], updates);
        }
      });
    },

    setDocumentContent: (id, content) => {
      set((state) => {
        if (state.documents[id]) {
          state.documents[id].content = content;
          state.documents[id].isDirty = true;
          state.documents[id].version += 1;
        }
      });
    },

    markDirty: (id, dirty) => {
      set((state) => {
        if (state.documents[id]) {
          state.documents[id].isDirty = dirty;
        }
      });
    },

    markSaved: (id) => {
      set((state) => {
        if (state.documents[id]) {
          state.documents[id].isDirty = false;
          state.documents[id].lastSaved = Date.now();
        }
      });
    },

    deleteDocument: (id) => {
      set((state) => {
        delete state.documents[id];
      });
    },

    pushUndo: (id, action) => {
      set((state) => {
        if (state.documents[id]) {
          state.documents[id].undoStack.push(action);
          state.documents[id].redoStack = [];
        }
      });
    },

    pushRedo: (id, action) => {
      set((state) => {
        if (state.documents[id]) {
          state.documents[id].redoStack.push(action);
        }
      });
    },

    popUndo: (id) => {
      const doc = get().documents[id];
      return doc?.undoStack.pop();
    },

    popRedo: (id) => {
      const doc = get().documents[id];
      return doc?.redoStack.pop();
    },

    canUndo: (id) => {
      const doc = get().documents[id];
      return (doc?.undoStack.length ?? 0) > 0;
    },

    canRedo: (id) => {
      const doc = get().documents[id];
      return (doc?.redoStack.length ?? 0) > 0;
    },
  }))
);