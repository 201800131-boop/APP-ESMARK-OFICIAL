import { projectId, publicAnonKey } from './supabase/info';
import { readStoredUser } from './auth-session';

export interface WorkDay {
  id: string;
  day_number: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  opened_by: string | null;
  opened_by_name: string;
  closed_by: string | null;
  closed_by_name: string | null;
  initial_cash_balance: number;
  final_cash_balance: number | null;
  notes: string | null;
  metadata?: Record<string, any>;
}

const API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-sync`;
const BUSINESS_TIME_ZONE = 'America/Tegucigalpa';

export function getBusinessDateKey(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '00';
  const day = parts.find((part) => part.type === 'day')?.value || '00';
  return `${year}-${month}-${day}`;
}

export function getWorkDayDateKey(day: WorkDay): string {
  return day.metadata?.business_date || getBusinessDateKey(day.opened_at);
}

export function isPendingPreviousWorkDay(day: WorkDay | null): boolean {
  return !!day && day.status === 'open' && getWorkDayDateKey(day) < getBusinessDateKey();
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data?.error || `Error de servidor (${response.status})`);
  }
  return data;
}

async function logWorkDayActivity(actionType: string, description: string, details: Record<string, any> = {}) {
  try {
    const storedUser = readStoredUser();
    await request('/activity-logs', {
      method: 'POST',
      body: JSON.stringify({
        log: {
          userName: storedUser?.name || storedUser?.username || details.Usuario || 'Sistema',
          userRole: storedUser?.role || 'operator',
          actionType,
          description,
          details: {
            ...details,
            'Fecha y Hora': new Date().toLocaleString('es-HN'),
          },
        },
      }),
    });
  } catch (error) {
    console.warn('No se pudo registrar actividad de jornada:', error);
  }
}

function normalizeWorkDay(row: any): WorkDay {
  return {
    ...row,
    day_number: Number(row.day_number || 0),
    opened_by: row.opened_by || row.metadata?.opened_by || null,
    opened_by_name: row.opened_by_name || row.metadata?.opened_by_name || 'Usuario',
    closed_by: row.closed_by || row.metadata?.closed_by || null,
    closed_by_name: row.closed_by_name || row.metadata?.closed_by_name || null,
    initial_cash_balance: Number(row.initial_cash_balance || 0),
    final_cash_balance: row.final_cash_balance == null ? null : Number(row.final_cash_balance),
  };
}

export async function getCurrentWorkDay(): Promise<WorkDay | null> {
  const data = await request('/work-days-table/current');
  return data?.day ? normalizeWorkDay(data.day) : null;
}

export async function openWorkDay(
  userId: string,
  initialCashBalance: number = 0,
  userName?: string,
  bills?: Record<string, number>
): Promise<WorkDay> {
  const data = await request('/work-days-table/open', {
    method: 'POST',
    body: JSON.stringify({ userId, initialCashBalance, userName, bills }),
  });
  const day = normalizeWorkDay(data.day);
  await logWorkDayActivity('inicio_dia', `Dia operativo iniciado por ${userName || day.opened_by_name || 'Sistema'}`, {
    Jornada: day.day_number,
    Usuario: userName || day.opened_by_name || userId,
    'Caja inicial': `L ${Number(initialCashBalance || 0).toFixed(2)}`,
  });
  return day;
}

export async function closeWorkDay(
  dayId: string,
  userId: string,
  notes?: string,
  userName?: string,
  finalCashBalance?: number
): Promise<WorkDay> {
  const data = await request(`/work-days-table/${encodeURIComponent(dayId)}/close`, {
    method: 'POST',
    body: JSON.stringify({ userId, notes, userName, finalCashBalance }),
  });
  const day = normalizeWorkDay(data.day);
  await logWorkDayActivity('cierre_dia', `Cierre de dia realizado por ${userName || day.closed_by_name || 'Sistema'}`, {
    Jornada: day.day_number,
    Usuario: userName || day.closed_by_name || userId,
    'Saldo final': `L ${Number(finalCashBalance ?? day.final_cash_balance ?? 0).toFixed(2)}`,
    Observaciones: notes || 'Sin observaciones',
  });
  return day;
}

export async function getWorkDayHistory(limit: number = 30): Promise<WorkDay[]> {
  try {
    const data = await request(`/work-days-table/history?limit=${encodeURIComponent(String(limit))}`);
    return (data?.days || data?.history || []).map(normalizeWorkDay);
  } catch (error) {
    console.error('Error getting work day history:', error);
    return [];
  }
}

export async function getWorkDayById(dayId: string): Promise<WorkDay | null> {
  try {
    const data = await request(`/work-days-table/${encodeURIComponent(dayId)}`);
    return data?.day ? normalizeWorkDay(data.day) : null;
  } catch (error) {
    console.error(`Error getting work day ${dayId}:`, error);
    return null;
  }
}

export async function saveDayReport(workDayId: string | null, report: any, generatedBy?: string) {
  const data = await request('/day-reports-table', {
    method: 'POST',
    body: JSON.stringify({ workDayId, report, generatedBy }),
  });
  return data?.report;
}

export async function getLatestDayReport(workDayId: string | null) {
  if (!workDayId) return null;

  try {
    const data = await request(`/day-reports-table/latest/${encodeURIComponent(workDayId)}`);
    return data?.report || null;
  } catch (error) {
    console.error(`Error getting day report for work day ${workDayId}:`, error);
    return null;
  }
}

export async function getPettyCashMovements(workDayId?: string | null) {
  const query = workDayId ? `?workDayId=${encodeURIComponent(workDayId)}` : '';
  const data = await request(`/petty-cash-movements-table${query}`);
  return data?.movements || [];
}

export const workDaysAPI = {
  getCurrent: getCurrentWorkDay,
  getHistory: getWorkDayHistory,
  getById: getWorkDayById,
  open: openWorkDay,
  close: closeWorkDay,
  saveReport: saveDayReport,
  getLatestReport: getLatestDayReport,
  getPettyCashMovements,
};
