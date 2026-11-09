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
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

export async function signInWithGoogle(): Promise<Session> {
  configure();
  try {
    await GoogleSignin.hasPlayServices();
    // Thư viện đổi kiểu trả về giữa các phiên bản; hỗ trợ cả hai dạng.
    const res: any = await GoogleSignin.signIn();
    if (res?.type === 'cancelled') throw new SignInCancelled();
    const idToken: string | undefined = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new Error('Không lấy được Google ID token');

    const r = await authApi.google(idToken);
    const session: Session = { token: r.token, expiresAt: r.expires_at, email: r.email };
    await sessionStore.set(session);
    return session;
  } catch (e) {
    if (e instanceof SignInCancelled) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) throw new SignInCancelled();
    throw e;
  }
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
