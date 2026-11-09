import * as SecureStore from 'expo-secure-store';

export type Session = {
  token: string;
  expiresAt: number; // giây (epoch)
  email: string | null;
};

const KEY = 'closy_session';

export const sessionStore = {
  async get(): Promise<Session | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  async set(s: Session): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  },
};
