import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../src/constants/theme';
import { CLOSY_LOGO } from '../src/constants/seedData';
import { useAuthStore } from '../src/store/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, busy, error, clearError } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    setLocalError(null);
    clearError();
    if (!fullName.trim()) {
      setLocalError('Vui lòng nhập họ và tên');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Vui lòng nhập email hợp lệ');
      return;
    }
    if (password.length < 8) {
      setLocalError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    const ok = await register(email.trim(), password, fullName.trim());
    if (ok) {
      // Chuyển sang màn hình Onboarding chọn phong cách
      router.replace('/onboarding');
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Banner */}
        <View style={styles.logoBanner}>
          <Image source={CLOSY_LOGO} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* Title */}
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Tạo tài khoản Closy</Text>
          <Text style={styles.subtitle}>Tạo tài khoản để cùng Closy khám phá tủ đồ.</Text>
        </View>

        {displayError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Họ Tên</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập họ và tên"
                placeholderTextColor={colors.textLight}
                value={fullName}
                onChangeText={(t) => {
                  setFullName(t);
                  if (displayError) {
                    setLocalError(null);
                    clearError();
                  }
                }}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập địa chỉ email"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (displayError) {
                    setLocalError(null);
                    clearError();
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mật khẩu</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (displayError) {
                    setLocalError(null);
                    clearError();
                  }
                }}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textLight}
                />
              </Pressable>
            </View>
            <Text style={styles.hintText}>Sử dụng ít nhất 8 ký tự cho mật khẩu.</Text>
          </View>

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>Đăng ký</Text>
            )}
          </Pressable>

          <Text style={styles.disclaimerText}>
            Bằng việc đăng ký, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của Closy.
          </Text>
        </View>

        {/* Switch to Login */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Đã có tài khoản? </Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.switchLink}>Đăng nhập</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, justifyContent: 'center' },

  logoBanner: {
    height: 85,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  logoImage: { width: 80, height: 80 },

  titleGroup: { gap: 4 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textMuted },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 10,
    borderRadius: radius.md,
  },
  errorText: { color: colors.danger, fontSize: 13, flex: 1 },

  form: { gap: spacing.md, marginTop: spacing.xs },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.bg,
  },
  input: { flex: 1, fontSize: 14, color: colors.text },
  eyeBtn: { padding: 4 },
  hintText: { fontSize: 11, color: colors.textLight },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },

  disclaimerText: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  switchText: { fontSize: 13, color: colors.textMuted },
  switchLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
