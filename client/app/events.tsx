import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../src/constants/theme';
import { useWardrobeStore } from '../src/store/wardrobeStore';
import { WeatherService } from '../src/services/WeatherService';
import { OutfitService } from '../src/services/OutfitService';
import { EVENT_CONTEXT, EVENT_TYPES, EventService, PlannedEvent } from '../src/services/EventService';
import { addDays, daysUntil, formatDateVi, isValidDateKey, toKey } from '../src/utils/eventDate';

const QUICK = [
  { label: 'Ngày mai', days: 1 },
  { label: '+7 ngày', days: 7 },
  { label: '+30 ngày', days: 30 },
];

export default function EventsScreen() {
  const router = useRouter();
  const { items, loadItems } = useWardrobeStore();
  const [events, setEvents] = useState<PlannedEvent[]>([]);
  const [type, setType] = useState<string>(EVENT_TYPES[0]);
  const [date, setDate] = useState(addDays(toKey(), 7));
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      setEvents(await EventService.listUpcoming());
    } catch (e) {
      console.warn('[events] Lỗi tải sự kiện:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
      reload();
    }, [reload]),
  );

  const handleAdd = async () => {
    if (!isValidDateKey(date)) {
      Alert.alert('Ngày chưa đúng', 'Nhập ngày theo dạng NĂM-THÁNG-NGÀY, ví dụ 2026-12-25.');
      return;
    }
    if (daysUntil(date) < 0) {
      Alert.alert('Ngày đã qua', 'Hãy chọn ngày từ hôm nay trở đi.');
      return;
    }
    await EventService.add({ date, type, note });
    setNote('');
    reload();
  };

  const handleSuggest = async (ev: PlannedEvent) => {
    if (items.length === 0) {
      Alert.alert('Tủ đồ trống', 'Hãy thêm vài món đồ trước khi lên đồ cho sự kiện.');
      return;
    }
    setBusyId(ev.id);
    try {
      const weather =
        (await WeatherService.getCurrentWeather().catch(() => null)) ?? WeatherService.getDefaultWeather();
      const list = await OutfitService.getSuggestions(items, EVENT_CONTEXT, weather);
      const best = list[0];
      if (!best) {
        Alert.alert('Chưa phối được', 'Cần ít nhất một áo + quần/váy, hoặc một chiếc đầm.');
        return;
      }
      router.push({
        pathname: '/outfit-detail',
        params: {
          context: EVENT_CONTEXT,
          title: `${ev.type}: ${best.title}`,
          subtitle: best.subtitle,
          type: best.type,
          harmonyBadge: best.harmonyBadge,
          itemsJson: JSON.stringify(best.items),
          itemIds: best.items.map((i) => i.id).join(','),
        },
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = (ev: PlannedEvent) => {
    Alert.alert('Xóa sự kiện', `Xóa "${ev.type}" ngày ${formatDateVi(ev.date)}?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await EventService.remove(ev.id); reload(); } },
    ]);
  };

  const whenLabel = (d: string) => {
    const n = daysUntil(d);
    return n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : `Còn ${n} ngày`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Sự kiện quan trọng</Text>
          <Text style={styles.headerSub}>Lưu ngày, đến lúc Closy lên đồ trang trọng cho bạn</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.label}>Loại sự kiện</Text>
          <View style={styles.chipRow}>
            {EVENT_TYPES.map((t) => (
              <Pressable key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Ngày (NĂM-THÁNG-NGÀY)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-12-25"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
          <View style={styles.chipRow}>
            {QUICK.map((q) => (
              <Pressable key={q.label} style={styles.chip} onPress={() => setDate(addDays(toKey(), q.days))}>
                <Text style={styles.chipText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Ghi chú (tuỳ chọn)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="Ví dụ: Đám cưới bạn Lan"
            placeholderTextColor={colors.textLight}
          />

          <Pressable style={styles.saveBtn} onPress={handleAdd}>
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.saveBtnText}>Lưu sự kiện</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Sắp tới</Text>
        {events.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            <Text style={styles.evTitle}>Chưa có sự kiện nào</Text>
            <Text style={styles.evSub}>Thêm sự kiện ở trên để chuẩn bị trang phục sớm.</Text>
          </View>
        ) : (
          events.map((ev) => (
            <View key={ev.id} style={styles.evCard}>
              <View style={styles.evInfo}>
                <Text style={styles.evTitle}>{ev.type}</Text>
                <Text style={styles.evSub}>{formatDateVi(ev.date)} · {whenLabel(ev.date)}</Text>
                {!!ev.note && <Text style={styles.evNote}>{ev.note}</Text>}
              </View>
              <Pressable style={styles.suggestBtn} onPress={() => handleSuggest(ev)} disabled={busyId === ev.id}>
                <Ionicons name="sparkles" size={13} color={colors.onPrimary} />
                <Text style={styles.suggestText}>{busyId === ev.id ? 'Đang phối...' : 'Lên đồ'}</Text>
              </Pressable>
              <Pressable hitSlop={10} onPress={() => handleRemove(ev)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  formCard: { backgroundColor: colors.surfaceCard, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#93C5FD', padding: spacing.md, gap: spacing.xs + 2 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, fontSize: 14, color: colors.text, backgroundColor: colors.bg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.chipInactiveText },
  chipTextActive: { color: colors.chipActiveText },
  saveBtn: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, height: 46 },
  saveBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  evCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceCard, borderRadius: radius.md, padding: spacing.sm + 2, borderWidth: 1, borderColor: colors.border },
  evInfo: { flex: 1, gap: 2 },
  evTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  evSub: { fontSize: 12, color: colors.textMuted },
  evNote: { fontSize: 12, color: colors.text },
  suggestBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  suggestText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
  emptyBox: { alignItems: 'center', gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceCard },
});
