/**
 * Tipos para la gestión de clientes
 */

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  rtn?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  rtn?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}
