export type TemplateFieldKind = 'text' | 'textarea' | 'money' | 'date' | 'number';
export type TemplateFieldAlign = 'left' | 'center' | 'right';
export type TemplateFieldOverflow = 'shrink' | 'clip' | 'ellipsis';

export interface TemplatePage {
  page: number;
  width_px?: number;
  height_px?: number;
}

export interface TemplateField {
  id: string;
  name: string;
  kind: TemplateFieldKind;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fontFamily: string;
  fontSize: number;
  align: TemplateFieldAlign;
  color: string;
  wrap: boolean;
  overflow: TemplateFieldOverflow;
  minFontSize?: number;
  hidden?: boolean;
  locked?: boolean;
}

export interface TemplateLayout {
  pdf_base_url: string;
  pages: TemplatePage[];
  fields: TemplateField[];
}

export interface TemplateRecord {
  id: string;
  name: string;
  type: 'factura' | 'recibo' | 'cotizacion';
  mime_type?: string | null;
  preview_url?: string | null;
  pdf_base_url?: string | null;
  width_px?: number | null;
  height_px?: number | null;
  pages?: TemplatePage[];
  fields?: any[];
}

const DEFAULT_FONT_FAMILY = 'Inter';
const DEFAULT_FONT_SIZE = 12;
const DEFAULT_ALIGN: TemplateFieldAlign = 'left';
const DEFAULT_COLOR = '#111111';

const KIND_MAP: Record<string, TemplateFieldKind> = {
  text: 'text',
  number: 'number',
  date: 'date',
  money: 'money',
  textarea: 'textarea',
  table: 'textarea'
};

const COMMON_FIELDS = {
  factura: [
    { name: 'factura_numero', kind: 'text' },
    { name: 'fecha', kind: 'date' },
    { name: 'cliente_nombre', kind: 'text' },
    { name: 'cliente_rtn', kind: 'text' },
    { name: 'cliente_direccion', kind: 'textarea' },
    { name: 'items[].descripcion', kind: 'textarea' },
    { name: 'items[].cantidad', kind: 'number' },
    { name: 'items[].precio_unitario', kind: 'money' },
    { name: 'items[].total_linea', kind: 'money' },
    { name: 'subtotal', kind: 'money' },
    { name: 'isv', kind: 'money' },
    { name: 'total', kind: 'money' }
  ],
  cotizacion: [
    { name: 'cotizacion_numero', kind: 'text' },
    { name: 'fecha', kind: 'date' },
    { name: 'cliente_nombre', kind: 'text' },
    { name: 'cliente_telefono', kind: 'text' },
    { name: 'cliente_email', kind: 'text' },
    { name: 'items[].descripcion', kind: 'textarea' },
    { name: 'items[].cantidad', kind: 'number' },
    { name: 'items[].precio_unitario', kind: 'money' },
    { name: 'items[].total_linea', kind: 'money' },
    { name: 'subtotal', kind: 'money' },
    { name: 'descuento', kind: 'money' },
    { name: 'isv', kind: 'money' },
    { name: 'total', kind: 'money' },
    { name: 'validez_dias', kind: 'number' },
    { name: 'tiempo_entrega', kind: 'text' },
    { name: 'condiciones', kind: 'textarea' }
  ],
  recibo: [
    { name: 'recibo_numero', kind: 'text' },
    { name: 'fecha_dia', kind: 'number' },
    { name: 'fecha_mes', kind: 'text' },
    { name: 'fecha_anio', kind: 'number' },
    { name: 'recibi_de', kind: 'text' },
    { name: 'cantidad_letras', kind: 'textarea' },
    { name: 'concepto', kind: 'textarea' },
    { name: 'saldo_anterior', kind: 'money' },
    { name: 'abono', kind: 'money' },
    { name: 'saldo_actual', kind: 'money' }
  ]
} as const;

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `field_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};

const mapOldFieldKind = (field: any): TemplateFieldKind => {
  const raw = (field?.kind || field?.field_type || 'text').toString().toLowerCase();
  return KIND_MAP[raw] || 'text';
};

const mapOldFieldName = (field: any): string => {
  return (
    field?.name ||
    field?.field_key ||
    field?.label ||
    `campo_${Date.now()}`
  );
};

export const createField = (partial?: Partial<TemplateField>): TemplateField => ({
  id: createId(),
  name: '',
  kind: 'text',
  page: 1,
  x: 0,
  y: 0,
  w: 160,
  h: 24,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  align: DEFAULT_ALIGN,
  color: DEFAULT_COLOR,
  wrap: false,
  overflow: 'clip',
  ...partial
});

export const getCommonFields = (
  type: TemplateRecord['type'],
  existingFields: TemplateField[]
): TemplateField[] => {
  const entries = COMMON_FIELDS[type] || [];
  const existingNames = new Set(existingFields.map((field) => field.name));
  return entries
    .filter((entry) => !existingNames.has(entry.name))
    .map((entry) =>
      createField({
        name: entry.name,
        kind: entry.kind as TemplateFieldKind,
        wrap: entry.kind === 'textarea',
        overflow: entry.kind === 'textarea' ? 'clip' : 'shrink',
        minFontSize: entry.kind === 'money' ? 10 : undefined
      })
    );
};

export const normalizeTemplateLayout = (template: TemplateRecord): TemplateLayout => {
  const pdfBase = template.pdf_base_url || template.preview_url || '';
  const pages = (template.pages && template.pages.length > 0)
    ? template.pages
    : [{ page: 1, width_px: template.width_px || undefined, height_px: template.height_px || undefined }];

  const fields = (template.fields || []).map((field: any) =>
    createField({
      id: field.id || createId(),
      name: mapOldFieldName(field),
      kind: mapOldFieldKind(field),
      page: field.page || 1,
      x: Number.isFinite(field.x) ? field.x : 0,
      y: Number.isFinite(field.y) ? field.y : 0,
      w: Number.isFinite(field.w) ? field.w : (Number.isFinite(field.width) ? field.width : 160),
      h: Number.isFinite(field.h) ? field.h : (Number.isFinite(field.height) ? field.height : 24),
      fontFamily: field.fontFamily || field.font_family || DEFAULT_FONT_FAMILY,
      fontSize: field.fontSize || field.font_size || DEFAULT_FONT_SIZE,
      align: field.align || DEFAULT_ALIGN,
      color: field.color || DEFAULT_COLOR,
      wrap: field.wrap ?? false,
      overflow: field.overflow || 'clip',
      minFontSize: field.minFontSize,
      hidden: field.hidden || false,
      locked: field.locked || false
    })
  );

  return {
    pdf_base_url: pdfBase,
    pages,
    fields
  };
};

export const validateLayout = (layout: TemplateLayout) => {
  const errors: string[] = [];
  const nameMap = new Map<string, number>();

  for (const field of layout.fields) {
    const name = field.name.trim();
    if (!name) {
      errors.push('Hay campos sin nombre.');
      continue;
    }
    const count = nameMap.get(name) || 0;
    nameMap.set(name, count + 1);
  }

  const duplicates = Array.from(nameMap.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  if (duplicates.length > 0) {
    errors.push(`Nombres duplicados: ${duplicates.join(', ')}`);
  }

  if (!layout.pdf_base_url) {
    errors.push('La plantilla no tiene un PDF base asociado.');
  }

  if (!layout.pages || layout.pages.length === 0) {
    errors.push('Debes definir al menos una pagina.');
  }

  return {
    valid: errors.length === 0,
    errors,
    duplicates
  };
};
