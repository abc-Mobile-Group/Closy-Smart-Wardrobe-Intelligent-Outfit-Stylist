import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { authApi } from '../../src/api/endpoints';
import { ApiError } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, spacing } from '../../src/constants/theme';

// Sprint 1: màn hình tạm. Sprint 2 thay bằng lưới tủ đồ.
export default function WardrobeScreen() {
  const { email, signOut } = useAuthStore();
  const [check, setCheck] = useState<string | null>(null);

  const ping = async () => {
    setCheck('Đang kiểm tra...');
    try {
      const me = await authApi.me();
      setCheck(`Server OK. Tài khoản #${me.id}`);
    } catch (e) {
      setCheck(e instanceof ApiError ? e.message : 'Có lỗi xảy ra');
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.hello}>Xin chào</Text>
      <Text style={styles.email}>{email ?? 'bạn'}</Text>
      <Text style={styles.empty}>Tủ đồ còn trống. Bạn sẽ thêm món đầu tiên ở bản sau.</Text>

      <Pressable style={styles.secondary} onPress={ping}>
        <Text style={styles.secondaryText}>Kiểm tra kết nối server</Text>
      </Pressable>
      {check && <Text style={styles.check}>{check}</Text>}

      <Pressable style={styles.link} onPress={signOut}>
        <Text style={styles.linkText}>Đăng xuất</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.sm },
  hello: { fontSize: 14, color: colors.muted },
  email: { fontSize: 22, fontWeight: '700', color: colors.text },
  empty: { fontSize: 15, color: colors.muted, marginTop: spacing.md, lineHeight: 22 },
  secondary: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: colors.primary, fontWeight: '600' },
  check: { color: colors.muted, fontSize: 14 },
  link: { marginTop: spacing.lg, alignItems: 'center', padding: spacing.sm },
  linkText: { color: colors.danger, fontWeight: '600' },
});
