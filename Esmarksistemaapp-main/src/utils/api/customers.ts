/**
 * API para gestión de clientes
 */

import { projectId, publicAnonKey } from '../supabase/info';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../../types/customer';

const API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-sync`;

/**
 * Listar todos los clientes
 */
export async function listCustomers(search?: string): Promise<Customer[]> {
  const url = new URL(`${API_URL}/customers`);
  if (search) {
    url.searchParams.set('search', search);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al listar clientes');
  }

  const data = await response.json();
  return data.customers || [];
}

/**
 * Obtener un cliente por ID
 */
export async function getCustomer(id: string): Promise<Customer> {
  const response = await fetch(`${API_URL}/customers/${id}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener cliente');
  }

  const data = await response.json();
  return data.customer;
}

/**
 * Crear un nuevo cliente
 */
export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const response = await fetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear cliente');
  }

  const data = await response.json();
  return data.customer;
}

/**
 * Actualizar un cliente
 */
export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  const { id, ...updates } = input;
  
  const response = await fetch(`${API_URL}/customers/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar cliente');
  }

  const data = await response.json();
  return data.customer;
}

/**
 * Eliminar un cliente
 */
export async function deleteCustomer(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/customers/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar cliente');
  }
}
