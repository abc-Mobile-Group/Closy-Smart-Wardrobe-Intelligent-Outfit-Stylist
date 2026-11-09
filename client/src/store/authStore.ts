import { create } from 'zustand';
import { ApiError } from '../api/client';
import * as Auth from '../services/AuthService';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: Status;
  email: string | null;
  busy: boolean;
  error: string | null;
  init: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  email: null,
  busy: false,
  error: null,

  init: async () => {
    const s = await Auth.loadSession();
    set(s ? { status: 'signedIn', email: s.email } : { status: 'signedOut', email: null });
  },

  signIn: async () => {
    set({ busy: true, error: null });
    try {
      const s = await Auth.signInWithGoogle();
      set({ status: 'signedIn', email: s.email, busy: false });
    } catch (e) {
      if (e instanceof Auth.SignInCancelled) {
        set({ busy: false });
        return;
      }
      const msg = e instanceof ApiError ? e.message : 'Đăng nhập không thành công. Thử lại nhé.';
      set({ busy: false, error: msg });
    }
  },

  signOut: async () => {
    await Auth.signOut();
    set({ status: 'signedOut', email: null, error: null });
  },
}));
