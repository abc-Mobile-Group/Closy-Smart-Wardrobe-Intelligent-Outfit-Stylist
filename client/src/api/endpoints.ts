import { apiFetch } from './client';

export type AuthResponse = {
  token: string;
  expires_at: number;
  email: string | null;
  name?: string | null;
};

export type Me = {
  id: number;
  email: string | null;
  name?: string | null;
};

export const authApi = {
  google: (idToken: string) =>
    apiFetch<AuthResponse>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify({ id_token: idToken }) },
      { auth: false },
    ),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      { auth: false },
    ),
  register: (email: string, password: string, name?: string) =>
    apiFetch<AuthResponse>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, name }) },
      { auth: false },
    ),
  me: () => apiFetch<Me>('/me'),
  updateProfile: (name: string) =>
    apiFetch<Me>(
      '/me',
      { method: 'PATCH', body: JSON.stringify({ name }) },
    ),
  health: () => apiFetch<{ ok: boolean }>('/health', {}, { auth: false, timeoutMs: 5000 }),
};
