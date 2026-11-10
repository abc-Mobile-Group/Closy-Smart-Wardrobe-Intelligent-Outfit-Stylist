import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { authApi } from '../api/endpoints';
import { Session, sessionStore } from '../api/session';

export class SignInCancelled extends Error {}

let configured = false;
function configure() {
  if (configured) return;
  if (Platform.OS !== 'web') {
    GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
  }
  configured = true;
}

export async function signInWithGoogle(): Promise<Session> {
  if (Platform.OS === 'web') {
    throw new Error('Đăng nhập Google chỉ hỗ trợ trên ứng dụng điện thoại. Vui lòng đăng nhập hoặc đăng ký bằng Email trên bản Web.');
  }
  configure();
  try {
    await GoogleSignin.hasPlayServices();
    // Thư viện đổi kiểu trả về giữa các phiên bản; hỗ trợ cả hai dạng.
    const res: any = await GoogleSignin.signIn();
    if (res?.type === 'cancelled') throw new SignInCancelled();
    const idToken: string | undefined = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new Error('Không lấy được Google ID token');

    const r = await authApi.google(idToken);
    const session: Session = {
      token: r.token,
      expiresAt: r.expires_at,
      email: r.email,
      name: r.name,
    };
    await sessionStore.set(session);
    return session;
  } catch (e) {
    if (e instanceof SignInCancelled) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) throw new SignInCancelled();
    throw e;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<Session> {
  const r = await authApi.login(email, password);
  const session: Session = {
    token: r.token,
    expiresAt: r.expires_at,
    email: r.email,
    name: r.name,
  };
  await sessionStore.set(session);
  return session;
}

export async function registerWithEmail(email: string, password: string, name?: string): Promise<Session> {
  const r = await authApi.register(email, password, name);
  const session: Session = {
    token: r.token,
    expiresAt: r.expires_at,
    email: r.email,
    name: r.name,
  };
  await sessionStore.set(session);
  return session;
}

/** Trả về phiên còn hạn, hoặc null (và xóa phiên cũ nếu đã hết hạn). */
export async function loadSession(): Promise<Session | null> {
  const s = await sessionStore.get();
  if (!s) return null;
  if (s.expiresAt * 1000 <= Date.now()) {
    await sessionStore.clear();
    return null;
  }
  return s;
}

export async function signOut(): Promise<void> {
  try {
    configure();
    await GoogleSignin.signOut();
  } catch {
    // bỏ qua: vẫn phải xóa phiên cục bộ
  }
  await sessionStore.clear();
}
