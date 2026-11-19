import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useWardrobeStore } from '../../src/store/wardrobeStore';
import { HistoryEntry, HistoryService } from '../../src/services/HistoryService';
import { toDateKey } from '../../src/utils/date';

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function HistoryScreen() {
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const { email, name, openProfile } = useAuthStore();
  const { items } = useWardrobeStore();
  const [showBanner, setShowBanner] = useState(saved === '1');
  const todayKey = toDateKey();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  useFocusEffect(
    useCallback(() => {
      HistoryService.getMonth(year, month).then(setEntries).catch(() => setEntries([]));
      if (saved === '1') setShowBanner(true);
    }, [year, month, saved]),
  );

  const displayName = name || (email ? email.split('@')[0] : 'An');
  const initial = displayName.charAt(0).toUpperCase();

  const wornDays = useMemo(
    () => new Set(entries.map((e) => Number(e.worn_date.slice(8, 10)))),
    [entries],
  );
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7; // tuần bắt đầu T2
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayKey = (d: number) => toDateKey(new Date(year, month, d));
  const selectedEntry = entries.find((e) => e.worn_date === selectedKey) ?? null;
  const userItems = useMemo(() => {
    if (!selectedEntry) return [];
    const ids = selectedEntry.item_ids.split(',').map(Number);
    return ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as typeof items;
  }, [selectedEntry, items]);

  const selDate = new Date(selectedKey.replace(/-/g, '/'));
  const selLabel = `${selDate.getDate()} tháng ${selDate.getMonth() + 1}`;
  const sectionTitle = selectedKey === todayKey ? `Hôm nay, ${selLabel}` : selLabel;

  const shiftMonth = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Những ngày mặc đẹp</Text>
            <Text style={styles.subtitle}>Nhìn lại, để phối mới từ đồ cũ</Text>
          </View>
          <Pressable style={styles.avatar} onPress={openProfile}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {showBanner && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconBg}>
              <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
            </View>
            <View style={styles.alertTextGroup}>
              <Text style={styles.alertTitle}>Đã lưu bộ đồ hôm nay</Text>
              <Text style={styles.alertSubtitle}>Chúc bạn một ngày thật vui!</Text>
            </View>
            <Pressable onPress={() => setShowBanner(false)} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.textLight} />
            </Pressable>
          </View>
        )}

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable hitSlop={8} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.calendarMonth}>Tháng {month + 1}, {year}</Text>
            <Pressable hitSlop={8} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((d) => (
              <View key={d} style={styles.weekCol}>
                <Text style={styles.weekText}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <View key={`b${i}`} style={styles.dayCellWrapper} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const key = dayKey(day);
              const isSelected = selectedKey === key;
              return (
                <View key={day} style={styles.dayCellWrapper}>
                  <Pressable
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => setSelectedKey(key)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                    {wornDays.has(day) && !isSelected && <View style={styles.wornDot} />}
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.calendarLegend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Ngày đã xác nhận mặc</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {selectedEntry && userItems.length > 0 ? (
            <View style={styles.todayOutfitCard}>
              <View style={styles.outfitRow}>
                {userItems.map((it) => (
                  <Image
                    key={it.id}
                    source={{ uri: it.image_path }}
                    style={styles.outfitItemImg}
                    resizeMode="contain"
                  />
                ))}
              </View>
              <View style={styles.outfitCardFooter}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.outfitCardTitle} numberOfLines={2}>
                    {userItems.map((i) => i.name).join(' + ')}
                  </Text>
                  <Text style={styles.outfitCardDesc}>{selectedEntry.context}</Text>
                </View>
                <View style={styles.wornBadge}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                  <Text style={styles.wornBadgeText}>Đã mặc</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyHistoryBox}>
              <Ionicons name="calendar-outline" size={32} color={colors.primary} />
              <Text style={styles.emptyHistoryText}>Chưa có lịch sử mặc đồ ngày này</Text>
              <Text style={styles.emptyHistorySub}>
                Hãy chọn và xác nhận trang phục bạn mặc để lưu lịch sử nhé.
              </Text>
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
  weekRow: { flexDirection: 'row', marginTop: spacing.xs },
  weekCol: { width: '14.285%', alignItems: 'center', justifyContent: 'center' },
  weekText: { fontSize: 11, fontWeight: '600', color: colors.textLight, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
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
  dayCellSelected: { backgroundColor: colors.primary },
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
    gap: spacing.sm,
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
  emptyHistoryText: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyHistorySub: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
