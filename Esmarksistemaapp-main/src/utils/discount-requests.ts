import { api } from './api';

export type DiscountRequestStatus = 'pending' | 'approved' | 'rejected' | 'consumed';

export interface DiscountRequest {
  id: string;
  status: DiscountRequestStatus;
  orderDraftId: string;
  operator: {
    username: string;
    name: string;
  };
  authorizedBy?: {
    username: string;
    name: string;
  };
  discountAmount: number;
  reason: string;
  customerName: string;
  items: Array<{
    description: string;
    quantity: number;
    originalPrice: number;
    discountedPrice: number;
    discount: number;
  }>;
  createdAt: string;
  approvedAt?: string;
}

const STORAGE_KEY = 'esmark_discount_requests';
export const DISCOUNT_REQUESTS_EVENT = 'esmark-discount-requests-changed';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function listDiscountRequests(): DiscountRequest[] {
  return safeParse<DiscountRequest[]>(localStorage.getItem(STORAGE_KEY), []);
}

function saveDiscountRequests(requests: DiscountRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent(DISCOUNT_REQUESTS_EVENT));
}

export async function syncDiscountRequestsFromSupabase(): Promise<DiscountRequest[]> {
  const response = await api.getDiscountRequests();
  const remoteRequests = (response.requests || []) as DiscountRequest[];
  saveDiscountRequests(remoteRequests);
  return remoteRequests;
}

export function createDiscountRequest(
  request: Omit<DiscountRequest, 'id' | 'status' | 'createdAt'>
): DiscountRequest {
  const nextRequest: DiscountRequest = {
    ...request,
    id: `discount:${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  saveDiscountRequests([nextRequest, ...listDiscountRequests()]);
  api.createDiscountRequest(nextRequest).catch((error) => {
    console.warn('No se pudo sincronizar la solicitud de descuento en Supabase:', error);
  });
  return nextRequest;
}

export function approveDiscountRequest(
  requestId: string,
  authorizedBy: { username: string; name: string }
): DiscountRequest | null {
  let approved: DiscountRequest | null = null;
  const updated = listDiscountRequests().map((request) => {
    if (request.id !== requestId || request.status !== 'pending') return request;
    approved = {
      ...request,
      status: 'approved',
      authorizedBy,
      approvedAt: new Date().toISOString(),
    };
    return approved;
  });

  saveDiscountRequests(updated);
  if (approved) {
    api.updateDiscountRequest(requestId, approved).catch((error) => {
      console.warn('No se pudo sincronizar la autorizacion de descuento en Supabase:', error);
    });
  }
  return approved;
}

export function consumeDiscountRequest(requestId: string): DiscountRequest | null {
  let consumed: DiscountRequest | null = null;
  const updated = listDiscountRequests().map((request) => {
    if (request.id !== requestId || request.status !== 'approved') return request;
    consumed = { ...request, status: 'consumed' };
    return consumed;
  });

  saveDiscountRequests(updated);
  if (consumed) {
    api.updateDiscountRequest(requestId, consumed).catch((error) => {
      console.warn('No se pudo sincronizar el consumo de descuento en Supabase:', error);
    });
  }
  return consumed;
}
