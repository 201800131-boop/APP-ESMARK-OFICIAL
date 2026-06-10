import React from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { TemplateField, TemplateFieldAlign, TemplateFieldKind, TemplateFieldOverflow } from './model';

interface FieldPropertiesPanelProps {
  field: TemplateField | null;
  onUpdate: (updates: Partial<TemplateField>) => void;
  onDelete: () => void;
}

const KIND_LABELS: Record<TemplateFieldKind, string> = {
  text: 'Texto',
  textarea: 'Texto largo',
  money: 'Moneda',
  date: 'Fecha',
  number: 'Numero'
};

const ALIGN_LABELS: Record<TemplateFieldAlign, string> = {
  left: 'Izquierda',
  center: 'Centro',
  right: 'Derecha'
};

const OVERFLOW_LABELS: Record<TemplateFieldOverflow, string> = {
  shrink: 'Reducir fuente',
  clip: 'Recortar',
  ellipsis: 'Ellipsis'
};

export default function FieldPropertiesPanel({ field, onUpdate, onDelete }: FieldPropertiesPanelProps) {
  if (!field) {
    return <div className="p-6 text-sm text-gray-500">Selecciona un campo para editar sus propiedades.</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Propiedades</h3>
        <p className="text-xs text-gray-500">Campo seleccionado</p>
      </div>

      <div className="space-y-2">
        <Label>Nombre (unico)</Label>
        <Input value={field.name} onChange={(event) => onUpdate({ name: event.target.value })} />
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={field.kind} onValueChange={(value) => onUpdate({ kind: value as TemplateFieldKind })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(KIND_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Pagina</Label>
          <Input
            type="number"
            value={field.page}
            min={1}
            onChange={(event) => onUpdate({ page: Number(event.target.value) || 1 })}
          />
        </div>
        <div className="space-y-1">
          <Label>Alineacion</Label>
          <Select value={field.align} onValueChange={(value) => onUpdate({ align: value as TemplateFieldAlign })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ALIGN_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>X</Label>
          <Input type="number" value={field.x} onChange={(event) => onUpdate({ x: Number(event.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <Label>Y</Label>
          <Input type="number" value={field.y} onChange={(event) => onUpdate({ y: Number(event.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <Label>Ancho</Label>
          <Input type="number" value={field.w} onChange={(event) => onUpdate({ w: Number(event.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <Label>Alto</Label>
          <Input type="number" value={field.h} onChange={(event) => onUpdate({ h: Number(event.target.value) || 0 })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Fuente</Label>
          <Input value={field.fontFamily} onChange={(event) => onUpdate({ fontFamily: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Tamano</Label>
          <Input
            type="number"
            value={field.fontSize}
            onChange={(event) => onUpdate({ fontSize: Number(event.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Color</Label>
          <Input type="color" value={field.color} onChange={(event) => onUpdate({ color: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Overflow</Label>
          <Select
            value={field.overflow}
            onValueChange={(value) => onUpdate({ overflow: value as TemplateFieldOverflow })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OVERFLOW_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded border px-2 py-2 text-xs">
          <span>Wrap</span>
          <Switch checked={field.wrap} onCheckedChange={(checked) => onUpdate({ wrap: checked })} />
        </div>
        <div className="flex items-center justify-between rounded border px-2 py-2 text-xs">
          <span>Bloqueado</span>
          <Switch checked={field.locked} onCheckedChange={(checked) => onUpdate({ locked: checked })} />
        </div>
        <div className="flex items-center justify-between rounded border px-2 py-2 text-xs">
          <span>Oculto</span>
          <Switch checked={field.hidden} onCheckedChange={(checked) => onUpdate({ hidden: checked })} />
        </div>
      </div>

      {field.overflow === 'shrink' && (
        <div className="space-y-1">
          <Label>Min font size</Label>
          <Input
            type="number"
            value={field.minFontSize ?? ''}
            onChange={(event) => onUpdate({ minFontSize: Number(event.target.value) || 0 })}
          />
        </div>
      )}

      <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
        Eliminar campo
      </Button>
    </div>
  );
}
