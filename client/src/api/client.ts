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

  // Kiểm tra FormData an toàn cho cả Web và React Native (Hermes / OkHttp)
  const isFormData =
    Boolean(init.body) &&
    (init.body instanceof FormData ||
      typeof (init.body as any)?.getParts === 'function' ||
      Boolean((init.body as any)?._parts) ||
      Object.prototype.toString.call(init.body) === '[object FormData]');

  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) ?? {}),
  };

  // Chỉ gắn Content-Type: application/json nếu body là chuỗi JSON
  if (!isFormData && typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Tuyệt đối không để Content-Type là application/json nếu đang gửi FormData
  if (isFormData) {
    delete headers['Content-Type'];
  }

  if (auth) {
    const s = await sessionStore.get();
    if (s) headers.Authorization = `Bearer ${s.token}`;
  }

  const fullUrl = API_URL + path;
  console.log(`[API ->] ${init.method || 'GET'} ${fullUrl}`, {
    isFormData,
    authRequired: auth,
    hasToken: Boolean(headers.Authorization),
    timeoutMs,
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(fullUrl, { ...init, headers, signal: ctrl.signal });
    console.log(`[API <-] ${res.status} ${res.statusText} from ${path}`);

    if (res.status === 401 && auth) onUnauthorized?.();
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      console.warn(`[API ERROR BODY] ${res.status} from ${path}:`, body);
      let detailMsg = `Lỗi server (${res.status})`;
      if (typeof body?.detail === 'string') {
        detailMsg = body.detail;
      } else if (Array.isArray(body?.detail)) {
        detailMsg = body.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      }
      throw new ApiError(res.status, detailMsg);
    }
    return (await res.json()) as T;
  } catch (e: any) {
    console.error(`[API FAILED] ${init.method || 'GET'} ${fullUrl}:`, {
      name: e?.name,
      message: e?.message,
      status: e?.status,
      stack: e?.stack,
    });
    if (e instanceof ApiError) throw e;
    if (e?.name === 'AbortError') {
      throw new ApiError(0, `Server phản hồi quá chậm (> ${timeoutMs / 1000}s)`);
    }
    throw new ApiError(0, `Không kết nối được server: [${e?.name || 'Error'}] ${e?.message || 'Lỗi mạng'}`);
  } finally {
    clearTimeout(timer);
  }
}
