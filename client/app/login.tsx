import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { colors, radius, spacing } from '../src/constants/theme';

export default function LoginScreen() {
  const { signIn, busy, error } = useAuthStore();

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.stitch} />
        <Text style={styles.title}>Closy</Text>
        <Text style={styles.subtitle}>Tủ đồ của bạn, chọn bộ nhanh hơn mỗi sáng.</Text>
      </View>

      <View style={styles.actions}>
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          onPress={signIn}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, (pressed || busy) && { opacity: 0.8 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập bằng Google</Text>
          )}
        </Pressable>
        <Text style={styles.note}>
          Ảnh và tủ đồ được lưu trên điện thoại của bạn. Tài khoản chỉ dùng để nhận diện bạn.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center' },
  stitch: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.stitch, marginBottom: spacing.md },
  title: { fontSize: 44, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  subtitle: { fontSize: 18, color: colors.muted, marginTop: spacing.sm, lineHeight: 26, maxWidth: 300 },
  actions: { paddingBottom: spacing.lg, gap: spacing.md },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});
