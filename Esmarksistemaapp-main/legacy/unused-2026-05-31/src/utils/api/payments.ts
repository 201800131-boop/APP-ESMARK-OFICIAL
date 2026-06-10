/**
 * API para gestión de pagos
 */

import { projectId, publicAnonKey } from '../supabase/info';
import type { PayOrderRequest, PayOrderResponse } from '../../types/payment';

const API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-sync`;

/**
 * Marcar pedido como pagado y generar recibo
 */
export async function payOrder(orderId: string, payment: PayOrderRequest): Promise<PayOrderResponse> {
  const response = await fetch(`${API_URL}/orders/${orderId}/pay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payment)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al procesar el pago');
  }

  const data = await response.json();
  return data;
}

/**
 * Obtener estado de pago de un pedido
 */
export async function getPaymentStatus(orderId: string): Promise<any> {
  const response = await fetch(`${API_URL}/orders/${orderId}/payment-status`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener estado de pago');
  }

  const data = await response.json();
  return data.payment;
}
