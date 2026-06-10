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
  // ...existing code...
  return (
    <div>Editor de plantilla (migrado)</div>
  );
}
