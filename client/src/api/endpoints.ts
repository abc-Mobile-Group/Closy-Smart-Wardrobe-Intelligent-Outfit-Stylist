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

export type ProcessedColor = {
  hex: string;
  h: number;
  s: number;
  l: number;
  name: string;
  closest_palette_id: string;
};

export type ColorPaletteItem = {
  hex: string;
  h: number;
  s: number;
  l: number;
  name: string;
  percentage: number;
  closest_preset: {
    id: string;
    name: string;
    hex: string;
  };
};

export type ProcessImageResponse = {
  success: boolean;
  image_base64?: string;
  format?: string;
  width?: number;
  height?: number;
  color?: ProcessedColor;
  palette?: ColorPaletteItem[];
  process_time_sec?: number;
  category?: 'Áo' | 'Quần' | 'Váy' | 'Giày';
  name?: string;
  formality?: 1 | 3 | 5;
  contexts?: string[];
  is_clothing?: boolean;
  rejection_reason?: string;
  message?: string;
};

export const imageApi = {
  processBase64: (imageBase64: string, timeoutMs = 35000) =>
    apiFetch<ProcessImageResponse>('/image/process', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    }, { auth: true, timeoutMs }),

  process: (formData: FormData, timeoutMs = 35000) =>
    apiFetch<ProcessImageResponse>('/image/process', {
      method: 'POST',
      body: formData,
    }, { auth: true, timeoutMs }),
};

