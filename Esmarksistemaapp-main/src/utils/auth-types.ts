export type UserRole = 'admin' | 'operator';

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  photo?: string;
}

export interface RemoteAuthUser extends SessionUser {
  active?: boolean;
  can_authorize_discounts?: boolean;
  email?: string;
}

export interface LoginResult {
  user: SessionUser;
  dayStarted: boolean;
}

export interface RemoteSignInResponse {
  success?: boolean;
  token?: string;
  user?: RemoteAuthUser;
  session?: Record<string, unknown>;
  error?: string;
}
