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
import { SEED_ITEMS } from '../src/constants/seedData';

const INPUT_METHODS = [
  { id: 'camera', label: 'Chụp ảnh', icon: 'camera-outline' },
  { id: 'gallery', label: 'Thư viện ảnh', icon: 'images-outline' },
  { id: 'presets', label: 'Mẫu cơ bản', icon: 'layers-outline' },
] as const;

const COLOR_PALETTE = [
  { id: 'white', name: 'Trắng', hex: '#FFFFFF', border: '#E2E8F0' },
  { id: 'cream', name: 'Kem', hex: '#F5F2EB' },
  { id: 'navy', name: 'Xanh đậm', hex: '#243A63' },
  { id: 'olive', name: 'Ô liu', hex: '#636F4E' },
  { id: 'black', name: 'Đen', hex: '#1E293B' },
  { id: 'dusty-pink', name: 'Hồng phấn', hex: '#D29B9B' },
];

const OCCASIONS = ['Đi học', 'Đi làm', 'Đi chơi', 'Hẹn hò'] as const;

export default function AddItemScreen() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<string>('gallery');
  const [selectedColor, setSelectedColor] = useState<string>('white');
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(['Đi học', 'Đi làm']);
  const [itemType, setItemType] = useState('Áo · Sơ mi');

  const previewShirt = SEED_ITEMS.find((i) => i.id === '2');

  const toggleOccasion = (occ: string) => {
    setSelectedOccasions((prev) =>
      prev.includes(occ) ? prev.filter((o) => o !== occ) : [...prev, occ],
    );
  };

  const handleSave = () => {
    // Lưu và chuyển về tủ đồ
    router.replace('/(tabs)/wardrobe');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Thêm món đồ</Text>
          <Text style={styles.headerSubtitle}>Một món mới, thêm cách phối</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Method selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bạn muốn thêm bằng cách nào?</Text>
          <View style={styles.methodRow}>
            {INPUT_METHODS.map((m) => {
              const active = selectedMethod === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.methodBtn, active && styles.methodBtnActive]}
                  onPress={() => setSelectedMethod(m.id)}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={24}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.methodText, active && styles.methodTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.methodHint}>Dùng được cả ảnh chụp màn hình sản phẩm.</Text>
        </View>

        {/* Image Preview Box */}
        <View style={styles.previewBox}>
          {previewShirt && (
            <Image source={previewShirt.image} style={styles.previewImage} resizeMode="cover" />
          )}
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle}>Sơ mi trắng</Text>
            <Text style={styles.previewSubtitle}>Ảnh từ thư viện</Text>
            <Text style={styles.previewStatus}>Đã chọn 1 ảnh</Text>
            <Pressable style={styles.changePhotoBtn}>
              <Ionicons name="image-outline" size={14} color={colors.primary} />
              <Text style={styles.changePhotoText}>Đổi ảnh</Text>
            </Pressable>
          </View>
        </View>

        {/* Loại đồ */}
        <View style={styles.section}>
          <Text style={styles.label}>Loại đồ</Text>
          <Pressable
            style={styles.dropdownBtn}
            onPress={() => {
              // Tùy chọn chuyển đổi nhanh giữa các loại đồ
              const types = ['Áo · Sơ mi', 'Áo · Thun', 'Quần · Jeans', 'Quần · Kaki', 'Váy', 'Giày · Sneaker'];
              const nextIndex = (types.indexOf(itemType) + 1) % types.length;
              setItemType(types[nextIndex]);
            }}
          >
            <Text style={styles.dropdownText}>{itemType}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Màu sắc */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Màu sắc</Text>
            <Text style={styles.selectedColorLabel}>
              {COLOR_PALETTE.find((c) => c.id === selectedColor)?.name}
            </Text>
          </View>
          <View style={styles.colorPaletteRow}>
            {COLOR_PALETTE.map((c) => {
              const active = selectedColor === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c.hex },
                    c.border ? { borderWidth: 1, borderColor: c.border } : null,
                    active && styles.colorDotActive,
                  ]}
                  onPress={() => setSelectedColor(c.id)}
                >
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={c.id === 'white' || c.id === 'cream' ? colors.primary : '#FFFFFF'}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Phù hợp dịp nào? */}
        <View style={styles.section}>
          <Text style={styles.label}>Phù hợp dịp nào?</Text>
          <View style={styles.occasionsRow}>
            {OCCASIONS.map((occ) => {
              const active = selectedOccasions.includes(occ);
              return (
                <Pressable
                  key={occ}
                  style={[styles.occasionChip, active && styles.occasionChipActive]}
                  onPress={() => toggleOccasion(occ)}
                >
                  <Text style={[styles.occasionText, active && styles.occasionTextActive]}>
                    {occ}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Alert box */}
        <View style={styles.infoAlert}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.infoAlertText}>
            Dùng mẫu cơ bản? Chỉ thêm món bạn thật sự sở hữu và xác nhận lại màu sắc.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Save Action */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Lưu vào tủ đồ</Text>
          <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
        </Pressable>
        <Text style={styles.bottomDisclaimer}>
          Ảnh và thông tin chỉ được lưu trên thiết bị.
        </Text>
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

  section: { gap: spacing.xs },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  methodRow: { flexDirection: 'row', gap: spacing.sm },
  methodBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  methodBtnActive: {
    backgroundColor: '#F0F9FB',
    borderColor: colors.primary,
  },
  methodText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  methodTextActive: { color: colors.primary, fontWeight: '700' },
  methodHint: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  // Preview Box
  previewBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
  previewInfo: { flex: 1, gap: 2 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  previewSubtitle: { fontSize: 12, color: colors.textMuted },
  previewStatus: { fontSize: 11, color: colors.textLight },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  changePhotoText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  // Form Fields
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  selectedColorLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.bg,
  },
  dropdownText: { fontSize: 14, color: colors.text, fontWeight: '500' },

  // Color Palette
  colorPaletteRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: colors.primary,
  },

  // Occasions
  occasionsRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  occasionChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  occasionChipActive: {
    backgroundColor: colors.primary,
  },
  occasionText: { fontSize: 12, fontWeight: '600', color: colors.chipInactiveText },
  occasionTextActive: { color: colors.chipActiveText },

  // Alert
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0F9FB',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    padding: spacing.sm + 2,
  },
  infoAlertText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },

  // Bottom Action Bar
  bottomBar: {
    padding: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.xs,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
  bottomDisclaimer: { fontSize: 11, color: colors.textLight, textAlign: 'center' },
});

