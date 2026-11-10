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
import { CLOSY_LOGO, GOOGLE_LOGO } from '../src/constants/seedData';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, login, busy, error, clearError } = useAuthStore();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleStandardLogin = async () => {
    setLocalError(null);
    clearError();
    if (!emailOrPhone.trim()) {
      setLocalError('Vui lòng nhập email');
      return;
    }
    if (!password) {
      setLocalError('Vui lòng nhập mật khẩu');
      return;
    }

    const ok = await login(emailOrPhone.trim(), password);
    if (ok) {
      router.replace('/(tabs)/today');
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
          <Text style={styles.title}>Chào mừng bạn trở lại</Text>
          <Text style={styles.subtitle}>Đăng nhập để tìm bộ đồ đúng chất bạn.</Text>
        </View>

        {displayError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email / Số điện thoại</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập email hoặc số điện thoại"
                placeholderTextColor={colors.textLight}
                value={emailOrPhone}
                onChangeText={(t) => {
                  setEmailOrPhone(t);
                  if (displayError) {
                    setLocalError(null);
                    clearError();
                  }
                }}
                autoCapitalize="none"
                keyboardType="email-address"
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
          </View>

          <Pressable style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </Pressable>

          {/* Primary Login Button */}
          <Pressable
            style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
            onPress={handleStandardLogin}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>Đăng nhập</Text>
            )}
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons */}
        <View style={styles.socialRow}>
          <Pressable
            style={styles.socialBtn}
            onPress={signIn}
            disabled={busy}
          >
            <Image source={GOOGLE_LOGO} style={styles.googleIcon} resizeMode="contain" />
            <Text style={styles.socialBtnText}>Google</Text>
          </Pressable>

          <Pressable
            style={styles.socialBtn}
            onPress={() => router.replace('/(tabs)/today')}
          >
            <Ionicons name="logo-apple" size={20} color="#000000" />
            <Text style={styles.socialBtnText}>Apple</Text>
          </Pressable>
        </View>

        {/* Switch to Register */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Chưa có tài khoản? </Text>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.switchLink}>Đăng ký</Text>
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

  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { fontSize: 12, fontWeight: '600', color: colors.primary },

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

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textLight },

  socialRow: { flexDirection: 'row', gap: spacing.md },
  googleIcon: { width: 18, height: 18 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 46,
    backgroundColor: colors.bg,
  },
  socialBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  switchText: { fontSize: 13, color: colors.textMuted },
  switchLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
