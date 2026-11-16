import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { HistoryService, WearRecord, localDay } from '../../src/services/HistoryService';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];


export default function HistoryScreen() {
  const { email, name, openProfile } = useAuthStore();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [records, setRecords] = useState<WearRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    HistoryService.listMonth(month.getFullYear(), month.getMonth()).then((rows) => {
      if (active) setRecords(rows);
    }).catch(() => { if (active) setError('Không thể tải lịch sử. Hãy mở lại tab để thử lại.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month]));
  const changeMonth = (delta: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    setSelectedDay(1);
    setRecords([]);
  };
  const selectedDate = localDay(new Date(month.getFullYear(), month.getMonth(), selectedDay));
  const selectedRecords = records.filter((record) => record.worn_day === selectedDate);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7;

  const displayName = name || (email ? email.split('@')[0] : 'An');
  const initial = displayName.charAt(0).toUpperCase();



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

        {/* Calendar Widget */}
        <View style={styles.calendarCard}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <Pressable hitSlop={8} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.calendarMonth}>{month.getMonth() + 1} / {month.getFullYear()}</Text>
            <Pressable hitSlop={8} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((day) => (
              <View key={day} style={styles.weekCol}>
                <Text style={styles.weekText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Month Grid */}
          <View style={styles.daysGrid}>
            {/* Empty slots for start of month (Tháng 10/2026 bắt đầu từ Thứ Năm: T2, T3, T4 trống) */}
            {Array.from({ length: offset }, (_, index) => <View key={`blank-${index}`} style={styles.dayCellWrapper} />)}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isSelected = selectedDay === day;
              const hasWorn = records.some((record) => record.worn_day === localDay(new Date(month.getFullYear(), month.getMonth(), day)));

              return (
                <View key={day} style={styles.dayCellWrapper}>
                  <Pressable
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                      {day}
                    </Text>
                    {hasWorn && <View style={[styles.wornDot, isSelected && { backgroundColor: colors.onPrimary }]} />}
                  </Pressable>
                </View>
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
          <Text style={styles.sectionTitle}>{selectedDay}/{month.getMonth() + 1}/{month.getFullYear()}</Text>

          {loading ? <Text>Đang tải lịch sử...</Text> : error ? <Text>{error}</Text> : selectedRecords.length > 0 ? selectedRecords.map((record) => (

            <View key={record.id} style={styles.todayOutfitCard}>
              {/* items horizontal */}
              <View style={styles.outfitRow}>
                {record.items.map((it) => (
                  <Image
                    key={it.id}
                    source={{ uri: it.image_path }}
                    style={styles.outfitItemImg}
                    resizeMode="contain"
                  />
                ))}
              </View>

              {/* Meta */}
              <View style={styles.outfitCardFooter}>
                <View>
                  <Text style={styles.outfitCardTitle}>{record.context}</Text>
                  <Text style={styles.outfitCardDesc}>Bộ đồ từ tủ đồ cá nhân của bạn</Text>
                </View>
                <View style={styles.wornBadge}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                  <Text style={styles.wornBadgeText}>Đã mặc</Text>
                </View>
              </View>
            </View>
          )) : (
            <View style={styles.emptyHistoryBox}>
              <Ionicons name="calendar-outline" size={32} color={colors.primary} />
              <Text style={styles.emptyHistoryText}>Chưa có lịch sử mặc đồ</Text>
              <Text style={styles.emptyHistorySub}>Hãy chọn và xác nhận trang phục bạn mặc để lưu lịch sử nhé.</Text>
            </View>
          )}
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
    marginTop: spacing.xs,
  },
  weekCol: {
    width: '14.285%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekText: { fontSize: 11, fontWeight: '600', color: colors.textLight, textAlign: 'center' },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  dayCellWrapper: {
    width: '14.285%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  emptyHistoryBox: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptyHistorySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },

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

