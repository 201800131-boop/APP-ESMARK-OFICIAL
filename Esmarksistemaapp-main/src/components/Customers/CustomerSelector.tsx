/**
 * Selector de clientes con autocomplete
 */

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Search, Plus, X, User } from 'lucide-react';
import { listCustomers } from '../../utils/api/customers';
import CustomerDialog from './CustomerDialog';
import type { Customer } from '../../types/customer';

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  disabled?: boolean;
}

export default function CustomerSelector({ selectedCustomer, onSelect, disabled }: CustomerSelectorProps) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar clientes
  useEffect(() => {
    loadCustomers();
  }, []);

  // Filtrar clientes cuando cambia la búsqueda
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredCustomers(customers.slice(0, 10)); // Mostrar solo 10
    } else {
      const searchLower = search.toLowerCase();
      const filtered = customers
        .filter(c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.phone?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.rtn?.toLowerCase().includes(searchLower)
        )
        .slice(0, 10);
      setFilteredCustomers(filtered);
    }
  }, [search, customers]);

  async function loadCustomers() {
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  function handleSelect(customer: Customer) {
    onSelect(customer);
    setSearch('');
    setShowDropdown(false);
  }

  function handleClear() {
    onSelect(null);
    setSearch('');
  }

  function handleDialogClose(reload: boolean) {
    setShowDialog(false);
    if (reload) {
      loadCustomers();
    }
  }

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label className="text-gray-900 text-sm">Cliente</Label>

      {selectedCustomer ? (
        // Cliente seleccionado
        <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900">{selectedCustomer.name}</span>
            </div>
            <div className="text-xs text-gray-600 space-y-0.5">
              {selectedCustomer.phone && <div>📞 {selectedCustomer.phone}</div>}
              {selectedCustomer.email && <div>✉️ {selectedCustomer.email}</div>}
              {selectedCustomer.rtn && <div>🆔 RTN: {selectedCustomer.rtn}</div>}
              {selectedCustomer.address && <div>📍 {selectedCustomer.address}</div>}
            </div>
          </div>
          {!disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
              title="Quitar cliente"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        // Buscador
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar cliente por nombre, telefono, RTN o email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              disabled={disabled}
              className="pl-10 pr-10"
            />
            <button
              onClick={() => setShowDialog(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-green-100 rounded text-green-600 transition-colors"
              title="Crear nuevo cliente"
              disabled={disabled}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Dropdown de resultados */}
          {showDropdown && filteredCustomers.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="font-semibold text-gray-900 text-sm">{customer.name}</div>
                  <div className="text-xs text-gray-600 space-x-2">
                    {customer.phone && <span>📞 {customer.phone}</span>}
                    {customer.rtn && <span>RTN: {customer.rtn}</span>}
                    {customer.email && <span>✉️ {customer.email}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {showDropdown && search && filteredCustomers.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
              <p>No se encontraron clientes</p>
              <Button
                size="sm"
                onClick={() => setShowDialog(true)}
                className="mt-2 bg-none bg-green-500 hover:bg-green-600 text-white"
              >
                <Plus className="w-3 h-3 mr-1" />
                Crear nuevo cliente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog de crear cliente */}
      {showDialog && (
        <CustomerDialog
          customer={null}
          onClose={handleDialogClose}
        />
      )}
    </div>
  );
}
