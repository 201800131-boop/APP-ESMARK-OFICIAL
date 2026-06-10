import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { TemplateLayout, TemplateRecord } from './editor/model';
// Archivo eliminado. Migrado a Facturacion.
type TemplateType = 'factura' | 'recibo' | 'cotizacion';

export interface TemplateItem extends TemplateRecord {
  storage_path: string;
  mime_type: string;
  file_size: number;
  active: boolean;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/esmark-sync`;

const authHeaders = () => ({
  Authorization: `Bearer ${publicAnonKey}`
});

export async function listTemplates(): Promise<TemplateItem[]> {
  const response = await fetch(`${BASE_URL}/templates`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('No se pudieron cargar las plantillas');
  }
  const data = await response.json();
  return data.templates || [];
}

export async function uploadTemplate(file: File, name: string, type: TemplateType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('type', type);

  const response = await fetch(`${BASE_URL}/templates`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'No se pudo subir la plantilla');
  }

  const data = await response.json();
  return data.template as TemplateItem;
}

export async function deleteTemplate(templateId: string) {
  const response = await fetch(`${BASE_URL}/templates/${templateId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error('No se pudo eliminar la plantilla');
  }
}

export async function assignTemplate(templateId: string, type: TemplateType) {
  const response = await fetch(`${BASE_URL}/templates/${templateId}/assign`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ target: type })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'No se pudo activar la plantilla');
  }
}

export async function saveTemplateLayout(templateId: string, layout: TemplateLayout) {
  const response = await fetch(`${BASE_URL}/templates/${templateId}/fields`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(layout)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'No se pudo guardar la plantilla');
  }

  const data = await response.json();
  return data.template as TemplateRecord;
}
