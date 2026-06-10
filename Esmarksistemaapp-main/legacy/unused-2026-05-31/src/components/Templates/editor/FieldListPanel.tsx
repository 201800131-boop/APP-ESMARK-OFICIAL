import React, { useMemo, useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Copy, Eye, EyeOff, Lock, PlusCircle, Sparkles, Trash2, Unlock } from 'lucide-react';
import { TemplateField, TemplateFieldKind } from './model';

interface FieldListPanelProps {
  templateType: 'factura' | 'recibo' | 'cotizacion';
  fields: TemplateField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, kind: TemplateFieldKind) => void;
  onDuplicate: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onDelete: (id: string) => void;
  onInsertCommon: () => void;
  nameErrors: string[];
}

const KIND_LABELS: Record<TemplateFieldKind, string> = {
  text: 'Texto',
  textarea: 'Texto largo',
  money: 'Moneda',
  date: 'Fecha',
  number: 'Numero'
};

export default function FieldListPanel({
  templateType,
  fields,
  selectedId,
  onSelect,
  onCreate,
  onDuplicate,
  onToggleHidden,
  onToggleLocked,
  onDelete,
  onInsertCommon,
  nameErrors
}: FieldListPanelProps) {
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<TemplateFieldKind>('text');

  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.name.localeCompare(b.name));
  }, [fields]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    onCreate(trimmed, newKind);
    setNewName('');
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Campos</h3>
        <p className="text-xs text-gray-500">{fields.length} campo(s) configurado(s)</p>
      </div>

      {nameErrors.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {nameErrors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-b pb-4">
        <Label className="text-xs text-gray-600">Nuevo campo</Label>
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nombre unico del campo"
        />
        <Select value={newKind} onValueChange={(value) => setNewKind(value as TemplateFieldKind)}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo de campo" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(KIND_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleAdd} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar campo
        </Button>

        <Button variant="secondary" size="sm" onClick={onInsertCommon} className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          Insertar campos comunes ({templateType})
        </Button>
      </div>

      <div className="space-y-2">
        {sortedFields.map((field) => (
          <button
            key={field.id}
            type="button"
            onClick={() => onSelect(field.id)}
            className={`w-full rounded border px-2 py-2 text-left text-xs transition ${ selectedId === field.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100' }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold text-gray-800">{field.name}</div>
                <div className="text-[11px] text-gray-500">
                  {KIND_LABELS[field.kind]} - Pagina {field.page}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleHidden(field.id);
                  }}
                >
                  {field.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleLocked(field.id);
                  }}
                >
                  {field.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDuplicate(field.id);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(field.id);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
