import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { X, Save, Download, Upload, Trash2, Edit2, FileText, Plus } from 'lucide-react';
import { WriterStyle } from '../../types/writer/document';
import { BUILTIN_TEMPLATES, StyleTemplate } from '../../data/writer/builtin-styles';
import { cn } from '../../lib/utils';

interface Template {
  id: string;
  name: string;
  description: string;
  styles: WriterStyle[];
  isBuiltin: boolean;
  modifiedAt: number;
  onExport?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

interface TemplatesDialogProps {
  currentStyles: WriterStyle[];
  onLoadTemplate: (template: Template, mode: 'replace' | 'merge') => void;
  onSaveTemplate: (name: string, description: string) => void;
  onClose: () => void;
}

const STORAGE_KEY = 'linuxoffice-user-templates';

function loadUserTemplates(): Template[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveUserTemplates(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function styleTemplateToTemplate(st: StyleTemplate): Template {
  return {
    id: st.id,
    name: st.name,
    description: st.description,
    styles: st.styles,
    isBuiltin: st.isBuiltin,
    modifiedAt: Date.now(), // Built-in templates use current time as fallback
  };
}

export function TemplatesDialog({
  currentStyles,
  onLoadTemplate,
  onSaveTemplate,
  onClose,
}: TemplatesDialogProps) {
  const [userTemplates, setUserTemplates] = useState<Template[]>(() => loadUserTemplates());
  const [activeTab, setActiveTab] = useState<'builtin' | 'user'>('builtin');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [contextMenu, setContextMenu] = useState<{ template: Template; x: number; y: number } | null>(null);

  const builtinTemplates = useMemo(() => BUILTIN_TEMPLATES.map(styleTemplateToTemplate), []);

  const handleSaveAsTemplate = () => {
    if (!saveName.trim()) return;
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      description: saveDescription.trim(),
      styles: currentStyles,
      isBuiltin: false,
      modifiedAt: Date.now(),
    };
    setUserTemplates(prev => [...prev, newTemplate]);
    saveUserTemplates([...userTemplates, newTemplate]);
    setSaveName('');
    setSaveDescription('');
    setSaveDialogOpen(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.styles && Array.isArray(data.styles)) {
          const newTemplate: Template = {
            id: crypto.randomUUID(),
            name: data.name || file.name.replace('.json', ''),
            description: data.description || 'Plantilla importada',
            styles: data.styles,
            isBuiltin: false,
            modifiedAt: Date.now(),
          };
          setUserTemplates(prev => [...prev, newTemplate]);
          saveUserTemplates([...userTemplates, newTemplate]);
        }
      } catch {
        alert('Archivo de plantilla inválido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = (template: Template) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (template: Template) => {
    if (template.isBuiltin) return;
    if (!confirm(`Eliminar plantilla "${template.name}"?`)) return;
    setUserTemplates(prev => prev.filter(t => t.id !== template.id));
    saveUserTemplates(userTemplates.filter(t => t.id !== template.id));
  };

  const handleRename = (template: Template) => {
    if (template.isBuiltin) return;
    const newName = prompt('Nuevo nombre:', template.name);
    if (!newName || newName === template.name) return;
    setUserTemplates(prev => prev.map(t => t.id === template.id ? { ...t, name: newName, modifiedAt: Date.now() } : t));
    saveUserTemplates(userTemplates.map(t => t.id === template.id ? { ...t, name: newName, modifiedAt: Date.now() } : t));
  };

  const handleContextMenu = (e: React.MouseEvent, template: Template) => {
    e.preventDefault();
    setContextMenu({ template, x: e.clientX, y: e.clientY });
  };

  return (
    <Dialog.Root>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[500px] max-h-[80vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold">Plantillas de estilos</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <Tabs.Root value={activeTab} onValueChange={(v: 'builtin' | 'user') => setActiveTab(v)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs.List className="flex border-b border-gray-200 bg-gray-50">
              <Tabs.Trigger value="builtin" className="flex-1 px-3 py-2 text-sm font-medium text-center hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                Plantillas integradas
              </Tabs.Trigger>
              <Tabs.Trigger value="user" className="flex-1 px-3 py-2 text-sm font-medium text-center hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                Mis plantillas
              </Tabs.Trigger>
            </Tabs.List>

            <div className="flex-1 overflow-auto p-4">
              {activeTab === 'builtin' ? (
                <div className="space-y-3">
                  {builtinTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onLoad={(mode) => onLoadTemplate(template, mode)}
                      onContextMenu={handleContextMenu}
                      canDelete={false}
                      canRename={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {userTemplates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay plantillas guardadas</p>
                      <button
                        onClick={() => setSaveDialogOpen(true)}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                      >
                        Crear primera plantilla
                      </button>
                    </div>
                  ) : (
                    userTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onLoad={(mode) => onLoadTemplate(template, mode)}
                        onExport={() => handleExport(template)}
                        onDelete={() => handleDelete(template)}
                        onRename={() => handleRename(template)}
                        onContextMenu={handleContextMenu}
                        canDelete={true}
                        canRename={true}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer actions for user templates */}
            {activeTab === 'user' && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Guardar como plantilla
                </button>
                <label className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Importar
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="sr-only"
                  />
                </label>
              </div>
            )}
          </Tabs.Root>
        </Dialog.Content>

        {/* Save as Template Dialog */}
        {saveDialogOpen && (
          <>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" onClick={() => setSaveDialogOpen(false)} />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-[400px] bg-white rounded-lg shadow-xl p-4">
            <Dialog.Title className="text-lg font-semibold mb-4">Guardar como plantilla</Dialog.Title>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Mi plantilla personalizada"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={saveDescription}
                  onChange={e => setSaveDescription(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descripción opcional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setSaveDialogOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100">Cancelar</button>
              <button onClick={handleSaveAsTemplate} disabled={!saveName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">Guardar</button>
            </div>
          </Dialog.Content>
        </>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu.Root open={true} onOpenChange={(open: boolean) => !open && setContextMenu(null)}>
            <ContextMenu.Portal>
              <ContextMenu.Content
                className="min-w-[160px] rounded-md border border-gray-200 bg-white p-1 shadow-lg"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                <ContextMenu.Item
                  onSelect={() => { onLoadTemplate(contextMenu.template, 'replace'); setContextMenu(null); onClose(); }}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                >
                  Cargar (reemplazar)
                </ContextMenu.Item>
                <ContextMenu.Item
                  onSelect={() => { onLoadTemplate(contextMenu.template, 'merge'); setContextMenu(null); onClose(); }}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                >
                  Cargar (mezclar)
                </ContextMenu.Item>
                {!contextMenu.template.isBuiltin && (
                  <>
                    <ContextMenu.Separator className="h-px bg-gray-200 my-1" />
                    <ContextMenu.Item
                      onSelect={() => { contextMenu.template.onRename?.(); setContextMenu(null); }}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4" />
                      Renombrar
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      onSelect={() => { contextMenu.template.onDelete?.(); setContextMenu(null); }}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm rounded text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      onSelect={() => { contextMenu.template.onExport?.(); setContextMenu(null); }}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                    >
                      <Download className="w-4 h-4" />
                      Exportar JSON
                    </ContextMenu.Item>
                  </>
                )}
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface TemplateCardProps {
  template: Template;
  onLoad: (mode: 'replace' | 'merge') => void;
  onExport?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onContextMenu: (e: React.MouseEvent, template: Template) => void;
  canDelete: boolean;
  canRename: boolean;
}

function TemplateCard({ template, onLoad, onContextMenu, canDelete, canRename }: TemplateCardProps) {
  return (
    <div
      className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
      onContextMenu={e => onContextMenu(e, template)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{template.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
            <span>{template.styles.length} estilos</span>
            {!template.isBuiltin && <span>• {new Date(template.modifiedAt).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onLoad('replace')}
          className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Cargar (reemplazar)
        </button>
        <button
          onClick={() => onLoad('merge')}
          className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cargar (mezclar)
        </button>
      </div>
    </div>
  );
}

export default TemplatesDialog;