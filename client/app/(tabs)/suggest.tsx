import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { describeMissing } from '../../src/utils/wardrobeGaps';
import { useDelayedFlag } from '../../src/utils/useDelayedFlag';

const CONTEXTS = ['Đi học', 'Đi làm', 'Đi chơi', 'Hẹn hò'] as const;

export default function SuggestScreen() {
  const router = useRouter();
  const { email, name, openProfile } = useAuthStore();
  const { items, loadItems } = useWardrobeStore();
  const [selectedContext, setSelectedContext] = useState<string>('Đi học');
  const [liked, setLiked] = useState<boolean | null>(null);
  const [weather, setWeather] = useState<WeatherData>(WeatherService.getDefaultWeather());
  const [outfits, setOutfits] = useState<SuggestedOutfit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const showLoading = useDelayedFlag(isLoading, 300);

  // Tải danh sách đồ và thời tiết
  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  useEffect(() => {
    WeatherService.getCurrentWeather()
      .then((data) => {
        if (data) setWeather((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
      })
      .catch(() => {});
  }, []);

  // Lấy danh sách gợi ý từ Backend Stylist Engine (Local-First fallback)
  useEffect(() => {
    let isMounted = true;
    const fetchRecs = async () => {
      if (items.length === 0) {
        if (isMounted) setOutfits([]);
        return;
      }
      setIsLoading(true);
      try {
        const list = await OutfitService.getSuggestions(items, selectedContext, weather);
        if (isMounted) setOutfits(list);
      } catch (err) {
        console.warn('[SuggestScreen] Lỗi lấy gợi ý:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchRecs();
    return () => {
      isMounted = false;
    };
  }, [items, selectedContext, weather]);

  const displayName = name || (email ? email.split('@')[0] : 'An');
  const initial = displayName.charAt(0).toUpperCase();

  const mainOutfit = outfits.length > 0 ? outfits[0] : null;
  const gap = useMemo(() => describeMissing(items), [items]);
  const altOutfits = outfits.slice(1, 3);

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
            <Text style={styles.title}>Phối đồ {selectedContext.toLowerCase()}</Text>
            <Text style={styles.subtitle}>
              {outfits.length > 0
                ? `${outfits.length} lựa chọn từ những món trong tủ đồ của bạn`
                : 'Gợi ý dựa trên màu sắc, bối cảnh và đồ trong tủ của bạn'}
            </Text>
          </View>
          <Pressable style={styles.avatar} onPress={openProfile}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {/* Context Selector */}
        <View style={styles.contextRow}>
          {CONTEXTS.map((ctx) => {
            const active = selectedContext === ctx;
            return (
              <Pressable
                key={ctx}
                style={[styles.contextChip, active && styles.contextChipActive]}
                onPress={() => setSelectedContext(ctx)}
              >
                <Text style={[styles.contextText, active && styles.contextTextActive]}>
                  {ctx}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Closy đang phối đồ cho bạn...</Text>
          </View>
        ) : isLoading ? null : mainOutfit ? (
          <>
            {/* Main Recommendation Section */}
            <View style={styles.recommendationBox}>
              {/* Box Header with Pagination Dots */}
              <View style={styles.recHeader}>
                <View style={styles.badgeWrapper}>
                  <Text style={styles.recTag}>GỢI Ý TỐT NHẤT</Text>
                  <View style={styles.harmonyBadge}>
                    <Text style={styles.harmonyBadgeText}>{mainOutfit.harmonyBadge}</Text>
                  </View>
                </View>
                <View style={styles.paginationDots}>
                  <View style={[styles.dot, styles.dotActive]} />
                  {altOutfits.map((_, i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
              </View>

              {/* Collage */}
              <View style={styles.collageContainer}>
                {mainOutfit.type === 'one_piece' ? (
                  mainOutfit.items.length === 1 ? (
                    <Image
                      source={mainOutfit.items[0].image}
                      style={styles.collageFull}
                      resizeMode="contain"
                    />
                  ) : (
                    <>
                      <View style={styles.collageLeft}>
                        {mainOutfit.items[1] && (
                          <Image
                            source={mainOutfit.items[1].image}
                            style={styles.collageTopLeft}
                            resizeMode="contain"
                          />
                        )}
                        {mainOutfit.items[2] && (
                          <Image
                            source={mainOutfit.items[2].image}
                            style={styles.collageBottomLeft}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                      <Image
                        source={mainOutfit.items[0].image}
                        style={styles.collageRight}
                        resizeMode="contain"
                      />
                    </>
                  )
                ) : (
                  <>
                    <View style={styles.collageLeft}>
                      {mainOutfit.items[0] && (
                        <Image
                          source={mainOutfit.items[0].image}
                          style={styles.collageTopLeft}
                          resizeMode="contain"
                        />
                      )}
                      {mainOutfit.items[2] && (
                        <Image
                          source={mainOutfit.items[2].image}
                          style={styles.collageBottomLeft}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                    {mainOutfit.items[1] && (
                      <Image
                        source={mainOutfit.items[1].image}
                        style={styles.collageRight}
                        resizeMode="contain"
                      />
                    )}
                  </>
                )}
              </View>

              {/* Outfit Info */}
              <View style={styles.outfitInfo}>
                <Text style={styles.outfitTitle}>{mainOutfit.title}</Text>
                <Text style={styles.outfitDesc}>{mainOutfit.subtitle}</Text>
                {mainOutfit.reasons && mainOutfit.reasons.length > 0 && (
                  <View style={styles.reasonBox}>
                    {mainOutfit.reasons.map((r, i) => (
                      <View key={i} style={styles.reasonRow}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                        <Text style={styles.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Feedback & Actions */}
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.feedbackBtn, liked === true && styles.feedbackBtnActive]}
                  onPress={() => setLiked(liked === true ? null : true)}
                >
                  <Ionicons
                    name={liked === true ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={18}
                    color={liked === true ? colors.primary : colors.textMuted}
                  />
                </Pressable>
                <Pressable
                  style={[styles.feedbackBtn, liked === false && styles.feedbackBtnActive]}
                  onPress={() => setLiked(liked === false ? null : false)}
                >
                  <Ionicons
                    name={liked === false ? 'thumbs-down' : 'thumbs-down-outline'}
                    size={18}
                    color={liked === false ? colors.danger : colors.textMuted}
                  />
                </Pressable>

                <Pressable
                  style={styles.adjustBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/outfit-detail',
                      params: {
                        context: selectedContext,
                        title: mainOutfit.title,
                        subtitle: mainOutfit.subtitle,
                        type: mainOutfit.type || 'two_piece',
                        harmonyBadge: mainOutfit.harmonyBadge || '',
                        itemsJson: JSON.stringify(mainOutfit.items),
                        itemIds: mainOutfit.items.map((i) => i.id).join(','),
                      },
                    })
                  }
                >
                  <Text style={styles.adjustBtnText}>Chọn bộ này</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
                </Pressable>
              </View>
            </View>

            {/* Alternative Section */}
            {altOutfits.length > 0 && (
              <View style={styles.altSection}>
                <Text style={styles.altSectionTitle}>Hay thử một cảm giác khác?</Text>

                {altOutfits.map((alt, idx) => (
                  <Pressable
                    key={alt.id || idx}
                    style={styles.altCard}
                    onPress={() =>
                      router.push({
                        pathname: '/outfit-detail',
                        params: {
                          context: selectedContext,
                          title: alt.title,
                          subtitle: alt.subtitle,
                          type: alt.type || 'two_piece',
                          harmonyBadge: alt.harmonyBadge || '',
                          itemsJson: JSON.stringify(alt.items),
                          itemIds: alt.items.map((i) => i.id).join(','),
                        },
                      })
                    }
                  >
                    <View style={styles.altThumbs}>
                      {alt.items[0] && (
                        <Image
                          source={alt.items[0].image}
                          style={styles.altThumbImg}
                          resizeMode="contain"
                        />
                      )}
                      <View style={styles.altThumbsSub}>
                        {alt.items[1] && (
                          <Image
                            source={alt.items[1].image}
                            style={styles.altThumbSmall}
                            resizeMode="contain"
                          />
                        )}
                        {alt.items[2] && (
                          <Image
                            source={alt.items[2].image}
                            style={styles.altThumbSmall}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                    </View>

                    <View style={styles.altInfo}>
                      <Text style={styles.altTitle}>{alt.title}</Text>
                      <Text style={styles.altSub}>{alt.subtitle}</Text>
                      <Text style={styles.altTag}>{alt.harmonyBadge}</Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <Ionicons name="shirt-outline" size={48} color={colors.primary} />
            <Text style={styles.emptyTitle}>{gap.title}</Text>
            <Text style={styles.emptyDesc}>{gap.message}</Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() =>
                router.push({
                  pathname: '/add-item',
                  params: gap.category ? { category: gap.category } : {},
                })
              }
            >
              <Ionicons name="add" size={20} color={colors.onPrimary} />
              <Text style={styles.emptyBtnText}>{gap.cta}</Text>
            </Pressable>
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginTop: 2 },

  // Context Switcher
  contextRow: { flexDirection: 'row', gap: spacing.xs },
  contextChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextChipActive: { backgroundColor: colors.primary },
  contextText: { fontSize: 13, fontWeight: '600', color: colors.chipInactiveText },
  contextTextActive: { color: colors.chipActiveText },

  // Recommendation Card Box
  recommendationBox: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    padding: spacing.md,
    gap: spacing.sm,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recTag: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  harmonyBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  harmonyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  paginationDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotActive: { backgroundColor: colors.primary, width: 14 },

  // Loading & Empty
  loadingBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  emptyBtnText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Collage
  collageContainer: {
    flexDirection: 'row',
    height: 190,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  collageLeft: { flex: 1, gap: spacing.sm },
  collageFull: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
  collageSingleLeft: {
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

  // Info
  outfitInfo: { gap: 4 },
  outfitTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  outfitDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  // Reasons
  reasonBox: { gap: 4, marginTop: 4 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasonText: { flex: 1, fontSize: 12, color: colors.textMuted },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  feedbackBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#F0F9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBtnActive: {
    backgroundColor: '#CCEAEF',
  },
  adjustBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  adjustBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },

  // Alt Section
  altSection: { gap: spacing.sm },
  altSectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  altThumbs: { width: 72, height: 72, flexDirection: 'row', gap: 3 },
  altThumbImg: { flex: 1, height: '100%', borderRadius: radius.xs, backgroundColor: '#EAE6E1' },
  altThumbsSub: { flex: 1, gap: 3 },
  altThumbSmall: { flex: 1, width: '100%', borderRadius: radius.xs, backgroundColor: '#EAE6E1' },

  altInfo: { flex: 1, gap: 2 },
  altTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  altSub: { fontSize: 11, color: colors.textMuted },
  altTag: { fontSize: 10, fontWeight: '600', color: colors.primary, marginTop: 2 },
});
