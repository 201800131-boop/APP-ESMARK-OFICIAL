import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  login,
  logout,
  getCurrentUser,
  getInitialSession,
  isSessionActive,
  verifyUserCredentials,
} from './auth';

const mockUser = {
  id: '99',
  username: 'admin',
  name: 'Admin Supabase',
  role: 'admin',
  can_authorize_discounts: true,
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  localStorage.clear();
});

describe('auth (Supabase / esmark-sync)', () => {
  it('login con credenciales válidas crea sesión', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        token: 'test-token',
        user: mockUser,
        session: { id: '99', username: 'admin' },
      }),
    } as Response);

    const { user } = await login('admin', 'secret');
    expect(user.username).toBe('admin');
    expect(getCurrentUser()?.id).toBe('99');
    expect(isSessionActive()).toBe(true);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('login con contraseña incorrecta falla', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Credenciales inválidas' }),
    } as Response);

    await expect(login('admin', 'wrong')).rejects.toThrow();
    expect(getCurrentUser()).toBeNull();
  });

  it('logout limpia la sesión', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, token: 't', user: mockUser }),
    } as Response);

    await login('admin', 'secret');
    logout();
    expect(getCurrentUser()).toBeNull();
    expect(isSessionActive()).toBe(false);
  });

  it('getInitialSession restaura usuario del mismo día', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, token: 't', user: mockUser }),
    } as Response);

    await login('admin', 'secret');
    const session = getInitialSession();
    expect(session.user?.username).toBe('admin');
  });

  it('verifyUserCredentials valida sin abrir sesión', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: mockUser }),
    } as Response);

    const result = await verifyUserCredentials('admin', 'secret');
    expect(result.ok).toBe(true);
    expect(getCurrentUser()).toBeNull();
  });
});
