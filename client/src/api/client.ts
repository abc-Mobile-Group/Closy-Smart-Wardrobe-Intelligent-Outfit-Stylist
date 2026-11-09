import { sessionStore } from './session';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// AuthStore đăng ký hàm này để tự đăng xuất khi server trả 401.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type Opts = { auth?: boolean; timeoutMs?: number };

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  { auth = true, timeoutMs = 15000 }: Opts = {},
): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'Chưa cấu hình EXPO_PUBLIC_API_URL');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (auth) {
    const s = await sessionStore.get();
    if (s) headers.Authorization = `Bearer ${s.token}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL + path, { ...init, headers, signal: ctrl.signal });
    if (res.status === 401 && auth) onUnauthorized?.();
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.detail ?? `Lỗi server (${res.status})`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError(0, 'Server phản hồi quá chậm');
    throw new ApiError(0, 'Không kết nối được server');
  } finally {
    clearTimeout(timer);
  }
}
