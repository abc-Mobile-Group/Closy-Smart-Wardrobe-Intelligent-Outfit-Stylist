import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
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
import { EventService, PlannedEvent } from '../../src/services/EventService';
import { daysUntil } from '../../src/utils/eventDate';
import { OutfitService, SuggestedOutfit } from '../../src/services/OutfitService';
import { daysSince } from '../../src/utils/date';
import OutfitSkeleton from '../../src/components/OutfitSkeleton';
import PermissionPrompt from '../../src/components/PermissionPrompt';
import { describeMissing } from '../../src/utils/wardrobeGaps';
import { useDelayedFlag } from '../../src/utils/useDelayedFlag';

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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherState, setWeatherState] = useState<'checking' | 'ok' | 'denied' | 'unavailable'>('checking');
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [outfits, setOutfits] = useState<SuggestedOutfit[]>([]);
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);
  const [nextEvent, setNextEvent] = useState<PlannedEvent | null>(null);
  const showSkeleton = useDelayedFlag(isLoadingOutfits, 300);

  // Thời tiết: chỉ xin quyền vị trí sau khi người dùng đồng ý ở màn giải thích (P3).
  // Không có thời tiết thật thì ẩn thẻ, việc phối đồ vẫn chạy bình thường (O1).
  const fetchWeather = async (askPermission = false) => {
    setIsLoadingWeather(true);
    try {
      const data = await WeatherService.getCurrentWeather({ askPermission });
      setWeather((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
      if (data) {
        setWeatherState('ok');
      } else {
        const st = await WeatherService.getPermissionStatus();
        setWeatherState(st === 'granted' ? 'unavailable' : 'denied');
      }
    } catch (e) {
      console.warn('[TodayScreen] Không thể lấy thời tiết:', e);
      setWeatherState('unavailable');
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const status = await WeatherService.getPermissionStatus();
      if (!alive) return;
      if (status === 'granted') {
        await fetchWeather();
      } else if (status === 'undetermined') {
        setWeatherState('unavailable');
        setShowLocationPrompt(true);
      } else {
        setWeatherState('denied');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleAllowLocation = async () => {
    setShowLocationPrompt(false);
    await fetchWeather(true);
  };

  const handleLaterLocation = () => {
    setShowLocationPrompt(false);
    setWeatherState('denied');
  };

  const handleWeatherChip = async () => {
    const status = await WeatherService.getPermissionStatus();
    if (status === 'undetermined') setShowLocationPrompt(true);
    else if (status === 'denied') Linking.openSettings();
    else await fetchWeather();
  };

  // Tự động tải lại đồ khi quay lại tab Hôm nay
  useFocusEffect(
    useCallback(() => {
      loadItems();
      EventService.listUpcoming()
        .then((list) => setNextEvent(list[0] ?? null))
        .catch(() => setNextEvent(null));
    }, [])
  );

  // Reset về bộ số 1 khi đổi bối cảnh hoặc danh sách đồ thay đổi
  useEffect(() => {
    setActiveOutfitIndex(0);
  }, [selectedContext, items]);

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
        const list = await OutfitService.getSuggestions(
          items,
          currentContext.name,
          weather ?? WeatherService.getDefaultWeather(),
        );
        if (isMounted) {
          setOutfits(list);
          setActiveOutfitIndex(0);
        }
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

  const currentOutfit = outfits.length > 0 ? outfits[Math.min(activeOutfitIndex, outfits.length - 1)] : null;
  const gap = useMemo(() => describeMissing(items), [items]);

  // Mục "Lâu rồi chưa mặc nhỉ?": Chỉ lấy từ đồ thật của người dùng
  const reminderItem = useMemo(() => {
    if (items.length === 0) return null;
    // Món chưa mặc bao giờ hoặc mặc lâu nhất
    const oldest = [...items].sort(
      (a, b) =>
        (a.last_worn ?? '').localeCompare(b.last_worn ?? '') ||
        a.created_at.localeCompare(b.created_at),
    )[0];
    const d = daysSince(oldest.last_worn);
    if (d !== null && d < 7) return null; // mới mặc gần đây thì không nhắc
    return {
      name: oldest.name || `${oldest.category} ${oldest.color_name || ''}`.trim(),
      image: { uri: oldest.image_path },
    };
  }, [items]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  }, []);

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
            <Text style={styles.headerTitle}>{greeting}, {displayName}!</Text>
            <Text style={styles.headerSubtitle}>{formattedDate}</Text>
          </View>
          <Pressable style={styles.avatar} onPress={openProfile}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {/* Thời tiết: chỉ hiện khi có dữ liệu thật. Không có thì hiện chip nhỏ, vẫn phối đồ bình thường */}
        {weather ? (
          showWeather ? (
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
          )
        ) : weatherState === 'checking' ? null : (
          <View style={styles.weatherHiddenBar}>
            <Pressable
              style={styles.reopenWeatherBtn}
              onPress={handleWeatherChip}
              accessibilityRole="button"
            >
              <Ionicons name="cloud-offline-outline" size={14} color={colors.primary} />
              <Text style={styles.reopenWeatherText}>
                {weatherState === 'denied'
                  ? 'Chưa có thời tiết · chạm để bật vị trí'
                  : 'Chưa có thời tiết · chạm để thử lại'}
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

          {/* Dải chọn các tổ hợp phối đồ (Multiple combinations) */}
          {outfits.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.comboPillRow}
            >
              {outfits.map((outfit, index) => {
                const active = index === activeOutfitIndex;
                return (
                  <Pressable
                    key={outfit.id || index}
                    style={[styles.comboPill, active && styles.comboPillActive]}
                    onPress={() => setActiveOutfitIndex(index)}
                  >
                    <Ionicons
                      name={active ? 'sparkles' : 'shirt-outline'}
                      size={13}
                      color={active ? colors.onPrimary : colors.primary}
                    />
                    <Text
                      style={[
                        styles.comboPillText,
                        active && styles.comboPillTextActive,
                      ]}
                    >
                      {index === 0 ? 'Bộ 1 · Chuẩn nhất' : `Bộ ${index + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {showSkeleton && !currentOutfit ? (
            <OutfitSkeleton />
          ) : isLoadingOutfits && !currentOutfit ? null : currentOutfit ? (
            <>
              {/* Large Outfit Inspiration Card */}
              <View style={styles.outfitCard}>
                {/* Header thanh điều hướng tổ hợp: Bộ X / Y */}
                {outfits.length > 1 && (
                  <View style={styles.comboHeaderRow}>
                    <Text style={styles.comboCounterText}>
                      GỢI Ý {activeOutfitIndex + 1} / {outfits.length} · {currentContext.name.toUpperCase()}
                    </Text>
                    <View style={styles.comboArrowGroup}>
                      <Pressable
                        style={[styles.comboArrowBtn, activeOutfitIndex === 0 && styles.comboArrowDisabled]}
                        onPress={() => setActiveOutfitIndex((p) => Math.max(0, p - 1))}
                        disabled={activeOutfitIndex === 0}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={16}
                          color={activeOutfitIndex === 0 ? colors.textLight : colors.text}
                        />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.comboArrowBtn,
                          activeOutfitIndex === outfits.length - 1 && styles.comboArrowDisabled,
                        ]}
                        onPress={() => setActiveOutfitIndex((p) => Math.min(outfits.length - 1, p + 1))}
                        disabled={activeOutfitIndex === outfits.length - 1}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={activeOutfitIndex === outfits.length - 1 ? colors.textLight : colors.text}
                        />
                      </Pressable>
                    </View>
                  </View>
                )}

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

                {currentOutfit.reasons && currentOutfit.reasons.length > 0 && (
                  <View style={styles.reasonBox}>
                    {currentOutfit.reasons.map((r, i) => (
                      <View key={i} style={styles.reasonRow}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                        <Text style={styles.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* CTA Button */}
                <Pressable
                  style={styles.ctaButton}
                  onPress={() =>
                    router.push({
                      pathname: '/outfit-detail',
                      params: {
                        context: currentContext.name,
                        title: currentOutfit.title,
                        subtitle: currentOutfit.subtitle,
                        type: currentOutfit.type || 'two_piece',
                        harmonyBadge: currentOutfit.harmonyBadge || '',
                        itemsJson: JSON.stringify(currentOutfit.items),
                        itemIds: currentOutfit.items.map((i) => i.id).join(','),
                      },
                    })
                  }
                >
                  <Text style={styles.ctaText}>Chi tiết bộ phối {currentContext.name.toLowerCase()} ✨</Text>
                </Pressable>
              </View>

              {/* Danh sách các cách phối khác (Alternative combinations) */}
              {outfits.length > 1 && (
                <View style={styles.otherCombosSection}>
                  <Text style={styles.otherCombosTitle}>
                    Các cách phối khác cho {currentContext.name.toLowerCase()}:
                  </Text>
                  {outfits.map((outfit, index) => {
                    if (index === activeOutfitIndex) return null;
                    return (
                      <Pressable
                        key={outfit.id || index}
                        style={styles.otherComboCard}
                        onPress={() => setActiveOutfitIndex(index)}
                      >
                        <View style={styles.otherComboThumbs}>
                          {outfit.items.map((it, itIdx) => (
                            <Image
                              key={it.id || itIdx}
                              source={it.image}
                              style={styles.otherComboThumbImg}
                              resizeMode="contain"
                            />
                          ))}
                        </View>
                        <View style={styles.otherComboInfo}>
                          <Text style={styles.otherComboName} numberOfLines={1}>
                            Bộ {index + 1}: {outfit.title}
                          </Text>
                          <Text style={styles.otherComboSub} numberOfLines={1}>
                            {outfit.subtitle}
                          </Text>
                        </View>
                        <View style={styles.otherComboBadge}>
                          <Text style={styles.otherComboBadgeText}>Xem bộ này</Text>
                          <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyOutfitCard}>
              <Ionicons name="sparkles-outline" size={32} color={colors.primary} />
              <Text style={styles.emptyOutfitTitle}>{gap.title}</Text>
              <Text style={styles.emptyOutfitDesc}>{gap.message}</Text>
              <Pressable
                style={styles.ctaButton}
                onPress={() =>
                  router.push({
                    pathname: '/add-item',
                    params: gap.category ? { category: gap.category } : {},
                  })
                }
              >
                <Text style={styles.ctaText}>{gap.cta}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Sự kiện quan trọng */}
        <Pressable style={styles.eventCard} onPress={() => router.push('/events')}>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>
              {nextEvent
                ? `${nextEvent.type} · ${daysUntil(nextEvent.date) === 0 ? 'hôm nay' : 'còn ' + daysUntil(nextEvent.date) + ' ngày'}`
                : 'Có sự kiện quan trọng?'}
            </Text>
            <Text style={styles.eventDesc}>
              {nextEvent ? nextEvent.note || 'Chạm để lên đồ cho sự kiện' : 'Lưu ngày và nhờ Closy lên đồ trang trọng.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>

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
      <PermissionPrompt
        visible={showLocationPrompt}
        icon="location-outline"
        title="Xem thời tiết nơi bạn ở?"
        message="Closy dùng vị trí để xem thời tiết và gợi ý đồ hợp trời. Vị trí không được lưu. Bạn có thể bỏ qua, vẫn phối đồ bình thường."
        confirmLabel="Cho phép"
        cancelLabel="Để sau"
        onConfirm={handleAllowLocation}
        onCancel={handleLaterLocation}
      />
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

  // Multi-combination Pills
  comboPillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  comboPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: '#F0F9FB',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  comboPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  comboPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  comboPillTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },

  // Combo Card Header
  comboHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comboCounterText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  comboArrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comboArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  comboArrowDisabled: {
    opacity: 0.35,
  },

  // Alternative Combos Section
  otherCombosSection: {
    marginTop: spacing.sm,
    gap: spacing.xs + 2,
  },
  otherCombosTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  otherComboCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  otherComboThumbs: {
    flexDirection: 'row',
    gap: 4,
  },
  otherComboThumbImg: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    backgroundColor: '#EAE6E1',
  },
  otherComboInfo: {
    flex: 1,
    gap: 2,
  },
  otherComboName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  otherComboSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  otherComboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FB',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  otherComboBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  // Reasons
  reasonBox: { gap: 4 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasonText: { flex: 1, fontSize: 12, color: colors.textMuted },

  // Event Card
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  eventDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

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

