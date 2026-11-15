import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../src/constants/theme';
import { useWardrobeStore } from '../src/store/wardrobeStore';

export default function OutfitDetailScreen() {
  const router = useRouter();
  const { items } = useWardrobeStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [lockedItemIds, setLockedItemIds] = useState<string[]>([]);

  // Lấy trang phục từ tủ đồ thật của người dùng
  const dressItem = items.find((i) => i.category === 'Đầm' || (i.category === 'Váy' && i.name?.toLowerCase().includes('đầm')));
  const topItem = items.find((i) => i.category === 'Áo');
  const bottomItem = items.find((i) => (i.category === 'Quần' || i.category === 'Váy') && i !== dressItem);
  const shoeItem = items.find((i) => i.category === 'Giày');

  const isOnePiece = !!dressItem && !topItem;

  const currentOutfitItems = isOnePiece
    ? [
        {
          item: dressItem ? { id: String(dressItem.id), name: dressItem.name, image: { uri: dressItem.image_path } } : null,
          role: dressItem?.name || 'Đầm liền',
          meta: 'Đầm liền · Tôn dáng thanh lịch',
        },
        shoeItem
          ? {
              item: { id: String(shoeItem.id), name: shoeItem.name, image: { uri: shoeItem.image_path } },
              role: shoeItem.name,
              meta: `Giày · ${shoeItem.color_name || 'Hài hòa'}`,
            }
          : null,
      ].filter(Boolean)
    : [
        topItem
          ? {
              item: { id: String(topItem.id), name: topItem.name, image: { uri: topItem.image_path } },
              role: topItem.name,
              meta: `Áo · ${topItem.color_name || 'Thoải mái'}`,
            }
          : null,
        bottomItem
          ? {
              item: { id: String(bottomItem.id), name: bottomItem.name, image: { uri: bottomItem.image_path } },
              role: bottomItem.name,
              meta: `${bottomItem.category} · ${bottomItem.color_name || 'Hài hòa'}`,
            }
          : null,
        shoeItem
          ? {
              item: { id: String(shoeItem.id), name: shoeItem.name, image: { uri: shoeItem.image_path } },
              role: shoeItem.name,
              meta: `Giày · ${shoeItem.color_name || 'Năng động'}`,
            }
          : null,
      ].filter(Boolean);

  const toggleLock = (id: string) => {
    setLockedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleConfirmWear = () => {
    // Chuyển sang Tab Lịch sử và đánh dấu ngày mặc
    router.replace('/(tabs)/history');
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
          <Text style={styles.headerSubtitle}>Đi học · Nhẹ nhàng đến lớp</Text>
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
            <Ionicons name="school-outline" size={18} color={colors.primary} />
            <Text style={styles.readyText}>Sẵn sàng đến lớp</Text>
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
          {isOnePiece && dressItem ? (
            <Image source={{ uri: dressItem.image_path }} style={styles.collageFull} resizeMode="contain" />
          ) : (
            <>
              <View style={styles.collageLeft}>
                {topItem && (
                  <Image source={{ uri: topItem.image_path }} style={styles.collageTopLeft} resizeMode="contain" />
                )}
                {shoeItem && (
                  <Image source={{ uri: shoeItem.image_path }} style={styles.collageBottomLeft} resizeMode="contain" />
                )}
              </View>
              {bottomItem && (
                <Image source={{ uri: bottomItem.image_path }} style={styles.collageRight} resizeMode="contain" />
              )}
            </>
          )}
        </View>

        {/* Palette Note */}
        <View style={styles.paletteBox}>
          <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
          <Text style={styles.paletteText}>
            Phối màu thời trang thông minh theo quy tắc Color Harmony HSL.
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
            {currentOutfitItems.map(({ item, role, meta }) => {
              if (!item) return null;
              const isLocked = lockedItemIds.includes(item.id);

              return (
                <View
                  key={item.id}
                  style={[styles.itemRow, isLocked && styles.itemRowLocked]}
                >
                  <Image source={item.image} style={styles.itemThumb} resizeMode="cover" />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{role}</Text>
                    <Text style={styles.itemMeta}>{isLocked ? 'Đã khóa · không thay đổi' : meta}</Text>
                  </View>

                  <Pressable
                    style={[styles.lockBtn, isLocked && styles.lockBtnActive]}
                    onPress={() => toggleLock(item.id)}
                  >
                    <Ionicons
                      name={isLocked ? 'lock-closed' : 'refresh'}
                      size={14}
                      color={isLocked ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.lockBtnText, isLocked && styles.lockBtnTextActive]}>
                      {isLocked ? 'Đã khóa' : 'Đổi'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Swap all unlocked button */}
          <Pressable style={styles.swapAllBtn}>
            <Ionicons name="shuffle" size={16} color={colors.primary} />
            <Text style={styles.swapAllText}>Đổi tất cả món chưa khóa</Text>
          </Pressable>
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
  },
  backBtn: { padding: spacing.xs },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textMuted },

  container: { flex: 1 },
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
  collageLeft: { flex: 1, gap: spacing.sm },
  collageFull: { width: '100%', height: '100%', borderRadius: radius.md, backgroundColor: '#EAE6E1' },
  collageTopLeft: { flex: 1, width: '100%', borderRadius: radius.md, backgroundColor: '#EAE6E1' },
  collageBottomLeft: { flex: 1, width: '100%', borderRadius: radius.md, backgroundColor: '#EAE6E1' },
  collageRight: { flex: 1, height: '100%', borderRadius: radius.md, backgroundColor: '#EAE6E1' },

  // Palette Box
  paletteBox: {
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
  paletteText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },

  // Lock / Swap Section
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  lockedCountText: { fontSize: 11, color: colors.textLight },

  itemList: { gap: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRowLocked: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FB',
  },
  itemThumb: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: '#EAE6E1' },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textMuted },

  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  lockBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  lockBtnText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  lockBtnTextActive: { color: colors.primary, fontWeight: '700' },

  swapAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    paddingVertical: 12,
    backgroundColor: '#F0F9FB',
  },
  swapAllText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Bottom Confirmation
  bottomBar: {
    padding: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.xs,
  },
  confirmDisclaimer: { fontSize: 11, color: colors.textLight, textAlign: 'center' },
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
});

