import { safeParse } from './safe-parse';
import type { SessionUser } from './auth-types';

export const SESSION_ACTIVE_KEY = 'session_active';
export const SESSION_START_KEY = 'session_start';
export const CURRENT_USER_KEY = 'current_user';
export const ESMARK_SESSION_KEY = 'esmark_session';

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isSameCalendarDay(sessionStart: string): boolean {
  const startDate = new Date(sessionStart);
  const now = new Date();
  return (
    startDate.getDate() === now.getDate() &&
    startDate.getMonth() === now.getMonth() &&
    startDate.getFullYear() === now.getFullYear()
  );
}

export function persistSession(user: SessionUser, remoteSession?: Record<string, unknown>): void {
  localStorage.setItem(SESSION_ACTIVE_KEY, 'true');
  localStorage.setItem(SESSION_START_KEY, new Date().toISOString());
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  if (remoteSession) {
    localStorage.setItem(ESMARK_SESSION_KEY, JSON.stringify(remoteSession));
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_ACTIVE_KEY);
  localStorage.removeItem(SESSION_START_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(ESMARK_SESSION_KEY);
  localStorage.removeItem('auth_token');
}

export function readStoredUser(): SessionUser | null {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return null;
    return safeParse(stored, null);
  } catch {
    return null;
  }
}
