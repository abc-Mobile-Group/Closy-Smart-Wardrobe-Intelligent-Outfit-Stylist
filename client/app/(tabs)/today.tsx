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
import { EventService, PlannedEvent } from '../../src/services/EventService';
import { daysUntil } from '../../src/utils/eventDate';
import { OutfitService, SuggestedOutfit } from '../../src/services/OutfitService';
import { InsightService, WardrobeUtilizationStats } from '../../src/services/InsightService';
import { daysSince } from '../../src/utils/date';

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
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);
  const [utilizationStats, setUtilizationStats] = useState<WardrobeUtilizationStats | null>(null);
  const [nextEvent, setNextEvent] = useState<PlannedEvent | null>(null);

  // Lấy thời tiết hiện tại khi vào màn hình
  const fetchWeather = async () => {
    setIsLoadingWeather(true);
    try {
      const data = await WeatherService.getCurrentWeather();
      setWeather((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
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
        const list = await OutfitService.getSuggestions(items, currentContext.name, weather);
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

  /* [Code cũ - thay bằng InsightService (Issue #26)]
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
  */

  // Issue #26: Lọc món đồ ít dùng (wear_count == 0 hoặc > 30 ngày chưa mặc) & lấy món ngủ quên lâu nhất
  const longestUnusedInsight = useMemo(() => {
    return InsightService.getLongestUnusedItem(items);
  }, [items]);

  // Issue #26: Thống kê tỷ lệ tận dụng tủ đồ trong tuần / tháng
  useEffect(() => {
    let isMounted = true;
    InsightService.getUtilizationStats(items)
      .then((stats) => {
        if (isMounted) setUtilizationStats(stats);
      })
      .catch((e) => {
        console.warn('[TodayScreen] Lỗi tính thống kê tận dụng tủ đồ:', e);
      });
    return () => {
      isMounted = false;
    };
  }, [items]);

  const handleRemixUnusedItem = () => {
    if (!longestUnusedInsight) return;
    const remix = InsightService.buildRemixOutfit(
      longestUnusedInsight.item,
      items,
      currentContext.name,
    );
    router.push({
      pathname: '/outfit-detail',
      params: {
        context: remix.context,
        title: remix.title,
        subtitle: remix.subtitle,
        type: remix.type,
        harmonyBadge: remix.harmonyBadge,
        itemsJson: JSON.stringify(remix.items),
        itemIds: remix.items.map((i) => i.id).join(','),
      },
    });
  };

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

          {currentOutfit ? (
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

        {/* [Code cũ - thay bằng thẻ InsightService Issue #26]
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
        */}

        {/* Issue #26: Thẻ "Lâu rồi chưa mặc nhỉ?" hiển thị món đồ ngủ quên lâu nhất kèm nút "Thử phối lại hôm nay" */}
        {longestUnusedInsight && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderTopRow}>
              <Image
                source={{ uri: longestUnusedInsight.item.image_path }}
                style={styles.reminderThumb}
                resizeMode="cover"
              />
              <View style={styles.reminderInfo}>
                <View style={styles.reminderHeaderRow}>
                  <Text style={styles.reminderTitle}>Lâu rồi chưa mặc nhỉ?</Text>
                  <View style={styles.unusedTag}>
                    <Text style={styles.unusedTagText}>{longestUnusedInsight.reasonLabel}</Text>
                  </View>
                </View>
                <Text style={styles.reminderDesc}>
                  {longestUnusedInsight.item.name ||
                    `${longestUnusedInsight.item.category} ${longestUnusedInsight.item.color_name || ''}`.trim()}{' '}
                  đang ngủ quên trong tủ. Phối lại ngay để tối ưu tủ đồ của bạn nhé!
                </Text>
              </View>
            </View>
            <Pressable style={styles.remixBtn} onPress={handleRemixUnusedItem}>
              <Ionicons name="sparkles-outline" size={15} color={colors.onPrimary} />
              <Text style={styles.remixBtnText}>Thử phối lại hôm nay</Text>
            </Pressable>
          </View>
        )}

        {/* Issue #26: Thống kê tỷ lệ tận dụng tủ đồ trong tuần / tháng */}
        {utilizationStats && utilizationStats.totalItems > 0 && (
          <View style={styles.insightStatsCard}>
            <View style={styles.insightStatsHeader}>
              <View style={styles.insightStatsTitleGroup}>
                <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
                <Text style={styles.insightStatsTitle}>Tỷ lệ tận dụng tủ đồ</Text>
              </View>
              <Text style={styles.insightStatsSub}>
                {utilizationStats.unusedCount}/{utilizationStats.totalItems} món ít dùng
              </Text>
            </View>

            <View style={styles.statBarsGroup}>
              <View style={styles.statRow}>
                <View style={styles.statLabelRow}>
                  <Text style={styles.statPeriodLabel}>Trong tuần (7 ngày qua)</Text>
                  <Text style={styles.statValueText}>
                    {utilizationStats.weeklyRate}% ({utilizationStats.weeklyWornCount}/{utilizationStats.totalItems} món)
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, utilizationStats.weeklyRate)}%` },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statLabelRow}>
                  <Text style={styles.statPeriodLabel}>Trong tháng (30 ngày qua)</Text>
                  <Text style={styles.statValueText}>
                    {utilizationStats.monthlyRate}% ({utilizationStats.monthlyWornCount}/{utilizationStats.totalItems} món)
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFillMonthly,
                      { width: `${Math.min(100, utilizationStats.monthlyRate)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
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

  // Reminder Card (Issue #26: Lâu rồi chưa mặc nhỉ? + Thống kê tận dụng tủ đồ)
  reminderCard: {
    // [Code cũ]: flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F9FB',
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: '#E2F2F5',
    gap: spacing.sm,
  },
  reminderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  reminderThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: '#EAE6E1',
  },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  unusedTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  unusedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  reminderDesc: { fontSize: 11, color: colors.textMuted, marginTop: 3, lineHeight: 16 },
  remixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  remixBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  arrowIcon: { transform: [{ rotate: '45deg' }] },

  // Wardrobe Utilization Stats Card (Issue #26)
  insightStatsCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  insightStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightStatsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightStatsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  insightStatsSub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statBarsGroup: {
    gap: spacing.sm,
  },
  statRow: {
    gap: 5,
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statPeriodLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  statValueText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  progressTrack: {
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  progressFillMonthly: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: '#0EA5E9',
  },
});

