import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useWardrobeStore } from '../../src/store/wardrobeStore';
import { WeatherData, WeatherService } from '../../src/services/WeatherService';
import { OutfitService, SuggestedOutfit } from '../../src/services/OutfitService';

const CONTEXTS = [
  { id: 'school', name: 'Đi học', icon: 'school-outline' },
  { id: 'work', name: 'Đi làm', icon: 'briefcase-outline' },
  { id: 'hangout', name: 'Đi chơi', icon: 'cafe-outline' },
  { id: 'date', name: 'Hẹn hò', icon: 'heart-outline' },
] as const;

export default function TodayScreen() {
  const router = useRouter();
  const { email, name, openProfile } = useAuthStore();
  const { items, loadItems } = useWardrobeStore();

  const [selectedContext, setSelectedContext] = useState<string>('school');
  const [showWeather, setShowWeather] = useState(true);
  const [weather, setWeather] = useState<WeatherData>(WeatherService.getDefaultWeather());
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [outfits, setOutfits] = useState<SuggestedOutfit[]>([]);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);

  // Lấy thời tiết hiện tại khi vào màn hình
  const fetchWeather = async () => {
    setIsLoadingWeather(true);
    try {
      const data = await WeatherService.getCurrentWeather();
      setWeather(data);
    } catch (e) {
      console.warn('[TodayScreen] Không thể lấy thời tiết, giữ mặc định:', e);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  // Tự động tải lại đồ khi quay lại tab Hôm nay
  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  // Tính ngày hiện tại hiển thị tiếng Việt (VD: "THỨ HAI, 16 THÁNG 11")
  const formattedDate = useMemo(() => {
    const now = new Date();
    const days = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const month = now.getMonth() + 1;
    return `${dayName}, ${date} THÁNG ${month}`;
  }, []);

  const currentContext = CONTEXTS.find((c) => c.id === selectedContext) || CONTEXTS[0];

  // Gọi bộ máy gợi ý phối đồ từ Backend (với fallback Local-First)
  useEffect(() => {
    let isMounted = true;
    const fetchSuggestions = async () => {
      if (items.length === 0) {
        if (isMounted) setOutfits([]);
        return;
      }
      setIsLoadingOutfits(true);
      try {
        const list = await OutfitService.getSuggestions(items, currentContext.name, weather);
        if (isMounted) setOutfits(list);
      } catch (err) {
        console.warn('[TodayScreen] Lỗi lấy gợi ý:', err);
      } finally {
        if (isMounted) setIsLoadingOutfits(false);
      }
    };

    fetchSuggestions();
    return () => {
      isMounted = false;
    };
  }, [items, currentContext.name, weather]);

  const currentOutfit = outfits.length > 0 ? outfits[0] : null;

  // Mục "Lâu rồi chưa mặc nhỉ?": Chỉ lấy từ đồ thật của người dùng
  const reminderItem = useMemo(() => {
    if (items.length > 0) {
      const dbItem = items[items.length - 1];
      return {
        name: dbItem.name || `${dbItem.category} ${dbItem.color_name || ''}`.trim(),
        image: { uri: dbItem.image_path },
      };
    }
    return null;
  }, [items]);

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
            <Text style={styles.headerSubtitle}>{formattedDate}</Text>
          </View>
          <Pressable style={styles.avatar} onPress={openProfile}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {/* Weather card (Tuân thủ User Story Sprint-3) */}
        {showWeather ? (
          <View style={styles.weatherCard}>
            <View style={styles.weatherLeft}>
              <Ionicons
                name={(weather.iconName as any) || 'partly-sunny-outline'}
                size={24}
                color={colors.primary}
              />
              <View style={styles.weatherTextGroup}>
                <Text style={styles.weatherTemp}>
                  {weather.temperature}° · {weather.locationName}, {weather.conditionDescription}
                </Text>
                <Text style={styles.weatherNote}>{weather.recommendationAdvice}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowWeather(false)}
              hitSlop={10}
              accessibilityLabel="Tạm ẩn widget thời tiết"
            >
              <Ionicons name="close" size={18} color={colors.textLight} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.weatherHiddenBar}>
            <Pressable
              style={styles.reopenWeatherBtn}
              onPress={() => setShowWeather(true)}
            >
              <Ionicons
                name={(weather.iconName as any) || 'partly-sunny-outline'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.reopenWeatherText}>
                {weather.temperature}° {weather.locationName} · Hiện lại thời tiết
              </Text>
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

          {currentOutfit ? (
            /* Large Outfit Inspiration Card */
            <View style={styles.outfitCard}>
              {/* Collage */}
              <View style={styles.collageContainer}>
                {currentOutfit.type === 'one_piece' ? (
                  currentOutfit.items.length === 1 ? (
                    <Image
                      source={currentOutfit.items[0].image}
                      style={styles.collageFull}
                      resizeMode="contain"
                    />
                  ) : (
                    <>
                      <View style={styles.collageLeft}>
                        {currentOutfit.items[1] && (
                          <Image
                            source={currentOutfit.items[1].image}
                            style={styles.collageSingleLeft}
                            resizeMode="contain"
                          />
                        )}
                        {currentOutfit.items[2] && (
                          <Image
                            source={currentOutfit.items[2].image}
                            style={styles.collageBottomLeft}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                      <Image
                        source={currentOutfit.items[0].image}
                        style={styles.collageRight}
                        resizeMode="contain"
                      />
                    </>
                  )
                ) : (
                  <>
                    <View style={styles.collageLeft}>
                      {currentOutfit.items[0] && (
                        <Image
                          source={currentOutfit.items[0].image}
                          style={styles.collageTopLeft}
                          resizeMode="contain"
                        />
                      )}
                      {currentOutfit.items[2] && (
                        <Image
                          source={currentOutfit.items[2].image}
                          style={styles.collageBottomLeft}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                    {currentOutfit.items[1] && (
                      <Image
                        source={currentOutfit.items[1].image}
                        style={styles.collageRight}
                        resizeMode="contain"
                      />
                    )}
                  </>
                )}
              </View>

              {/* Card info */}
              <View style={styles.outfitMeta}>
                <View style={styles.outfitTitleGroup}>
                  <Text style={styles.outfitTitle}>{currentOutfit.title}</Text>
                  <Text style={styles.outfitSubtitle}>{currentOutfit.subtitle}</Text>
                </View>
                <View style={styles.harmonyTagBadge}>
                  <Text style={styles.harmonyTagText}>{currentOutfit.harmonyBadge || '+3 Phối đẹp'}</Text>
                </View>
              </View>

              {/* CTA Button */}
              <Pressable
                style={styles.ctaButton}
                onPress={() => router.push('/(tabs)/suggest')}
              >
                <Text style={styles.ctaText}>Gợi ý phối đồ {currentContext.name.toLowerCase()} ✨</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyOutfitCard}>
              <Ionicons name="sparkles-outline" size={32} color={colors.primary} />
              <Text style={styles.emptyOutfitTitle}>Chưa có đủ đồ để phối</Text>
              <Text style={styles.emptyOutfitDesc}>
                {items.length === 0
                  ? 'Tủ đồ của bạn chưa có trang phục nào. Hãy chụp hoặc thêm áo, quần hoặc đầm để Closy gợi ý nhé!'
                  : 'Hãy thêm thêm áo, quần hoặc đầm để Closy tạo các bộ phối chuẩn phong cách!'}
              </Text>
              <Pressable
                style={styles.ctaButton}
                onPress={() => router.push('/add-item')}
              >
                <Text style={styles.ctaText}>Thêm món đồ đầu tiên 📸</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Lâu rồi chưa mặc nhỉ? */}
        {reminderItem && (
          <Pressable
            style={styles.reminderCard}
            onPress={() => router.push('/(tabs)/wardrobe')}
          >
            <Image source={reminderItem.image} style={styles.reminderThumb} resizeMode="cover" />
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderTitle}>Lâu rồi chưa mặc nhỉ?</Text>
              <Text style={styles.reminderDesc}>
                {reminderItem.name} đã nghỉ một thời gian. Thử phối lại hôm nay nhé.
              </Text>
            </View>
            <Ionicons name="arrow-up-outline" size={20} color={colors.primary} style={styles.arrowIcon} />
          </Pressable>
        )}
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
  weatherHiddenBar: {
    alignItems: 'flex-start',
  },
  reopenWeatherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#F0F9FB',
    borderWidth: 1,
    borderColor: '#E2F2F5',
  },
  reopenWeatherText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },

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
  collageSingleLeft: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
  collageFull: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
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
  harmonyTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#E0F2FE',
  },
  harmonyTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },

  emptyOutfitCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyOutfitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptyOutfitDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },

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

