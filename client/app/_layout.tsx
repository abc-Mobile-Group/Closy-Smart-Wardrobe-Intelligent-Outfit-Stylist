import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { setUnauthorizedHandler } from '../src/api/client';
import { getDb } from '../src/db/database';
import { useAuthStore } from '../src/store/authStore';
import { colors } from '../src/constants/theme';
import ProfileModal from '../src/components/ProfileModal';

export default function RootLayout() {
  const { status, isProfileOpen, closeProfile } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Khử viền đen focus mặc định của trình duyệt web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const id = 'closy-web-style';
      if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
          *:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }
          [role="tab"] { outline: none !important; box-shadow: none !important; }
          button:focus { outline: none !important; }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Khởi động: mở DB (chạy migration) rồi đọc phiên đăng nhập đã lưu.
  useEffect(() => {
    setUnauthorizedHandler(() => useAuthStore.getState().signOut());
    (async () => {
      try {
        await getDb();
      } catch (e) {
        console.warn('Không mở được DB', e);
      }
      await useAuthStore.getState().init();
    })();
    return () => setUnauthorizedHandler(null);
  }, []);

  // Điều hướng theo trạng thái đăng nhập.
  useEffect(() => {
    if (status === 'loading') return;
    const currentSegment = segments[0] as string | undefined;
    const isPublicAuthPage = currentSegment === 'login' || currentSegment === 'register';

    if (status === 'signedOut' && !isPublicAuthPage && currentSegment !== 'onboarding') {
      router.replace('/login');
    }
    if (status === 'signedIn' && isPublicAuthPage) {
      router.replace('/(tabs)/today');
    }
  }, [status, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false }} />
      <ProfileModal visible={isProfileOpen} onClose={closeProfile} />
      {status === 'loading' && (
        <View style={styles.splash}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
