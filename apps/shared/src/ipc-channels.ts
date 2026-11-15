export const IPC_CHANNELS = {
  // File operations
  FILE_OPEN: 'file:open',
  FILE_SAVE: 'file:save',
  FILE_SAVE_AS: 'file:save-as',
  FILE_NEW: 'file:new',
  FILE_RECENT: 'file:recent',

  // Window operations
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_FULLSCREEN: 'window:fullscreen',

  // PDF operations
  PDF_MERGE: 'pdf:merge',
  PDF_SPLIT: 'pdf:split',
  PDF_COMPRESS: 'pdf:compress',
  PDF_CONVERT: 'pdf:convert',
  PDF_OCR: 'pdf:ocr',
  PDF_REORGANIZE: 'pdf:reorganize',
  PDF_EXTRACT_PAGES: 'pdf:extract-pages',
  PDF_DELETE_PAGES: 'pdf:delete-pages',
  PDF_EDIT: 'pdf:edit',

  // Office operations
  OFFICE_CONVERT: 'office:convert',
  OFFICE_EXPORT_PDF: 'office:export-pdf',

  // Editor operations
  EDITOR_UNDO: 'editor:undo',
  EDITOR_REDO: 'editor:redo',
  EDITOR_COPY: 'editor:copy',
  EDITOR_PASTE: 'editor:paste',
  EDITOR_CUT: 'editor:cut',
  EDITOR_FIND: 'editor:find',
  EDITOR_REPLACE: 'editor:replace',
  EDITOR_ZOOM_IN: 'editor:zoom-in',
  EDITOR_ZOOM_OUT: 'editor:zoom-out',
  EDITOR_ZOOM_RESET: 'editor:zoom-reset',
  EDITOR_PRINT: 'editor:print',

  // Dialog operations
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FILE: 'dialog:save-file',
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',
  DIALOG_MESSAGE_BOX: 'dialog:message-box',
  DIALOG_ERROR_BOX: 'dialog:error-box',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // App lifecycle
  APP_READY: 'app:ready',
  APP_QUIT: 'app:quit',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];