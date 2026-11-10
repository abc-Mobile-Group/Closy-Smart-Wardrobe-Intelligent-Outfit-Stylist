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
import { colors, radius, spacing } from '../../src/constants/theme';
import { SEED_ITEMS } from '../../src/constants/seedData';
import { useAuthStore } from '../../src/store/authStore';

const CONTEXTS = ['Đi học', 'Đi làm', 'Đi chơi', 'Hẹn hò'] as const;

export default function SuggestScreen() {
  const router = useRouter();
  const { email, name, openProfile } = useAuthStore();
  const [selectedContext, setSelectedContext] = useState<string>('Đi học');
  const [liked, setLiked] = useState<boolean | null>(null);

  const displayName = name || (email ? email.split('@')[0] : 'An');
  const initial = displayName.charAt(0).toUpperCase();

  const teeItem = SEED_ITEMS.find((i) => i.id === '1');
  const sneakerItem = SEED_ITEMS.find((i) => i.id === '7');
  const jeansItem = SEED_ITEMS.find((i) => i.id === '4');
  const shirtItem = SEED_ITEMS.find((i) => i.id === '2');
  const kakiItem = SEED_ITEMS.find((i) => i.id === '5');
  const jacketItem = SEED_ITEMS.find((i) => i.id === '3');

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
            <Text style={styles.subtitle}>3 lựa chọn từ những món bạn đang có</Text>
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

        {/* Main Recommendation Section */}
        <View style={styles.recommendationBox}>
          {/* Box Header with Pagination Dots */}
          <View style={styles.recHeader}>
            <Text style={styles.recTag}>GỢI Ý CHO BẠN</Text>
            <View style={styles.paginationDots}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>
          </View>

          {/* Collage */}
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

          {/* Outfit Info */}
          <View style={styles.outfitInfo}>
            <Text style={styles.outfitTitle}>Nhẹ nhàng đến lớp</Text>
            <Text style={styles.outfitDesc}>
              Phối trung tính: kem làm dịu xanh denim. Thoải mái cho cả ngày trên giảng đường.
            </Text>
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
              onPress={() => router.push('/outfit-detail')}
            >
              <Text style={styles.adjustBtnText}>Chọn & điều chỉnh</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Alternative Section */}
        <View style={styles.altSection}>
          <Text style={styles.altSectionTitle}>Hay thử một cảm giác khác?</Text>

          {/* Alt Card 1 */}
          <Pressable
            style={styles.altCard}
            onPress={() => router.push('/outfit-detail')}
          >
            <View style={styles.altThumbs}>
              {shirtItem && (
                <Image source={shirtItem.image} style={styles.altThumbImg} resizeMode="cover" />
              )}
              <View style={styles.altThumbsSub}>
                {kakiItem && (
                  <Image source={kakiItem.image} style={styles.altThumbSmall} resizeMode="cover" />
                )}
                {sneakerItem && (
                  <Image source={sneakerItem.image} style={styles.altThumbSmall} resizeMode="cover" />
                )}
              </View>
            </View>

            <View style={styles.altInfo}>
              <Text style={styles.altTitle}>Gọn gàng, sáng sủa</Text>
              <Text style={styles.altSub}>Sơ mi + kaki + sneaker</Text>
              <Text style={styles.altTag}>Trung tính · trắng, be hài hòa</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>

          {/* Alt Card 2 */}
          <Pressable
            style={styles.altCard}
            onPress={() => router.push('/outfit-detail')}
          >
            <View style={styles.altThumbs}>
              {jacketItem && (
                <Image source={jacketItem.image} style={styles.altThumbImg} resizeMode="cover" />
              )}
              <View style={styles.altThumbsSub}>
                {jeansItem && (
                  <Image source={jeansItem.image} style={styles.altThumbSmall} resizeMode="cover" />
                )}
                {sneakerItem && (
                  <Image source={sneakerItem.image} style={styles.altThumbSmall} resizeMode="cover" />
                )}
              </View>
            </View>

            <View style={styles.altInfo}>
              <Text style={styles.altTitle}>Thêm một lớp cá tính</Text>
              <Text style={styles.altSub}>Áo khoác + jeans + sneaker</Text>
              <Text style={styles.altTag}>Tương tự · ô liu và xanh denim</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
        </View>
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
  recTag: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  paginationDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotActive: { backgroundColor: colors.primary, width: 14 },

  // Collage
  collageContainer: {
    flexDirection: 'row',
    height: 190,
    gap: spacing.sm,
    marginTop: spacing.xs,
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

  // Info
  outfitInfo: { gap: 4 },
  outfitTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  outfitDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },

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
