import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/constants/theme';
import { SEED_ITEMS } from '../../src/constants/seedData';
import { useAuthStore } from '../../src/store/authStore';

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WORN_DAYS = [1, 6, 9, 12, 15, 17, 19];

export default function HistoryScreen() {
  const { email, name, openProfile } = useAuthStore();
  const [showBanner, setShowBanner] = useState(true);
  const [selectedDay, setSelectedDay] = useState(19);

  const displayName = name || (email ? email.split('@')[0] : 'An');
  const initial = displayName.charAt(0).toUpperCase();

  const teeItem = SEED_ITEMS.find((i) => i.id === '1');
  const jeansItem = SEED_ITEMS.find((i) => i.id === '4');
  const sneakerItem = SEED_ITEMS.find((i) => i.id === '7');
  const shirtItem = SEED_ITEMS.find((i) => i.id === '2');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Những ngày mặc đẹp</Text>
            <Text style={styles.subtitle}>Nhìn lại, để phối mới từ đồ cũ</Text>
          </View>
          <Pressable style={styles.avatar} onPress={openProfile}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {/* Success Alert Banner */}
        {showBanner && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconBg}>
              <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
            </View>
            <View style={styles.alertTextGroup}>
              <Text style={styles.alertTitle}>Đã lưu bộ đồ hôm nay</Text>
              <Text style={styles.alertSubtitle}>Chúc bạn một ngày đến lớp thật vui!</Text>
            </View>
            <Pressable onPress={() => setShowBanner(false)} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.textLight} />
            </Pressable>
          </View>
        )}

        {/* Calendar Widget */}
        <View style={styles.calendarCard}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <Pressable hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.calendarMonth}>Tháng 10, 2026</Text>
            <Pressable hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((day) => (
              <Text key={day} style={styles.weekText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Month Grid */}
          <View style={styles.daysGrid}>
            {/* Empty slots for start of month (Tháng 10 bắt đầu từ Thứ Năm: T2, T3, T4 trống) */}
            <View style={styles.dayCell} />
            <View style={styles.dayCell} />
            <View style={styles.dayCell} />

            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const isSelected = selectedDay === day;
              const hasWorn = WORN_DAYS.includes(day);

              return (
                <Pressable
                  key={day}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                    {day}
                  </Text>
                  {hasWorn && !isSelected && <View style={styles.wornDot} />}
                </Pressable>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.calendarLegend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Ngày đã xác nhận mặc</Text>
          </View>
        </View>

        {/* Outfit for Selected Day */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hôm nay, {selectedDay} tháng 10</Text>

          <View style={styles.todayOutfitCard}>
            {/* 3 items horizontal */}
            <View style={styles.outfitRow}>
              {teeItem && (
                <Image source={teeItem.image} style={styles.outfitItemImg} resizeMode="cover" />
              )}
              {jeansItem && (
                <Image source={jeansItem.image} style={styles.outfitItemImg} resizeMode="cover" />
              )}
              {sneakerItem && (
                <Image source={sneakerItem.image} style={styles.outfitItemImg} resizeMode="cover" />
              )}
            </View>

            {/* Meta */}
            <View style={styles.outfitCardFooter}>
              <View>
                <Text style={styles.outfitCardTitle}>Nhẹ nhàng đến lớp</Text>
                <Text style={styles.outfitCardDesc}>Đi học · Áo thun, jeans, sneaker</Text>
              </View>
              <View style={styles.wornBadge}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.wornBadgeText}>Đã mặc</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Past History */}
        <View style={styles.section}>
          <Text style={styles.pastDateLabel}>THỨ BẢY, 17 THÁNG 10</Text>
          <View style={styles.pastCard}>
            {shirtItem && (
              <Image source={shirtItem.image} style={styles.pastThumb} resizeMode="cover" />
            )}
            <View style={styles.pastInfo}>
              <Text style={styles.pastTitle}>Gọn gàng, sáng sủa</Text>
              <Text style={styles.pastSubtitle}>Đi chơi · Sơ mi trắng + kaki be</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 50, gap: spacing.md },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginTop: 2 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FB',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  alertIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextGroup: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  alertSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  // Calendar
  calendarCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    padding: spacing.md,
    gap: spacing.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  calendarMonth: { fontSize: 15, fontWeight: '700', color: colors.text },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs,
  },
  weekText: { fontSize: 11, fontWeight: '600', color: colors.textLight, width: 32, textAlign: 'center' },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 4,
  },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: { fontSize: 12, fontWeight: '600', color: colors.text },
  dayTextSelected: { color: colors.onPrimary, fontWeight: '700' },
  wornDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  legendDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary },
  legendText: { fontSize: 11, color: colors.textMuted },

  // Today Section
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  todayOutfitCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  outfitRow: { flexDirection: 'row', gap: spacing.sm, height: 110 },
  outfitItemImg: {
    flex: 1,
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
  outfitCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outfitCardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  outfitCardDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  wornBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#F0F9FB',
  },
  wornBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  // Past
  pastDateLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  pastThumb: { width: 50, height: 50, borderRadius: radius.xs, backgroundColor: '#EAE6E1' },
  pastInfo: { flex: 1, gap: 2 },
  pastTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  pastSubtitle: { fontSize: 11, color: colors.textMuted },
});

