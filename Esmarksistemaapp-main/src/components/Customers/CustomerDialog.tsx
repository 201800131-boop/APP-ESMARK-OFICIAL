/**
 * Diálogo para crear/editar clientes
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { createCustomer, updateCustomer } from '../../utils/api/customers';
import type { Customer } from '../../types/customer';

interface CustomerDialogProps {
  customer: Customer | null;
  onClose: (reload: boolean) => void;
}

export default function CustomerDialog({ customer, onClose }: CustomerDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    rtn: '',
    address: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        rtn: customer.rtn || '',
        address: customer.address || '',
        notes: customer.notes || ''
      });
    }
  }, [customer]);

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    try {
      setLoading(true);

      if (customer) {
        // Actualizar
        await updateCustomer({
          id: customer.id,
          ...formData
        });
        toast.success('Cliente actualizado correctamente');
      } else {
        // Crear
        await createCustomer(formData);
        toast.success('Cliente creado correctamente');
      }

      onClose(true); // Reload
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="customer-dialog-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="customer-dialog-panel max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="customer-dialog-header sticky top-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="customer-dialog-icon">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2>{customer ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <p>{customer ? 'Actualiza la informacion del directorio.' : 'Guarda los datos para reutilizarlos en pedidos.'}</p>
            </div>
          </div>
          <button
            onClick={() => onClose(false)}
            className="customer-dialog-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="customer-dialog-form p-6 space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <Label className="text-gray-900 text-sm">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nombre completo del cliente"
              required
              autoFocus
            />
          </div>

          {/* Teléfono y Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-gray-900 text-sm">Teléfono</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="9999-9999"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-900 text-sm">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
          </div>

          {/* RTN */}
          <div className="space-y-1">
            <Label className="text-gray-900 text-sm">RTN <span className="text-gray-500">(opcional)</span></Label>
            <Input
              type="text"
              value={formData.rtn}
              onChange={(e) => handleChange('rtn', e.target.value)}
              placeholder="0801-1999-123456"
              maxLength={20}
            />
          </div>

          {/* Dirección */}
          <div className="space-y-1">
            <Label className="text-gray-900 text-sm">Dirección</Label>
            <Input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Dirección completa"
            />
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label className="text-gray-900 text-sm">Notas</Label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="customers-primary-button"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                customer ? 'Actualizar' : 'Crear Cliente'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
