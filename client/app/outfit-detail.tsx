import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../src/constants/theme';
import { useWardrobeStore } from '../src/store/wardrobeStore';
import { outfitHarmony, outfitSignature, swapOutfit } from '../src/engine/swap';
import { HistoryService } from '../src/services/HistoryService';

interface OutfitItemModel {
  id: string;
  name: string;
  category: 'Áo' | 'Quần' | 'Váy' | 'Đầm' | 'Giày';
  colorName?: string;
  colorHex?: string;
  image: any;
  imagePath?: string;
}

export default function OutfitDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    context?: string;
    title?: string;
    subtitle?: string;
    type?: string;
    harmonyBadge?: string;
    itemsJson?: string;
    itemIds?: string;
  }>();

  const { items: dbItems } = useWardrobeStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [lockedItemIds, setLockedItemIds] = useState<string[]>([]);
  const [swapMessage, setSwapMessage] = useState('');
  const [seenOutfits, setSeenOutfits] = useState<Set<string>>(new Set());

  useEffect(() => { void useWardrobeStore.getState().loadItems(); }, []);

  // 1. Phân tích danh sách món đồ từ route params chuyển sang
  const parsedOutfitItems = useMemo<OutfitItemModel[]>(() => {
    if (params.itemsJson) {
      try {
        const parsed = JSON.parse(params.itemsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it: any) => {
            const raw = dbItems.find((d) => String(d.id) === String(it.id));
            const imageUri = raw?.image_path || it.image?.uri || (typeof it.image === 'string' ? it.image : '');
            return {
              id: String(it.id),
              name: it.name || raw?.name || 'Trang phục',
              category: (it.category || raw?.category || 'Áo') as any,
              colorName: it.colorName || raw?.color_name || '',
              colorHex: it.colorHex || raw?.color_hex || '#FFFFFF',
              image: imageUri ? { uri: imageUri } : it.image,
              imagePath: imageUri,
            };
          });
        }
      } catch (e) {
        console.warn('[outfit-detail] Lỗi phân tích itemsJson:', e);
      }
    }

    if (params.itemIds) {
      const idList = params.itemIds.split(',').map((s) => s.trim());
      const found = dbItems.filter((d) => idList.includes(String(d.id)));
      if (found.length > 0) {
        return found.map((d) => ({
          id: String(d.id),
          name: d.name,
          category: d.category,
          colorName: d.color_name,
          colorHex: d.color_hex,
          image: { uri: d.image_path },
          imagePath: d.image_path,
        }));
      }
    }

    // Fallback nếu mở trực tiếp không truyền params
    const dress = dbItems.find(
      (i) => i.category === 'Đầm' || (i.category === 'Váy' && i.name?.toLowerCase().includes('đầm')),
    );
    if (dress) {
      return [
        {
          id: String(dress.id),
          name: dress.name,
          category: dress.category,
          colorName: dress.color_name,
          colorHex: dress.color_hex,
          image: { uri: dress.image_path },
          imagePath: dress.image_path,
        },
      ];
    }

    const top = dbItems.find((i) => i.category === 'Áo');
    const bottom = dbItems.find((i) => i.category === 'Quần' || i.category === 'Váy');
    const shoe = dbItems.find((i) => i.category === 'Giày');
    const list: OutfitItemModel[] = [];
    if (top) list.push({ id: String(top.id), name: top.name, category: top.category, colorName: top.color_name, colorHex: top.color_hex, image: { uri: top.image_path }, imagePath: top.image_path });
    if (bottom) list.push({ id: String(bottom.id), name: bottom.name, category: bottom.category, colorName: bottom.color_name, colorHex: bottom.color_hex, image: { uri: bottom.image_path }, imagePath: bottom.image_path });
    if (shoe) list.push({ id: String(shoe.id), name: shoe.name, category: shoe.category, colorName: shoe.color_name, colorHex: shoe.color_hex, image: { uri: shoe.image_path }, imagePath: shoe.image_path });
    return list;
  }, [params.itemsJson, params.itemIds, dbItems]);

  const [currentItems, setCurrentItems] = useState<OutfitItemModel[]>(parsedOutfitItems);

  useEffect(() => {
    setCurrentItems(parsedOutfitItems);
    setLockedItemIds([]);
    setSeenOutfits(new Set([outfitSignature(parsedOutfitItems)]));
    setSwapMessage('');
  }, [parsedOutfitItems]);

  // 2. Xác định kiểu phối đồ (One-piece đầm liền hay Two-piece áo + quần)
  const isOnePiece = useMemo(() => {
    if (params.type === 'one_piece') return true;
    return currentItems.some(
      (i) => i.category === 'Đầm' || i.name.toLowerCase().includes('đầm'),
    );
  }, [params.type, currentItems]);

  // 3. Thông tin ngữ cảnh bối cảnh (Contexts: Đi học, Đi làm, Đi chơi, Hẹn hò)
  const currentContext = params.context || 'Đi học';
  const outfitTitle = params.title || `Bộ phối ${currentContext.toLowerCase()}`;
  const outfitSubtitle =
    params.subtitle ||
    `${currentContext} · ${isOnePiece ? 'Đầm liền tôn dáng thanh lịch' : 'Phối đồ hài hòa sắc thái'}`;

  const contextMeta = useMemo(() => {
    switch (currentContext) {
      case 'Đi làm':
        return { text: 'Tự tin công sở', icon: 'briefcase-outline' as const };
      case 'Đi chơi':
        return { text: 'Năng động dạo phố', icon: 'sunny-outline' as const };
      case 'Hẹn hò':
        return { text: 'Cuốn hút & lãng mạn', icon: 'heart-outline' as const };
      case 'Sự kiện quan trọng':
        return { text: 'Chỉn chu cho dịp quan trọng', icon: 'ribbon-outline' as const };
      case 'Đi học':
      default:
        return { text: 'Sẵn sàng đến lớp', icon: 'school-outline' as const };
    }
  }, [currentContext]);

  // 4. Khóa / Mở khóa món đồ
  const harmonyBadge = outfitHarmony(currentItems, dbItems)?.badgeText;
  const allLocked = currentItems.length === 0 || currentItems.every((item) => lockedItemIds.includes(item.id));

  const toggleLock = (id: string) => {
    setSwapMessage('');
    setSeenOutfits(new Set([outfitSignature(currentItems)]));
    setLockedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const swapItems = (itemId?: string) => {
    if (itemId && lockedItemIds.includes(itemId)) return;
    const locks = itemId ? currentItems.filter((item) => item.id !== itemId).map((item) => item.id) : lockedItemIds;
    const next = swapOutfit(currentItems, dbItems, locks, currentContext, seenOutfits);
    if (!next) {
      setSwapMessage('Không có món thay thế trong tủ. Hãy thêm trang phục hoặc mở khóa một món khác.');
      return;
    }
    const signature = outfitSignature(next);
    setSeenOutfits(seenOutfits.has(signature)
      ? new Set([outfitSignature(currentItems), signature])
      : new Set([...seenOutfits, signature]));
    const changed = next.filter((item, index) => String(item.id) !== currentItems[index].id).length;
    setCurrentItems(next.map((item) => ({ ...item, id: String(item.id) })));
    setSwapMessage(`Đã đổi ${changed} món. Các món đã khóa được giữ nguyên.`);
  };

  // 7. Xác nhận mặc -> lưu lịch sử
  const handleConfirmWear = async () => {
    const ids = currentItems.map((i) => Number(i.id)).filter((n) => Number.isFinite(n));
    try {
      await HistoryService.confirmWear(ids, currentContext);
      await useWardrobeStore.getState().loadItems();
      router.replace({ pathname: '/(tabs)/history', params: { saved: '1' } });
    } catch (e) {
      console.warn('[outfit-detail] Lưu lịch sử thất bại:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Bộ đồ của bạn</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {outfitSubtitle}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Bar Banner */}
        <View style={styles.readyBar}>
          <View style={styles.readyLeft}>
            <Ionicons name={contextMeta.icon} size={18} color={colors.primary} />
            <Text style={styles.readyText}>{contextMeta.text}</Text>
          </View>
          <Pressable onPress={() => setIsFavorite(!isFavorite)} hitSlop={8}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? colors.danger : colors.textLight}
            />
          </Pressable>
        </View>

        {/* Outfit Collage Preview */}
        <View style={styles.collageContainer}>
          {isOnePiece ? (
            currentItems[0] ? (
              <Image
                source={currentItems[0].image}
                style={styles.collageFull}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="sparkles-outline" size={32} color={colors.primary} />
              </View>
            )
          ) : (
            <>
              <View style={styles.collageLeft}>
                {currentItems[0] && (
                  <Image
                    source={currentItems[0].image}
                    style={styles.collageTopLeft}
                    resizeMode="contain"
                  />
                )}
                {currentItems[2] && (
                  <Image
                    source={currentItems[2].image}
                    style={styles.collageBottomLeft}
                    resizeMode="contain"
                  />
                )}
              </View>
              {currentItems[1] && (
                <Image
                  source={currentItems[1].image}
                  style={styles.collageRight}
                  resizeMode="contain"
                />
              )}
            </>
          )}
        </View>

        {/* Palette Note */}
        <View style={styles.paletteBox}>
          <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
          <Text style={styles.paletteText}>
            {harmonyBadge
              ? `Đánh giá phối màu: ${harmonyBadge} theo quy tắc Color Harmony HSL.`
              : 'Phối màu thời trang thông minh theo quy tắc toán học Color Harmony HSL.'}
          </Text>
        </View>

        {/* Section: Giữ món thích, đổi món khác */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Giữ món thích, đổi món khác</Text>
            <Text style={styles.lockedCountText}>{lockedItemIds.length} món đã khóa</Text>
          </View>

          {/* Items List */}
          <View style={styles.itemList}>
            {currentItems.map((item) => {
              const isLocked = lockedItemIds.includes(item.id);

              return (
                <View
                  key={item.id}
                  style={[styles.itemRow, isLocked && styles.itemRowLocked]}
                >
                  <Image source={item.image} style={styles.itemThumb} resizeMode="contain" />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {isLocked
                        ? 'Đã khóa · không thay đổi'
                        : `${item.category} · ${item.colorName || 'Hài hòa'}`}
                    </Text>
                  </View>

                  <View style={styles.actionGroup}>
                    <Pressable
                      style={[styles.lockBtn, isLocked && styles.lockBtnActive]}
                      onPress={() => toggleLock(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${isLocked ? 'Mở khóa' : 'Khóa'} ${item.name}`}
                      accessibilityState={{ selected: isLocked }}
                    >
                      <Ionicons
                        name={isLocked ? 'lock-closed' : 'lock-open-outline'}
                        size={14}
                        color={isLocked ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.lockBtnText, isLocked && styles.lockBtnTextActive]}>
                        {isLocked ? 'Đã khóa' : 'Khóa'}
                      </Text>
                    </Pressable>

                    {!isLocked && (
                      <Pressable
                        style={styles.swapBtn}
                        onPress={() => swapItems(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Đổi ${item.name}`}
                      >
                        <Ionicons name="refresh" size={13} color={colors.primary} />
                        <Text style={styles.swapBtnText}>Đổi</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Swap all unlocked button */}
          <Pressable style={[styles.swapAllBtn, allLocked && { opacity: 0.45 }]} onPress={() => swapItems()} disabled={allLocked} accessibilityRole="button" accessibilityState={{ disabled: allLocked }}>
            <Ionicons name="shuffle" size={16} color={colors.primary} />
            <Text style={styles.swapAllText}>Đổi tất cả món chưa khóa</Text>
          </Pressable>
          {allLocked && currentItems.length > 0 && <Text style={styles.itemMeta}>Mở khóa ít nhất một món để đổi bộ đồ.</Text>}
          {!!swapMessage && <Text accessibilityLiveRegion="polite" style={styles.paletteText}>{swapMessage}</Text>}
        </View>
      </ScrollView>

      {/* Confirm Wear Footer */}
      <View style={styles.bottomBar}>
        <Text style={styles.confirmDisclaimer}>
          Xác nhận để lưu bộ đồ vào lịch sử hôm nay.
        </Text>
        <Pressable style={styles.confirmBtn} onPress={handleConfirmWear}>
          <Text style={styles.confirmBtnText}>Xác nhận mặc</Text>
          <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  backBtn: { padding: spacing.xs },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textMuted },

  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  // Ready Bar
  readyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FB',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
  },
  readyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  readyText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Collage
  collageContainer: {
    flexDirection: 'row',
    height: 190,
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  collageFull: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
  collageLeft: { flex: 1, gap: spacing.xs },
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
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Palette Box
  paletteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  paletteText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
    fontWeight: '500',
  },

  // Section
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  lockedCountText: { fontSize: 12, color: colors.textLight },

  // Items List
  itemList: { gap: spacing.xs + 2 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  itemRowLocked: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FB',
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: '#EAE6E1',
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textMuted },

  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: colors.primary,
  },
  lockBtnText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  lockBtnTextActive: { color: colors.primary, fontWeight: '700' },

  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#F0F9FB',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  swapBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  swapAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: '#F0F9FB',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    marginTop: spacing.xs,
  },
  swapAllText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  // Bottom Action Bar
  bottomBar: {
    padding: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  confirmBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
  confirmDisclaimer: { fontSize: 11, color: colors.textLight, textAlign: 'center' },
});
