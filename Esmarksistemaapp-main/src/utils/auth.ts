/**
 * Autenticacion via Supabase Edge Function (esmark-sync).
 * No valida contrasenas en el cliente ni en localStorage.
 */

import { projectId, publicAnonKey, isSupabaseConfigured } from './supabase/info';
import { api } from './api';
import {
  clearAuthSession,
  isSameCalendarDay,
  persistSession,
  readStoredUser,
  SESSION_ACTIVE_KEY,
  SESSION_START_KEY,
} from './auth-session';
import type {
  LoginResult,
  RemoteAuthUser,
  RemoteSignInResponse,
  SessionUser,
  UserRole,
} from './auth-types';

export type { SessionUser, UserRole, LoginResult, RemoteAuthUser } from './auth-types';

const API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-sync`;

function assertSupabaseReady(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase no esta configurado.\n\nCopia .env.example a .env.local y define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    );
  }
}

function toSessionUser(user: RemoteAuthUser): SessionUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    role: user.role === 'admin' ? 'admin' : 'operator',
    photo: user.photo,
  };
}

/** Login contra el servidor (sin persistir sesion). */
export async function remoteSignIn(
  username: string,
  password: string
): Promise<RemoteSignInResponse> {
  assertSupabaseReady();

  const response = await fetch(`${API_URL}/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({
      username: username.trim(),
      password,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as RemoteSignInResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Usuario o contrasena incorrectos');
  }

  if (!data.user) {
    throw new Error('Respuesta de autenticacion invalida');
  }

  return data;
}

/**
 * Verifica credenciales en el servidor (descuentos / pedidos especiales).
 * No abre sesion de la aplicacion.
 */
export async function verifyUserCredentials(
  username: string,
  password: string
): Promise<
  | { ok: true; user: RemoteAuthUser }
  | { ok: false; reason: 'not_found' | 'invalid_password' | 'network' }
> {
  try {
    const data = await remoteSignIn(username, password);
    return { ok: true, user: data.user! };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (message.includes('incorrect') || message.includes('invalid') || message.includes('invalid')) {
      return { ok: false, reason: 'invalid_password' };
    }
    if (message.includes('no esta configurado')) {
      return { ok: false, reason: 'network' };
    }
    return { ok: false, reason: 'not_found' };
  }
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const data = await remoteSignIn(username, password);
  const sessionUser = toSessionUser(data.user!);

  if (data.token) {
    api.setToken(data.token);
  }

  persistSession(sessionUser, data.session);
  return { user: sessionUser, dayStarted: true };
}

export function logout(): void {
  api.setToken(null);
  clearAuthSession();
}

export function getCurrentUser(): SessionUser | null {
  return readStoredUser();
}

export function getCurrentUserName(): string {
  const user = getCurrentUser();
  return user?.name || user?.username || 'Sistema';
}

export function isCurrentUserAdmin(): boolean {
  return getCurrentUser()?.role === 'admin';
}

export function getInitialSession(): { user: SessionUser | null; dayStarted: boolean } {
  try {
    const sessionActive = localStorage.getItem(SESSION_ACTIVE_KEY);
    const sessionStart = localStorage.getItem(SESSION_START_KEY);
    const user = readStoredUser();

    if (sessionActive && sessionStart && user && isSameCalendarDay(sessionStart)) {
      return { user, dayStarted: true };
    }

    logout();
  } catch (e) {
    console.warn('getInitialSession: error leyendo sesion', e);
  }
  return { user: null, dayStarted: false };
}

export function isSessionActive(): boolean {
  const sessionActive = localStorage.getItem(SESSION_ACTIVE_KEY);
  const sessionStart = localStorage.getItem(SESSION_START_KEY);
  if (sessionActive !== 'true' || !sessionStart) return false;
  if (!isSameCalendarDay(sessionStart)) {
    logout();
    return false;
  }
  return !!getCurrentUser();
}

/** @deprecated Usuarios en servidor; usar api.getUsers() */
export function getStoredUsers(): RemoteAuthUser[] {
  return [];
}

