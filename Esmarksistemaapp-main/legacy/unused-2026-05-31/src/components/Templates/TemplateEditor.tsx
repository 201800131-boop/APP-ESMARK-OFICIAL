import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileText, Save, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker?url';
import FieldListPanel from './editor/FieldListPanel';
import FieldPropertiesPanel from './editor/FieldPropertiesPanel';
import {
  TemplateField,
  TemplateFieldKind,
  TemplateLayout,
  TemplateRecord,
  createField,
  getCommonFields,
  normalizeTemplateLayout,
  validateLayout
} from './editor/model';
import { clamp, toTemplatePoint } from './editor/coords';

interface TemplateEditorProps {
  template: TemplateRecord;
  onSave: (layout: TemplateLayout) => Promise<void>;
  onClose: () => void;
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type TemplateSourceType = 'pdf' | 'image';

const resolveSourceType = (mimeType: string | null | undefined, url: string): TemplateSourceType => {
  if (mimeType) {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
  }

  const lowerUrl = (url || '').toLowerCase();
  if (/\.(png|jpg|jpeg)(\?|#|$)/.test(lowerUrl)) {
    return 'image';
  }
  return 'pdf';
};

const getPageDimensions = (layout: TemplateLayout, page: number) => {
  const pageData = layout.pages.find((item) => item.page === page);
  return {
    width: pageData?.width_px || 800,
    height: pageData?.height_px || 1100
  };
};

type TemplateFieldBoxProps = {
  field: TemplateField;
  isSelected: boolean;
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>, field: TemplateField) => void;
};

const TemplateFieldBox = ({ field, isSelected, onMouseDown }: TemplateFieldBoxProps) => {
  const fieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = fieldRef.current;
    if (!element) return;
    element.style.left = `${field.x}px`;
    element.style.top = `${field.y}px`;
    element.style.width = `${field.w}px`;
    element.style.height = `${field.h}px`;
    element.style.color = field.color || '';
  }, [field.x, field.y, field.w, field.h, field.color]);

  return (
    <div
      ref={fieldRef}
      onMouseDown={(event) => onMouseDown(event, field)}
      className={`absolute ${field.locked ? 'cursor-default' : 'cursor-move'} select-none border-2 text-[10px] transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-500/15 shadow-[0_0_8px_rgba(59,130,246,0.4)]' 
          : 'border-amber-400 bg-amber-400/10 hover:border-amber-500 hover:bg-amber-400/15'
      }`}
      style={{
        boxSizing: 'border-box',
        opacity: field.hidden ? 0.5 : 1
      }}
    >
      <div className="px-2 py-0.5 text-[11px] font-semibold tracking-wide">
        {field.locked && <span className="mr-1">🔒</span>}
        {field.name}
      </div>
    </div>
  );
};

