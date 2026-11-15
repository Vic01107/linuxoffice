export type AppType = 'writer' | 'calc' | 'impress' | 'pdf';

export interface Tab {
  id: string;
  appType: AppType;
  title: string;
  filePath?: string;
  isDirty: boolean;
  isActive: boolean;
  documentId: string;
  createdAt: number;
  updatedAt: number;
}

export interface TabGroup {
  id: string;
  tabs: Tab[];
  activeTabId?: string;
}

export const DEFAULT_TABS: Record<AppType, Omit<Tab, 'id' | 'createdAt' | 'updatedAt'>> = {
  writer: { appType: 'writer', title: 'Documento sin título', isDirty: false, isActive: true, documentId: '', filePath: undefined },
  calc: { appType: 'calc', title: 'Hoja sin título', isDirty: false, isActive: true, documentId: '', filePath: undefined },
  impress: { appType: 'impress', title: 'Presentación sin título', isDirty: false, isActive: true, documentId: '', filePath: undefined },
  pdf: { appType: 'pdf', title: 'PDF sin título', isDirty: false, isActive: true, documentId: '', filePath: undefined },
};

export const APP_LABELS: Record<AppType, string> = {
  writer: 'Writer',
  calc: 'Calc',
  impress: 'Impress',
  pdf: 'PDF Editor',
};

export const APP_ICONS: Record<AppType, string> = {
  writer: 'FileText',
  calc: 'Table',
  impress: 'Presentation',
  pdf: 'FileType',
};