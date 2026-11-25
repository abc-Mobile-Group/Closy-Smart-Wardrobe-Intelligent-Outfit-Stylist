import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

/** Khung chờ 1 thẻ bộ đồ lớn + 2 thẻ nhỏ, nhấp nháy nhẹ. */
export default function OutfitSkeleton() {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View accessibilityLabel="Closy đang phối đồ cho bạn" accessibilityLiveRegion="polite">
      <Text style={styles.caption}>Closy đang phối đồ cho bạn...</Text>
      <Animated.View style={{ opacity, gap: spacing.sm }}>
        <View style={styles.big} />
        <View style={styles.row}>
          <View style={styles.small} />
          <View style={styles.small} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: spacing.sm },
  big: { height: 200, borderRadius: radius.lg, backgroundColor: '#EAE6E1' },
  row: { flexDirection: 'row', gap: spacing.sm },
  small: { flex: 1, height: 72, borderRadius: radius.md, backgroundColor: '#EAE6E1' },
});
