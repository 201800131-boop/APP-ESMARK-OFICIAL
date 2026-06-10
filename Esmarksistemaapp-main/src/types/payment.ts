/**
 * Tipos para la gestión de pagos
 */

export type PaymentStatus = "unpaid" | "partial" | "paid";

export type PaymentMethod = "cash" | "card" | "transfer" | "other";

export interface PaymentInfo {
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  paid_amount?: number;
  pending_amount?: number;
  paid_at?: string;
  received_amount?: number; // Monto recibido (para calcular cambio)
  change_amount?: number; // Cambio entregado
}

export interface PayOrderRequest {
  payment_method: PaymentMethod;
  received_amount: number;
}

export interface PayOrderResponse {
  success: boolean;
  order: any; // Order actualizado
  receipt_correlative: string;
  receipt_id: string;
  receipt_url?: string;
}
