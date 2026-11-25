import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';

type Tone = 'warning' | 'info' | 'error';

export type BannerAction = {
  label: string;
  onPress: () => void;
  primary?: boolean;
};

type InlineBannerProps = {
  tone?: Tone;
  title: string;
  message?: string;
  actions?: BannerAction[];
};

const TONES = {
  warning: { bg: '#FFFBEB', border: '#FDE68A', fg: '#92400E', icon: 'warning-outline' },
  info: { bg: '#F0F9FB', border: '#BAE6FD', fg: colors.primaryDark, icon: 'information-circle-outline' },
  error: { bg: '#FEF2F2', border: '#FECACA', fg: colors.danger, icon: 'alert-circle-outline' },
} as const;

/** Banner báo lỗi/nhắc nhẹ không chặn luồng, mỗi lỗi có lối thoát (nút hành động). */
export default function InlineBanner({ tone = 'warning', title, message, actions = [] }: InlineBannerProps) {
  const t = TONES[tone];
  return (
    <View
      style={[styles.box, { backgroundColor: t.bg, borderColor: t.border }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Ionicons name={t.icon} size={20} color={t.fg} />
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: t.fg }]}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              accessibilityRole="button"
              style={[styles.btn, a.primary && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[styles.btnText, a.primary && { color: colors.onPrimary }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm + 4,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '700' },
  message: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  btn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 12, fontWeight: '700', color: colors.text },
});
