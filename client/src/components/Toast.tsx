import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';

type ToastProps = {
  visible: boolean;
  message: string;
  onHide: () => void;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Thông báo ngắn tự tắt (trạng thái Success). Đặt bên trong một View có flex: 1
 * (toast nằm sát đáy View đó, phía trên thanh tab).
 */
export default function Toast({
  visible,
  message,
  onHide,
  duration = 2500,
  actionLabel,
  onAction,
}: ToastProps) {
  // Giữ onHide mới nhất mà không làm đặt lại bộ đếm mỗi lần màn hình render lại
  const hideRef = useRef(onHide);
  hideRef.current = onHide;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => hideRef.current(), duration);
    return () => clearTimeout(timer);
  }, [visible, duration]);

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
        <Text style={styles.text}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={() => {
              onAction();
              onHide();
            }}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  text: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  action: { color: '#7DD3FC', fontSize: 13, fontWeight: '700' },
});
