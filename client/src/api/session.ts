import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Session = {
  token: string;
  expiresAt: number; // giây (epoch)
  email: string | null;
  name?: string | null;
};

const KEY = 'closy_session';

// Bộ nhớ tạm thời nếu không có SecureStore hoặc localStorage
let memorySession: Session | null = null;

export const sessionStore = {
  async get(): Promise<Session | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(KEY);
          return raw ? (JSON.parse(raw) as Session) : memorySession;
        }
        return memorySession;
      }
      const raw = await SecureStore.getItemAsync(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return memorySession;
    }
  },

  async set(s: Session): Promise<void> {
    memorySession = s;
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(KEY, JSON.stringify(s));
        }
        return;
      }
      await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    } catch (e) {
      console.warn('Lỗi lưu SecureStore:', e);
    }
  },

  async clear(): Promise<void> {
    memorySession = null;
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(KEY);
    } catch (e) {
      console.warn('Lỗi xóa SecureStore:', e);
    }
  },
};
