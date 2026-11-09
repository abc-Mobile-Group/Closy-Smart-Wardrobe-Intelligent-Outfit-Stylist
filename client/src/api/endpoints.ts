import { apiFetch } from './client';

export type AuthResponse = { token: string; expires_at: number; email: string | null };
export type Me = { id: number; email: string | null };

export const authApi = {
  google: (idToken: string) =>
    apiFetch<AuthResponse>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify({ id_token: idToken }) },
      { auth: false },
    ),
  me: () => apiFetch<Me>('/me'),
  health: () => apiFetch<{ ok: boolean }>('/health', {}, { auth: false, timeoutMs: 5000 }),
};
