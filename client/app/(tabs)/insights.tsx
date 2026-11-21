import React, { useCallback, useMemo } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useWardrobeStore } from '../../src/store/wardrobeStore';
import { WeatherService } from '../../src/services/WeatherService';
import { OutfitService } from '../../src/services/OutfitService';
import { analyzeGaps, analyzeUsage, UnderusedItem } from '../../src/services/InsightService';
import { WardrobeItem } from '../../src/types/item';

export default function InsightsScreen() {
  const router = useRouter();
  const { email, name, openProfile } = useAuthStore();
  const { items, loadItems, deleteItem } = useWardrobeStore();

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, []),
  );

  const displayName = name || (email ? email.split('@')[0] : 'An');
  const initial = displayName.charAt(0).toUpperCase();

  const usage = useMemo(() => analyzeUsage(items), [items]);
  const gaps = useMemo(() => analyzeGaps(items), [items]);

  const handleReuse = async (item: WardrobeItem) => {
    const first = (item.contexts || '').split(',').map((c) => c.trim()).find((c) => c && c !== 'Mọi dịp');
    const context = first || 'Đi học';
    const outfit = await OutfitService.findOutfitWith(items, item.id, context, WeatherService.getDefaultWeather());
    if (!outfit) {
      Alert.alert('Chưa phối được', 'Hãy thêm áo/quần đi kèm để Closy phối món này.');
      return;
    }
    router.push({
      pathname: '/outfit-detail',
      params: {
        context,
        title: outfit.title,
        subtitle: outfit.subtitle,
        type: outfit.type,
        harmonyBadge: outfit.harmonyBadge,
        itemsJson: JSON.stringify(outfit.items),
        itemIds: outfit.items.map((i) => i.id).join(','),
      },
    });
  };

  const handleDonate = (item: WardrobeItem) => {
    Alert.alert(
      'Đã cho đi?',
      `Xóa "${item.name}" khỏi tủ đồ? Hành động này không hoàn tác được.`,
      [
        { text: 'Giữ lại', style: 'cancel' },
        { text: 'Xóa khỏi tủ', style: 'destructive', onPress: () => deleteItem(item.id) },
      ],
    );
  };

  const renderUnderused = (u: UnderusedItem) => (
    <View key={u.item.id} style={styles.rowCard}>
      <Image source={{ uri: u.item.image_path }} style={styles.thumb} resizeMode="contain" />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{u.item.name}</Text>
        <Text style={styles.rowSub}>
          {u.neverWorn ? `Chưa mặc lần nào · thêm ${u.idleDays} ngày trước` : `${u.idleDays} ngày chưa mặc`}
        </Text>
        {u.advice === 'donate' && <Text style={styles.donateTag}>Cân nhắc cho đi hoặc từ thiện</Text>}
      </View>
      <View style={styles.rowActions}>
        <Pressable style={styles.actBtn} onPress={() => handleReuse(u.item)}>
          <Text style={styles.actBtnText}>Phối ngay</Text>
        </Pressable>
        {u.advice === 'donate' && (
          <Pressable style={[styles.actBtn, styles.actBtnGhost]} onPress={() => handleDonate(u.item)}>
            <Text style={styles.actGhostText}>Đã cho đi</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Thống kê tủ đồ</Text>
            <Text style={styles.subtitle}>Mặc đồ cũ nhiều hơn, mua đúng thứ còn thiếu</Text>
          </View>
          <Pressable style={styles.avatar} onPress={openProfile}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}><Text style={styles.statNum}>{usage.totalItems}</Text><Text style={styles.statLabel}>Món đồ</Text></View>
          <View style={styles.statCard}><Text style={styles.statNum}>{usage.totalWears}</Text><Text style={styles.statLabel}>Lần mặc</Text></View>
          <View style={styles.statCard}><Text style={styles.statNum}>{usage.neverWornCount}</Text><Text style={styles.statLabel}>Chưa mặc</Text></View>
        </View>

        <Pressable style={styles.eventCard} onPress={() => router.push('/events')}>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Sự kiện quan trọng</Text>
            <Text style={styles.rowSub}>Lưu ngày đám cưới, phỏng vấn... và lên đồ trang trọng</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="stats-chart-outline" size={32} color={colors.primary} />
            <Text style={styles.rowTitle}>Chưa có dữ liệu</Text>
            <Text style={styles.rowSub}>Thêm đồ vào tủ và xác nhận mặc để xem thống kê.</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tủ còn thiếu gì?</Text>
              {gaps.length === 0 ? (
                <View style={styles.okBox}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.rowSub}>Tủ đồ của bạn khá đầy đủ.</Text>
                </View>
              ) : (
                gaps.map((g) => (
                  <View key={g.id} style={[styles.gapCard, g.severity === 'high' && styles.gapHigh]}>
                    <Ionicons
                      name={g.severity === 'high' ? 'alert-circle-outline' : 'bulb-outline'}
                      size={20}
                      color={g.severity === 'high' ? colors.danger : colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{g.title}</Text>
                      <Text style={styles.rowSub}>{g.detail}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mặc nhiều nhất</Text>
              {usage.mostWorn.length === 0 ? (
                <Text style={styles.rowSub}>Chưa có lần mặc nào. Hãy xác nhận bộ đồ ở màn Phối đồ.</Text>
              ) : (
                usage.mostWorn.map((it) => (
                  <View key={it.id} style={styles.rowCard}>
                    <Image source={{ uri: it.image_path }} style={styles.thumb} resizeMode="contain" />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{it.name}</Text>
                      <Text style={styles.rowSub}>{it.category}</Text>
                    </View>
                    <Text style={styles.wearCount}>{it.wear_count} lần</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lâu rồi chưa mặc</Text>
              {usage.underused.length === 0 ? (
                <View style={styles.okBox}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.rowSub}>Không có món nào bị bỏ quên.</Text>
                </View>
              ) : (
                usage.underused.map(renderUnderused)
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 50, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginTop: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },

  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.surfaceSubtle, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#F0F9FB',
    borderRadius: radius.md, padding: spacing.sm + 4, borderWidth: 1, borderColor: '#E2F2F5',
  },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceCard, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: '#EAE6E1' },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  rowActions: { gap: 6, alignItems: 'flex-end' },
  actBtn: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  actBtnText: { color: colors.onPrimary, fontSize: 11, fontWeight: '700' },
  actBtnGhost: { backgroundColor: colors.dangerLight },
  actGhostText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  donateTag: { fontSize: 10, fontWeight: '700', color: colors.danger },
  wearCount: { fontSize: 13, fontWeight: '800', color: colors.primary },
  gapCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: '#F0F9FB', borderRadius: radius.md, padding: spacing.sm + 2, borderWidth: 1, borderColor: '#BAE6FD' },
  gapHigh: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  okBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm },
  emptyBox: { alignItems: 'center', gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceCard },
});
