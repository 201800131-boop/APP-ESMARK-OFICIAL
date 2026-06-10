import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Banknote, Coffee } from 'lucide-react';

interface InitialCashCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (initialCash: InitialCashCount) => void;
}

export interface InitialCashCount {
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
  timestamp: string;
}

export default function InitialCashCountDialog({ isOpen, onClose, onConfirm }: InitialCashCountDialogProps) {
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

  const billDenominations = [
    { key: 'b500' as const, value: 500, label: 'L 500' },
    { key: 'b200' as const, value: 200, label: 'L 200' },
    { key: 'b100' as const, value: 100, label: 'L 100' },
    { key: 'b50' as const, value: 50, label: 'L 50' },
    { key: 'b20' as const, value: 20, label: 'L 20' },
    { key: 'b10' as const, value: 10, label: 'L 10' },
    { key: 'b5' as const, value: 5, label: 'L 5' },
    { key: 'b2' as const, value: 2, label: 'L 2' },
    { key: 'b1' as const, value: 1, label: 'L 1' },
  ];

  const calculateTotal = () => {
    return (
      bills.b1 * 1 +
      bills.b2 * 2 +
      bills.b5 * 5 +
      bills.b10 * 10 +
      bills.b20 * 20 +
      bills.b50 * 50 +
      bills.b100 * 100 +
      bills.b200 * 200 +
      bills.b500 * 500
    );
  };

  const total = calculateTotal();

  const handleBillChange = (denomination: keyof typeof bills, value: string) => {
    const numValue = parseInt(value) || 0;
    setBills({ ...bills, [denomination]: numValue });
  };

  const handleConfirm = () => {
    const initialCashCount: InitialCashCount = {
      bills,
      total,
      timestamp: new Date().toISOString(),
    };

    onConfirm(initialCashCount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-0 bg-[#f7f8fa] rounded-2xl shadow-xl border border-gray-100">
        {/* Header verde degradado */}
        <div className="rounded-t-2xl p-5 pb-3 bg-gradient-to-r from-emerald-400 to-green-500 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-lg">Inicio de Día</span>
          </div>
          <span className="text-white text-sm">{new Date().toLocaleDateString('es-HN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>

        {/* Cuerpo blanco */}
        <div className="p-6 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-blue-500"><Banknote className="w-5 h-5" /></span>
            <span className="text-blue-900 text-sm">Registra el desglose de billetes en caja chica para iniciar el día</span>
          </div>

          <div className="mb-4">
            <span className="font-semibold text-gray-800">Desglose de Billetes (Lempiras)</span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {billDenominations.map((denomination) => (
                <div key={denomination.key} className="space-y-1">
                  <Label className="text-xs text-gray-700">{denomination.label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={bills[denomination.key]}
                      onChange={(e) => handleBillChange(denomination.key, e.target.value)}
                      className="text-center border-gray-300 focus:border-green-400 focus:ring-green-200 rounded-md bg-white"
                    />
                    <span className={`text-xs min-w-16 ${bills[denomination.key] > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>L {(bills[denomination.key] * denomination.value).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total inicial */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-green-900">Total Caja Chica:</span>
              <span className="text-2xl font-bold text-green-700">L {total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-full border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-none bg-emerald-500 hover:bg-emerald-600 rounded-full text-white border-2 border-emerald-400 shadow"
            >
              <Banknote className="w-4 h-4 mr-2" />
              Iniciar Día
            </Button>
          </div>

          {/* Mensaje informativo */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 mt-5 flex items-center gap-2">
            <span className="text-yellow-500">💡</span>
            <span className="text-yellow-900 text-xs">El modo observación te permite ver el sistema sin registrar caja chica</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