export default function TemplateEditor({ template, onSave, onClose }: TemplateEditorProps) {
  const baseLayout = useMemo(() => normalizeTemplateLayout(template), [template]);
  const [layout, setLayout] = useState<TemplateLayout>(baseLayout);
  const [selectedId, setSelectedId] = useState<string | null>(layout.fields[0]?.id || null);
  const [currentPage, setCurrentPage] = useState(layout.pages[0]?.page || 1);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [autoFit, setAutoFit] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedField = layout.fields.find((field) => field.id === selectedId) || null;
  const validation = validateLayout(layout);
  const nameErrors = validation.errors.filter((error) => error.toLowerCase().includes('nombre'));

  const { width, height } = getPageDimensions(layout, currentPage);
  const sourceType = useMemo(
    () => resolveSourceType(template.mime_type, layout.pdf_base_url),
    [template.mime_type, layout.pdf_base_url]
  );
  const zoomOptions = useMemo(() => {
    const options = new Set<number>(ZOOM_LEVELS);
    options.add(Number(zoom.toFixed(2)));
    return Array.from(options).sort((a, b) => a - b);
  }, [zoom]);

  const applyFitToScreen = () => {
    if (!scrollRef.current) return;
    const padding = 32;
    const availableWidth = Math.max(0, scrollRef.current.clientWidth - padding);
    const availableHeight = Math.max(0, scrollRef.current.clientHeight - padding);
    if (!availableWidth || !availableHeight || !width || !height) return;

    const fitZoom = Math.min(availableWidth / width, availableHeight / height) * 0.95;
    const clamped = clamp(fitZoom, 0.25, 2);
    setZoom(Number(clamped.toFixed(3)));
  };

  useEffect(() => {
    if (!autoFit) return;
    applyFitToScreen();
  }, [autoFit, currentPage, width, height]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.style.width = `${width * zoom}px`;
      container.style.height = `${height * zoom}px`;
    }

    const viewport = viewportRef.current;
    if (viewport) {
      viewport.style.width = `${width}px`;
      viewport.style.height = `${height}px`;
      viewport.style.transform = `scale(${zoom})`;
      viewport.style.transformOrigin = 'top left';
    }
  }, [width, height, zoom]);

  useEffect(() => {
    if (!layout.pdf_base_url || sourceType !== 'pdf') return;
    if (!canvasRef.current) return;

    let cancelled = false;
    let renderTask: { cancel?: () => void; promise?: Promise<unknown> } | null = null;
    let loadingTask: { promise: Promise<any>; destroy?: () => void } | null = null;

    const renderPdf = async () => {
      try {
        setPdfError(null);
        setPdfLoading(true);

        const nextLoadingTask = pdfjsLib.getDocument({ url: layout.pdf_base_url });
        loadingTask = nextLoadingTask;
        const pdf = await nextLoadingTask.promise;
        if (cancelled) return;

        const pageNumber = Math.min(Math.max(currentPage, 1), pdf.numPages);
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const pageData = layout.pages.find((item) => item.page === currentPage);
        const hasDimensions =
          Number.isFinite(pageData?.width_px) &&
          Number.isFinite(pageData?.height_px) &&
          (pageData?.width_px ?? 0) > 0 &&
          (pageData?.height_px ?? 0) > 0;

        const targetWidth = hasDimensions ? (pageData?.width_px as number) : viewport.width;
        const targetHeight = hasDimensions ? (pageData?.height_px as number) : viewport.height;

        if (!hasDimensions) {
          setLayout((prev) => ({
            ...prev,
            pages: prev.pages.some((pageItem) => pageItem.page === currentPage)
              ? prev.pages.map((pageItem) =>
                  pageItem.page === currentPage
                    ? {
                        ...pageItem,
                        width_px: Math.round(viewport.width),
                        height_px: Math.round(viewport.height)
                      }
                    : pageItem
                )
              : [
                  ...prev.pages,
                  { page: currentPage, width_px: Math.round(viewport.width), height_px: Math.round(viewport.height) }
                ]
          }));
        }

        const scaleX = targetWidth / viewport.width;
        const scaleY = targetHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY);
        const dpr = window.devicePixelRatio || 1;
        const scaledViewport = page.getViewport({ scale: scale * dpr });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('No se pudo crear el canvas');
        }

        canvas.width = Math.round(scaledViewport.width);
        canvas.height = Math.round(scaledViewport.height);
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${targetHeight}px`;

        context.setTransform(1, 0, 0, 1, 0, 0);
        const nextRenderTask = page.render({ canvasContext: context, viewport: scaledViewport });
        renderTask = nextRenderTask;
        await nextRenderTask.promise;
      } catch (error) {
        if (!cancelled) {
          console.error('Error rendering PDF:', error);
          setPdfError('No se pudo renderizar el PDF.');
        }
      } finally {
        if (!cancelled) {
          setPdfLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
      loadingTask?.destroy?.();
    };
  }, [layout.pdf_base_url, sourceType, currentPage, layout.pages]);

  const handleCreateField = (name: string, kind: TemplateFieldKind) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newField = createField({
      name: trimmed,
      kind,
      page: currentPage,
      wrap: kind === 'textarea',
      overflow: kind === 'textarea' ? 'clip' : 'shrink'
    });

    setLayout((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
    setSelectedId(newField.id);
  };

  const handleDuplicate = (fieldId: string) => {
    const field = layout.fields.find((item) => item.id === fieldId);
    if (!field) return;

    const copy = createField({
      ...field,
      id: undefined,
      name: `${field.name}_copia`,
      x: field.x + 12,
      y: field.y + 12
    });

    setLayout((prev) => ({ ...prev, fields: [...prev.fields, copy] }));
    setSelectedId(copy.id);
  };

  const handleToggleHidden = (fieldId: string) => {
    setLayout((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === fieldId ? { ...field, hidden: !field.hidden } : field
      )
    }));
  };

  const handleToggleLocked = (fieldId: string) => {
    setLayout((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === fieldId ? { ...field, locked: !field.locked } : field
      )
    }));
  };

  const handleDelete = (fieldId: string) => {
    setLayout((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== fieldId)
    }));
    if (selectedId === fieldId) {
      setSelectedId(null);
    }
  };

  const handleUpdateSelected = (updates: Partial<TemplateField>) => {
    if (!selectedId) return;
    setLayout((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === selectedId ? { ...field, ...updates } : field
      )
    }));
  };

  const handleInsertCommon = () => {
    const additions = getCommonFields(template.type, layout.fields);
    if (additions.length === 0) {
      toast.info('Ya existen todos los campos comunes.');
      return;
    }
    setLayout((prev) => ({ ...prev, fields: [...prev.fields, ...additions] }));
    toast.success('Campos comunes agregados.');
  };

  const handleSave = async () => {
    if (!validation.valid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    try {
      setSaving(true);
      await onSave(layout);
      toast.success('Plantilla guardada.');
    } catch (error) {
      toast.error('No se pudo guardar la plantilla.');
    } finally {
      setSaving(false);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>, field: TemplateField) => {
    if (field.locked) return;
    if (!viewportRef.current) return;

    setSelectedId(field.id);
    const rect = viewportRef.current.getBoundingClientRect();
    const point = toTemplatePoint(event.clientX, event.clientY, rect, zoom);
    setDragOffset({
      x: point.x - field.x,
      y: point.y - field.y
    });
    setDraggingId(field.id);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const point = toTemplatePoint(event.clientX, event.clientY, rect, zoom);

    setLayout((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => {
        if (field.id !== draggingId) return field;
        const maxX = width - field.w;
        const maxY = height - field.h;
        return {
          ...field,
          x: clamp(point.x - dragOffset.x, 0, Math.max(0, maxX)),
          y: clamp(point.y - dragOffset.y, 0, Math.max(0, maxY))
        };
      })
    }));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const handleAddPage = () => {
    const nextPage = Math.max(0, ...layout.pages.map((p) => p.page)) + 1;
    setLayout((prev) => ({
      ...prev,
      pages: [...prev.pages, { page: nextPage, width_px: width, height_px: height }]
    }));
    setCurrentPage(nextPage);
  };

  const handleRemovePage = () => {
    if (layout.pages.length <= 1) return;
    setLayout((prev) => ({
      ...prev,
      pages: prev.pages.filter((page) => page.page !== currentPage),
      fields: prev.fields.map((field) => (field.page === currentPage ? { ...field, page: 1 } : field))
    }));
    setCurrentPage(layout.pages[0]?.page || 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[95vw] flex-col overflow-hidden rounded-xl border-2 border-gray-300 bg-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between border-b-2 border-gray-300 bg-linear-to-r from-gray-800 to-gray-700 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2.5 backdrop-blur-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">Editor de Plantilla</div>
              <div className="text-xs text-gray-300 font-medium">{template.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving} className="text-gray-200 hover:text-white">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-200 hover:text-white">
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-72 border-r-2 border-gray-300 bg-gray-50/50 overflow-y-auto">
            <FieldListPanel
              templateType={template.type}
              fields={layout.fields}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCreate={handleCreateField}
              onDuplicate={handleDuplicate}
              onToggleHidden={handleToggleHidden}
              onToggleLocked={handleToggleLocked}
              onDelete={handleDelete}
              onInsertCommon={handleInsertCommon}
              nameErrors={nameErrors}
            />
          </aside>

          <main className="flex flex-1 flex-col overflow-hidden bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-300 bg-linear-to-r from-gray-50 to-gray-100 px-6 py-3 text-xs">
              <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-gray-200 p-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAutoFit(false);
                    setZoom((prev) => clamp(prev - 0.25, 0.25, 2));
                  }}
                  className="h-8 w-8 hover:bg-gray-100"
                  title="Zoom menos"
                >
                  <ZoomOut className="h-4 w-4 text-gray-600" />
                </Button>
                <Select
                  value={zoom.toFixed(2)}
                  onValueChange={(value) => {
                    setAutoFit(false);
                    setZoom(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[90px] text-xs border-0 bg-transparent focus:ring-1 focus:ring-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zoomOptions.map((level) => {
                      const value = level.toFixed(2);
                      return (
                        <SelectItem key={value} value={value}>
                          {Math.round(level * 100)}%
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAutoFit(false);
                    setZoom((prev) => clamp(prev + 0.25, 0.25, 2));
                  }}
                  className="h-8 w-8 hover:bg-gray-100"
                  title="Zoom más"
                >
                  <ZoomIn className="h-4 w-4 text-gray-600" />
                </Button>
              </div>

              <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-gray-200 p-1.5">
                <Select value={currentPage.toString()} onValueChange={(value) => setCurrentPage(Number(value))}>
                  <SelectTrigger className="h-8 w-[110px] text-xs border-0 bg-transparent focus:ring-1 focus:ring-gray-300">
                    <SelectValue placeholder="Página" />
                  </SelectTrigger>
                  <SelectContent>
                    {layout.pages.map((page) => (
                      <SelectItem key={page.page} value={page.page.toString()}>
                        Página {page.page}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-px h-6 bg-gray-200" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAddPage}
                  className="h-8 text-xs hover:bg-green-50 text-gray-700"
                  title="Agregar página"
                >
                  + Página
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRemovePage} 
                  disabled={layout.pages.length <= 1}
                  className="h-8 text-xs hover:bg-red-50 text-gray-700 disabled:opacity-50"
                  title="Eliminar página actual"
                >
                  − Página
                </Button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overflow-x-auto bg-linear-to-br from-gray-100 to-gray-200 p-6"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                ref={containerRef}
                className="relative inline-block"
              >
                <div
                  ref={viewportRef}
                  className="relative bg-white border-2 border-gray-300 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden rounded-sm"
                >
                  {layout.pdf_base_url ? (
                    sourceType === 'image' ? (
                      <img
                        src={layout.pdf_base_url}
                        alt={`Plantilla ${template.name}`}
                        className="absolute inset-0 w-full h-full"
                      />
                    ) : (
                      <>
                        <canvas
                          ref={canvasRef}
                          className="absolute inset-0 pointer-events-none"
                        />
                        {(pdfLoading || pdfError) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-linear-to-b from-gray-50 to-gray-100">
                            <div className="text-center">
                              <div className="inline-block mb-2">
                                <div className="animate-spin h-8 w-8 border-3 border-gray-300 border-t-gray-700 rounded-full"></div>
                              </div>
                              <p className="text-xs font-medium text-gray-600">
                                {pdfLoading ? 'Cargando PDF...' : pdfError}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-500">PDF base no disponible</p>
                        <p className="text-xs text-gray-400 mt-1">Carga un PDF para comenzar</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0">
                    {layout.fields
                      .filter((field) => field.page === currentPage && !field.hidden)
                      .map((field) => (
                        <TemplateFieldBox
                          key={field.id}
                          field={field}
                          isSelected={field.id === selectedId}
                          onMouseDown={handleMouseDown}
                        />
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </main>

          <aside className="w-80 border-l-2 border-gray-300 bg-gray-50/50 overflow-y-auto">
            <FieldPropertiesPanel
              field={selectedField}
              onUpdate={handleUpdateSelected}
              onDelete={() => selectedId && handleDelete(selectedId)}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
// Archivo eliminado. Migrado a Facturacion.
