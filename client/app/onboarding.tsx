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
import { CLOSY_LOGO, ONBOARDING_HERO } from '../src/constants/seedData';

const STYLES = [
  { id: 'minimal', label: 'Tối giản', icon: 'shapes-outline' },
  { id: 'vintage', label: 'Hoài cổ', icon: 'flower-outline' },
  { id: 'streetwear', label: 'Đường phố', icon: 'flash-outline' },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['minimal']);

  const toggleStyle = (id: string) => {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleStart = () => {
    router.replace('/(tabs)/today');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Logo & Chào bạn mới */}
        <View style={styles.header}>
          <Image source={CLOSY_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.welcomeText}>Chào bạn mới!</Text>
        </View>

        {/* Hero banner */}
        <View style={styles.heroWrapper}>
          <Image source={ONBOARDING_HERO} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.heroBadgeText}>Mặc đẹp từ những gì bạn có</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Ít phân vân hơn.{'\n'}Đúng chất bạn hơn.</Text>
          <Text style={styles.subtitle}>
            Closy giúp bạn phối lại đồ sẵn có, để mỗi sáng bắt đầu dễ dàng hơn.
          </Text>
        </View>

        {/* Styles Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bạn thích phong cách nào?</Text>
            <Text style={styles.sectionSub}>Chọn nhiều</Text>
          </View>

          <View style={styles.styleRow}>
            {STYLES.map((st) => {
              const active = selectedStyles.includes(st.id);
              return (
                <Pressable
                  key={st.id}
                  style={[styles.styleCard, active && styles.styleCardActive]}
                  onPress={() => toggleStyle(st.id)}
                >
                  <Ionicons
                    name={st.icon as any}
                    size={24}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.styleLabel, active && styles.styleLabelActive]}>
                    {st.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Security badge */}
        <View style={styles.securityBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={styles.securityText}>
            Ảnh được lưu trên thiết bị của bạn. Closy không công khai hay chia sẻ ảnh.
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.ctaGroup}>
          <Pressable style={styles.ctaBtn} onPress={handleStart}>
            <Text style={styles.ctaText}>Tạo tủ đồ với 5–7 món</Text>
            <Ionicons name="add" size={18} color={colors.onPrimary} />
          </Pressable>
          <Text style={styles.ctaHint}>Không cần thêm cả tủ đồ. Bắt đầu thật nhẹ nhàng.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  logo: { width: 52, height: 52 },
  welcomeText: { fontSize: 13, color: colors.textMuted },

  // Hero
  heroWrapper: {
    height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#EAE6E1',
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: colors.text },

  // Title
  titleGroup: { gap: spacing.xs, marginTop: spacing.xs },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5, lineHeight: 32 },
  subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },

  // Styles
  section: { gap: spacing.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  sectionSub: { fontSize: 11, color: colors.textLight },

  styleRow: { flexDirection: 'row', gap: spacing.sm },
  styleCard: {
    flex: 1,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  styleCardActive: {
    backgroundColor: '#F0F9FB',
    borderColor: colors.primary,
  },
  styleLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  styleLabelActive: { color: colors.primary, fontWeight: '700' },

  // Security
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  securityText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },

  // CTA
  ctaGroup: { gap: spacing.xs, marginTop: spacing.sm },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  ctaText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
  ctaHint: { fontSize: 11, color: colors.textLight, textAlign: 'center' },
});

