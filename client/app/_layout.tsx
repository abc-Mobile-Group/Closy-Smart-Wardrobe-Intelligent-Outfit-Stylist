import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { setUnauthorizedHandler } from '../src/api/client';
import { getDb } from '../src/db/database';
import { useAuthStore } from '../src/store/authStore';
import { colors } from '../src/constants/theme';

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

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
    const onLogin = segments[0] === 'login';
    if (status === 'signedOut' && !onLogin) router.replace('/login');
    if (status === 'signedIn' && onLogin) router.replace('/(tabs)/wardrobe');
  }, [status, segments, router]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {status === 'loading' && (
        <View style={styles.splash}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
