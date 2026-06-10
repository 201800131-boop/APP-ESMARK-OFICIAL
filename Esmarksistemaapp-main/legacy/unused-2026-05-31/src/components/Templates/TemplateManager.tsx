import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, CheckCircle, Eye, FileText, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import UploadArea from './UploadArea';
import TemplateEditor from './TemplateEditor';
import { TemplateLayout } from './editor/model';
import {
  TemplateItem,
  assignTemplate,
  deleteTemplate,
  listTemplates,
  saveTemplateLayout,
  uploadTemplate
} from './template-api';

type TemplateType = 'factura' | 'recibo' | 'cotizacion';

const TYPE_LABELS: Record<TemplateType, string> = {
  factura: 'Factura',
  recibo: 'Recibo',
  cotizacion: 'Cotizacion'
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) {
    return '';
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export default function TemplateManager() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [activeTab, setActiveTab] = useState<TemplateType>('factura');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.type === activeTab),
    [templates, activeTab]
  );

  const activeTemplate = useMemo(
    () => filteredTemplates.find((template) => template.active),
    [filteredTemplates]
  );

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await listTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      setErrorMessage('No se pudieron cargar las plantillas');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleUpload = async (file: File, name: string, type: TemplateType) => {
    try {
      setUploading(true);
      setErrorMessage('');
      const created = await uploadTemplate(file, name, type);
      setSuccessMessage(`Plantilla "${created.name}" subida`);
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadTemplates();
    } catch (error: any) {
      console.error('Error uploading template:', error);
      setErrorMessage(error.message || 'No se pudo subir la plantilla');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Seguro que deseas eliminar esta plantilla?')) {
      return;
    }
    try {
      await deleteTemplate(templateId);
      setSuccessMessage('Plantilla eliminada');
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      setErrorMessage(error.message || 'No se pudo eliminar la plantilla');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleAssign = async (templateId: string, type: TemplateType) => {
    try {
      await assignTemplate(templateId, type);
      setSuccessMessage(`Plantilla activa para ${TYPE_LABELS[type]}`);
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadTemplates();
    } catch (error: any) {
      console.error('Error assigning template:', error);
      setErrorMessage(error.message || 'No se pudo activar la plantilla');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleSaveLayout = async (layout: TemplateLayout) => {
    if (!editingTemplate) return;
    try {
      await saveTemplateLayout(editingTemplate.id, layout);
      setSuccessMessage('Campos guardados');
      setTimeout(() => setSuccessMessage(''), 4000);
      setEditingTemplate(null);
      await loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      setErrorMessage(error.message || 'No se pudo guardar la plantilla');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleEdit = (template: TemplateItem) => {
    if (!template.preview_url && !template.pdf_base_url) {
      setErrorMessage('La plantilla no tiene PDF base disponible.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    setEditingTemplate(template);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          Plantillas
        </h1>
        <p className="text-sm text-gray-600">
          Sube un PDF base y configura los campos manualmente en el Editor de Plantilla.
        </p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TemplateType)}>
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="factura">Factura</TabsTrigger>
          <TabsTrigger value="recibo">Recibo</TabsTrigger>
          <TabsTrigger value="cotizacion">Cotizacion</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <UploadArea type={activeTab} onUpload={handleUpload} uploading={uploading} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plantillas disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-sm text-gray-500">Cargando...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-sm text-gray-500">No hay plantillas en este tipo.</div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-gray-800">{template.name}</span>
                          {template.active && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">
                              <ShieldCheck className="h-3 w-3" />
                              Activa
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(template.created_at)}
                          {template.file_size ? ` � ${formatFileSize(template.file_size)}` : ''}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {template.preview_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Ver
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        {!template.active && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAssign(template.id, template.type)}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Activar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                {activeTemplate && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                    Plantilla activa: {activeTemplate.name}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveLayout}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {previewTemplate && previewTemplate.preview_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="text-sm font-semibold">{previewTemplate.name}</div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>
                Cerrar
              </Button>
            </div>
            <div className="max-h-[75vh] overflow-auto bg-gray-50 p-4">
              {previewTemplate.mime_type === 'application/pdf' ? (
                <div className="h-[70vh] w-full rounded border bg-white flex items-center justify-center text-sm text-gray-600">
                  Vista previa de PDF deshabilitada (usa "Editar" para ver la hoja renderizada y colocar campos).
                </div>
              ) : (
                <img
                  src={previewTemplate.preview_url}
                  alt={previewTemplate.name}
                  className="h-auto w-full rounded border"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// Archivo eliminado. Migrado a Facturacion.
