import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertTriangle, Banknote, CheckCircle2, PlusCircle, Wallet, X } from 'lucide-react';

interface CashCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cashCount: CashCount) => void;
  expectedCash: number;
}

export interface CashCount {
  bills: {
    b1: number;
    b2: number;
    b5: number;
    b10: number;
    b20: number;
    b50: number;
    b100: number;
    b200: number;
    b500: number;
  };
  total: number;
  difference: number;
  notes: string;
  addedCash?: number;
}

const billDenominations = [
  { key: 'b1' as const, value: 1, label: 'L 1' },
  { key: 'b2' as const, value: 2, label: 'L 2' },
  { key: 'b5' as const, value: 5, label: 'L 5' },
  { key: 'b10' as const, value: 10, label: 'L 10' },
  { key: 'b20' as const, value: 20, label: 'L 20' },
  { key: 'b50' as const, value: 50, label: 'L 50' },
  { key: 'b100' as const, value: 100, label: 'L 100' },
  { key: 'b200' as const, value: 200, label: 'L 200' },
  { key: 'b500' as const, value: 500, label: 'L 500' },
];

export default function CashCountDialog({ isOpen, onClose, onConfirm, expectedCash }: CashCountDialogProps) {
  const [bills, setBills] = useState({
    b1: 0,
    b2: 0,
    b5: 0,
    b10: 0,
    b20: 0,
    b50: 0,
    b100: 0,
    b200: 0,
    b500: 0,
  });
  const [notes, setNotes] = useState('');
  const [addedCash, setAddedCash] = useState(0);

  const total =
    bills.b1 * 1 +
    bills.b2 * 2 +
    bills.b5 * 5 +
    bills.b10 * 10 +
    bills.b20 * 20 +
    bills.b50 * 50 +
    bills.b100 * 100 +
    bills.b200 * 200 +
    bills.b500 * 500;

  const difference = total - expectedCash;

  const handleBillChange = (denomination: keyof typeof bills, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setBills({ ...bills, [denomination]: Math.max(0, numValue) });
  };

  const handleConfirm = () => {
    if (difference !== 0 && !notes.trim()) {
      alert('Por favor agrega una descripcion del motivo del faltante/sobrante');
      return;
    }

    onConfirm({
      bills,
      total,
      difference,
      notes: notes.trim(),
      addedCash: difference < 0 ? addedCash : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="cash-count-dialog flex w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden p-0 gap-0 shadow-2xl"
        style={{ maxHeight: '88vh' }}
      >
        <DialogHeader className="relative border-b border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cash-count-close-button"
            aria-label="Cerrar"
          >
            <X />
          </button>
          <div className="flex items-start gap-3 pr-10">
            <span className="cash-count-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">Conteo de Efectivo Físico</DialogTitle>
              <DialogDescription className="mt-1 leading-5">
                Ingresa las unidades por denominación y confirma el cuadre de caja.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-5 py-4">
          <div className="cash-count-summary-grid grid gap-3 sm:grid-cols-2">
            <div className="cash-count-summary-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Esperado según sistema</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">L {expectedCash.toFixed(2)}</p>
            </div>
            <div className="cash-count-summary-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Total físico contado</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">L {total.toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label className="text-sm font-bold text-slate-950">Cantidad de billetes</Label>
            </div>
            <div className="cash-count-denomination-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {billDenominations.map((denomination) => (
                <div key={denomination.key} className="cash-count-denomination rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-bold text-slate-700">{denomination.label}</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      value={bills[denomination.key]}
                      onChange={(event) => handleBillChange(denomination.key, event.target.value)}
                      className="h-10 rounded-lg bg-white text-center text-base font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {difference !== 0 && (
              <div className={`rounded-xl border p-4 ${difference > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {difference > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-700" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${difference > 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                      {difference > 0 ? 'SOBRANTE' : 'FALTANTE'}: L {Math.abs(difference).toFixed(2)}
                    </p>
                    <p className={`text-xs ${difference > 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                      {difference > 0 ? 'Hay mas dinero fisico del esperado' : 'Falta dinero en caja fisica'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {difference === 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <p className="font-semibold text-emerald-900">Perfecto. El efectivo cuadra exactamente.</p>
                </div>
              </div>
            )}
          </div>

          {difference !== 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Label className="text-sm font-semibold text-slate-950">
                Descripcion del {difference > 0 ? 'sobrante' : 'faltante'} *
              </Label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={`Explica el motivo del ${difference > 0 ? 'sobrante' : 'faltante'}...`}
                className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                required
              />
              <p className="mt-2 text-xs text-slate-500">
                * Campo obligatorio cuando hay diferencias.
              </p>
            </div>
          )}

          {difference < 0 && (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-700" />
                <Label className="font-semibold text-blue-900">
                  Agregar dinero para cubrir faltante
                </Label>
              </div>

              <p className="mb-3 text-sm text-blue-800">
                Si vas a agregar dinero de tu bolsillo o de otra fuente para cuadrar la caja, registra el monto aqui.
              </p>

              <div className="space-y-2">
                <Label className="text-slate-950">Monto agregado</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addedCash || ''}
                    onChange={(event) => setAddedCash(parseFloat(event.target.value) || 0)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddedCash(Math.abs(difference))}
                    className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar faltante
                  </Button>
                </div>
              </div>

              {addedCash > 0 && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Agregaste L {addedCash.toFixed(2)}
                      </p>
                      <p className="text-xs text-emerald-800">
                        {addedCash >= Math.abs(difference)
                          ? 'Esto cubre el faltante completamente'
                          : `Aun falta cubrir L ${(Math.abs(difference) - addedCash).toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="cash-count-footer grid shrink-0 grid-cols-2 gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <Button variant="outline" onClick={onClose} className="cash-count-cancel h-11">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            className="cash-count-confirm h-11"
            disabled={difference !== 0 && !notes.trim()}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirmar conteo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
