import { create } from 'zustand';
import { ApiError } from '../api/client';
import { authApi } from '../api/endpoints';
import { sessionStore } from '../api/session';
import * as Auth from '../services/AuthService';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: Status;
  email: string | null;
  name: string | null;
  busy: boolean;
  error: string | null;
  isProfileOpen: boolean;
  init: () => Promise<void>;
  signIn: () => Promise<void>;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name?: string) => Promise<boolean>;
  updateName: (newName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  openProfile: () => void;
  closeProfile: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  email: null,
  name: null,
  busy: false,
  error: null,
  isProfileOpen: false,

  openProfile: () => set({ isProfileOpen: true }),
  closeProfile: () => set({ isProfileOpen: false }),
  clearError: () => set({ error: null }),

  init: async () => {
    const s = await Auth.loadSession();
    if (!s) {
      set({ status: 'signedOut', email: null, name: null });
      return;
    }
    set({ status: 'signedIn', email: s.email, name: s.name ?? null });
    // Tự động đồng bộ thông tin mới nhất từ /me nếu có kết nối mạng
    try {
      const me = await authApi.me();
      if (me.name && me.name !== s.name) {
        set({ name: me.name });
        await sessionStore.set({ ...s, name: me.name, email: me.email ?? s.email });
      }
    } catch {
      // Offline hoặc server chưa sẵn sàng, giữ phiên hiện tại
    }
  },

  signIn: async () => {
    set({ busy: true, error: null });
    try {
      const s = await Auth.signInWithGoogle();
      set({ status: 'signedIn', email: s.email, name: s.name ?? null, busy: false });
    } catch (e) {
      if (e instanceof Auth.SignInCancelled) {
        set({ busy: false });
        return;
      }
      const msg = e instanceof ApiError ? e.message : (e as Error)?.message || 'Đăng nhập không thành công. Thử lại nhé.';
      set({ busy: false, error: msg });
    }
  },

  login: async (email: string, pass: string) => {
    set({ busy: true, error: null });
    try {
      const s = await Auth.loginWithEmail(email, pass);
      set({ status: 'signedIn', email: s.email, name: s.name ?? null, busy: false });
      return true;
    } catch (e) {
      console.error('Lỗi login:', e);
      const msg = e instanceof ApiError ? e.message : (e as Error)?.message || 'Không kết nối được server';
      set({ busy: false, error: msg });
      return false;
    }
  },

  register: async (email: string, pass: string, name?: string) => {
    set({ busy: true, error: null });
    try {
      const s = await Auth.registerWithEmail(email, pass, name);
      set({ status: 'signedIn', email: s.email, name: s.name ?? null, busy: false });
      return true;
    } catch (e) {
      console.error('Lỗi register:', e);
      const msg = e instanceof ApiError ? e.message : (e as Error)?.message || 'Không kết nối được server';
      set({ busy: false, error: msg });
      return false;
    }
  },

  updateName: async (newName: string) => {
    set({ busy: true, error: null });
    try {
      const res = await authApi.updateProfile(newName);
      set({ name: res.name ?? newName, busy: false });
      const current = await sessionStore.get();
      if (current) {
        await sessionStore.set({ ...current, name: res.name ?? newName });
      }
      return true;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error)?.message || 'Không cập nhật được họ tên';
      set({ busy: false, error: msg });
      return false;
    }
  },

  signOut: async () => {
    await Auth.signOut();
    set({ status: 'signedOut', email: null, name: null, error: null, isProfileOpen: false });
  },
}));
