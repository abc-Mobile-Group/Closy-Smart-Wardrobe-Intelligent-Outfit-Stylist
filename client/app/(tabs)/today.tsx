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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/constants/theme';
import { SEED_ITEMS } from '../../src/constants/seedData';
import { useAuthStore } from '../../src/store/authStore';

const CONTEXTS = [
  { id: 'school', name: 'Đi học', icon: 'school-outline' },
  { id: 'work', name: 'Đi làm', icon: 'briefcase-outline' },
  { id: 'hangout', name: 'Đi chơi', icon: 'cafe-outline' },
  { id: 'date', name: 'Hẹn hò', icon: 'heart-outline' },
] as const;

export default function TodayScreen() {
  const router = useRouter();
  const { email, name, openProfile } = useAuthStore();
  const [selectedContext, setSelectedContext] = useState<string>('school');
  const [showWeather, setShowWeather] = useState(true);

  const teeItem = SEED_ITEMS.find((i) => i.id === '1');
  const sneakerItem = SEED_ITEMS.find((i) => i.id === '7');
  const jeansItem = SEED_ITEMS.find((i) => i.id === '4');
  const jacketItem = SEED_ITEMS.find((i) => i.id === '3');

  const displayName = name || (email ? email.split('@')[0] : 'An');
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Chào buổi sáng & Avatar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Chào buổi sáng, {displayName}!</Text>
            <Text style={styles.headerSubtitle}>THỨ HAI, 19 THÁNG 10</Text>
          </View>
          <Pressable style={styles.avatar} onPress={openProfile}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {/* Weather card */}
        {showWeather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherLeft}>
              <Ionicons name="partly-sunny-outline" size={24} color={colors.primary} />
              <View style={styles.weatherTextGroup}>
                <Text style={styles.weatherTemp}>26° · Hà Nội, trời dịu mát</Text>
                <Text style={styles.weatherNote}>Tham khảo thêm, không bắt buộc khi phối đồ</Text>
              </View>
            </View>
            <Pressable onPress={() => setShowWeather(false)} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.textLight} />
            </Pressable>
          </View>
        )}

        {/* Hôm nay bạn đi đâu? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hôm nay bạn đi đâu?</Text>
          <View style={styles.contextGrid}>
            {CONTEXTS.map((ctx) => {
              const active = selectedContext === ctx.id;
              return (
                <Pressable
                  key={ctx.id}
                  style={[styles.contextBtn, active && styles.contextBtnActive]}
                  onPress={() => setSelectedContext(ctx.id)}
                >
                  <Ionicons
                    name={ctx.icon as any}
                    size={22}
                    color={active ? colors.onPrimary : colors.primary}
                  />
                  <Text style={[styles.contextText, active && styles.contextTextActive]}>
                    {ctx.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Một chút cảm hứng hôm nay */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Một chút cảm hứng hôm nay</Text>
            <Pressable onPress={() => router.push('/(tabs)/wardrobe')}>
              <Text style={styles.sectionLink}>Từ tủ đồ của bạn</Text>
            </Pressable>
          </View>

          {/* Large Outfit Inspiration Card */}
          <View style={styles.outfitCard}>
            {/* Collage 3 images */}
            <View style={styles.collageContainer}>
              <View style={styles.collageLeft}>
                {teeItem && (
                  <Image source={teeItem.image} style={styles.collageTopLeft} resizeMode="cover" />
                )}
                {sneakerItem && (
                  <Image source={sneakerItem.image} style={styles.collageBottomLeft} resizeMode="cover" />
                )}
              </View>
              {jeansItem && (
                <Image source={jeansItem.image} style={styles.collageRight} resizeMode="cover" />
              )}
            </View>

            {/* Card info */}
            <View style={styles.outfitMeta}>
              <View style={styles.outfitTitleGroup}>
                <Text style={styles.outfitTitle}>Nhẹ nhàng đến lớp</Text>
                <Text style={styles.outfitSubtitle}>Kem + xanh đậm · Dễ mặc, dễ phối</Text>
              </View>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
            </View>

            {/* CTA Button */}
            <Pressable
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)/suggest')}
            >
              <Text style={styles.ctaText}>Gợi ý phối đồ đi học ✨</Text>
            </Pressable>
          </View>
        </View>

        {/* Lâu rồi chưa mặc nhỉ? */}
        <Pressable
          style={styles.reminderCard}
          onPress={() => router.push('/(tabs)/wardrobe')}
        >
          {jacketItem && (
            <Image source={jacketItem.image} style={styles.reminderThumb} resizeMode="cover" />
          )}
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>Lâu rồi chưa mặc nhỉ?</Text>
            <Text style={styles.reminderDesc}>
              Áo khoác ô liu đã nghỉ 18 ngày. Thử phối lại hôm nay nhé.
            </Text>
          </View>
          <Ionicons name="arrow-up-outline" size={20} color={colors.primary} style={styles.arrowIcon} />
        </Pressable>
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
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 2, letterSpacing: 0.5 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },

  // Weather
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FB',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#E2F2F5',
  },
  weatherLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  weatherTextGroup: { flex: 1 },
  weatherTemp: { fontSize: 13, fontWeight: '700', color: colors.text },
  weatherNote: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  // Context Selection
  section: { marginTop: spacing.xs, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  sectionLink: { fontSize: 13, fontWeight: '600', color: colors.primary },

  contextGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  contextBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  contextBtnActive: {
    backgroundColor: colors.primary,
  },
  contextText: { fontSize: 12, fontWeight: '600', color: colors.text },
  contextTextActive: { color: colors.onPrimary },

  // Outfit Card
  outfitCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  collageContainer: {
    flexDirection: 'row',
    height: 200,
    gap: spacing.sm,
  },
  collageLeft: { flex: 1, gap: spacing.sm },
  collageTopLeft: {
    flex: 1,
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
  collageBottomLeft: {
    flex: 1,
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
  collageRight: {
    flex: 1,
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },

  outfitMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outfitTitleGroup: { flex: 1 },
  outfitTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  outfitSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },

  // Reminder Card
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FB',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#E2F2F5',
    gap: spacing.sm,
  },
  reminderThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: '#EAE6E1',
  },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  reminderDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  arrowIcon: { transform: [{ rotate: '45deg' }] },
});

