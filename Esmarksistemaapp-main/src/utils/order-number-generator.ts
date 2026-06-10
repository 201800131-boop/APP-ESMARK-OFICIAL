import { projectId, publicAnonKey } from './supabase/info';

export function getNextOrderNumber(existingOrders: any[]): number {
  if (!existingOrders || existingOrders.length === 0) return 1;

  const orderNumbers = existingOrders
    .map((order) => {
      const num = order.number || order.order_number;
      if (!num) return 0;
      if (typeof num === 'string') return parseInt(num.replace(/[^\d]/g, ''), 10) || 0;
      return parseInt(num, 10) || 0;
    })
    .filter((num) => num > 0);

  return orderNumbers.length === 0 ? 1 : Math.max(...orderNumbers) + 1;
}

export function reassignOrderNumbers(orders: any[]): any[] {
  if (!orders || orders.length === 0) return [];

  const sortedOrders = [...orders].sort((a, b) => {
    const dateA = new Date(a.created_at || a.dateCreated || 0).getTime();
    const dateB = new Date(b.created_at || b.dateCreated || 0).getTime();
    return dateA - dateB;
  });

  return sortedOrders.map((order, index) => ({
    ...order,
    number: (index + 1).toString(),
  }));
}

export function isOrderNumberUsed(orderNumber: number, existingOrders: any[]): boolean {
  return existingOrders.some((order) => {
    const num = order.number || order.order_number;
    if (!num) return false;
    if (typeof num === 'string') return parseInt(num.replace(/[^\d]/g, ''), 10) === orderNumber;
    return parseInt(num, 10) === orderNumber;
  });
}

export function formatOrderNumber(orderNumber: number, padding: number = 4): string {
  return orderNumber.toString().padStart(padding, '0');
}

export function syncOrderCounter(existingOrders: any[]): number {
  return getNextOrderNumber(existingOrders);
}

export async function getAndReserveNextOrderNumber(): Promise<number> {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/orders-table/next-number`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo reservar el siguiente numero de pedido (${response.status})`);
  }

  const data = await response.json();
  return Number(data?.next_number || 1);
}
