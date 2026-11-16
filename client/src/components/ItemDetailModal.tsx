import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { Category, Formality, WardrobeItem } from '../types/item';

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: 'Áo', label: 'Áo', icon: 'shirt-outline' },
  { id: 'Quần', label: 'Quần', icon: 'file-tray-outline' },
  { id: 'Váy', label: 'Váy', icon: 'woman-outline' },
  { id: 'Giày', label: 'Giày', icon: 'footsteps-outline' },
];

const FORMALITY_OPTIONS: { value: Formality; label: string; desc: string }[] = [
  { value: 1, label: '1 · Thoải mái', desc: 'Mặc ở nhà, dạo phố' },
  { value: 3, label: '3 · Lịch sự vừa', desc: 'Đi học, công sở' },
  { value: 5, label: '5 · Trang trọng', desc: 'Dự tiệc, sự kiện' },
];

const CONTEXT_OPTIONS = ['Đi học', 'Đi làm', 'Đi chơi', 'Hẹn hò'] as const;

const COLOR_PALETTE = [
  { id: 'white', name: 'Trắng', hex: '#FFFFFF', border: '#E2E8F0' },
  { id: 'cream', name: 'Kem', hex: '#F5F2EB', border: '#E2E8F0' },
  { id: 'dusty-pink', name: 'Hồng phấn', hex: '#D29B9B' },
  { id: 'navy', name: 'Xanh đậm', hex: '#243A63' },
  { id: 'olive', name: 'Ô liu', hex: '#636F4E' },
  { id: 'black', name: 'Đen', hex: '#1E293B' },
  { id: 'gray', name: 'Xám', hex: '#808080' },
  { id: 'brown', name: 'Nâu', hex: '#795548' },
  { id: 'blue', name: 'Xanh dương', hex: '#2196F3' },
  { id: 'red', name: 'Đỏ', hex: '#E53935' },
  { id: 'yellow', name: 'Vàng', hex: '#FDD835' },
];

interface ItemDetailModalProps {
  visible: boolean;
  item: WardrobeItem | null;
  onClose: () => void;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (
    id: number,
    data: {
      name?: string;
      category?: Category;
      color_name?: string;
      color_hex?: string;
      formality?: Formality;
      contexts?: string[];
    },
  ) => Promise<void>;
}

export default function ItemDetailModal({
  visible,
  item,
  onClose,
  onDelete,
  onUpdate,
}: ItemDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Áo');
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#FFFFFF');
  const [formality, setFormality] = useState<Formality>(3);
  const [contexts, setContexts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || `${item.category} ${item.color_name || ''}`.trim());
      setCategory((item.category as Category) || 'Áo');
      setColorName(item.color_name || 'Tự chọn');
      setColorHex(item.color_hex || '#FFFFFF');
      setFormality((item.formality as Formality) || 3);
      setContexts(item.contexts ? item.contexts.split(',').filter(Boolean) : []);
      setIsEditing(false);
    }
  }, [item]);

  if (!item) return null;

  const toggleContext = (ctx: string) => {
    setContexts((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Tên món đồ không được để trống.');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate(item.id, {
        name: name.trim(),
        category,
        color_name: colorName,
        color_hex: colorHex,
        formality,
        contexts,
      });
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể lưu thay đổi: ' + (e?.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa món đồ',
      `Bạn có chắc chắn muốn xóa "${item.name || item.category}" khỏi tủ đồ?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await onDelete(item.id);
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Chỉnh sửa món đồ' : 'Chi tiết món đồ'}
            </Text>
            <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Ảnh món đồ */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.image_path }} style={styles.image} resizeMode="contain" />
            </View>

            {isEditing ? (
              /* --- CHẾ ĐỘ CHỈNH SỬA --- */
              <View style={styles.editSection}>
                {/* Tên món đồ */}
                <Text style={styles.label}>Tên món đồ</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ví dụ: Đầm trắng công chúa, Sơ mi lụa..."
                  placeholderTextColor={colors.textLight}
                />

                {/* Danh mục */}
                <Text style={styles.label}>Danh mục</Text>
                <View style={styles.chipRow}>
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => {
                          const oldCat = category;
                          setCategory(cat.id);
                          if (name.startsWith(oldCat)) {
                            setName((prev) => prev.replace(new RegExp(`^${oldCat}`), cat.id));
                          } else {
                            let replaced = false;
                            for (const otherCat of CATEGORIES) {
                              if (name.startsWith(otherCat.id)) {
                                setName((prev) => prev.replace(new RegExp(`^${otherCat.id}`), cat.id));
                                replaced = true;
                                break;
                              }
                            }
                            if (!replaced && (!name || name.trim() === '')) {
                              setName(`${cat.id} ${colorName.toLowerCase()}`);
                            }
                          }
                        }}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={16}
                          color={active ? colors.onPrimary : colors.textMuted}
                        />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Màu sắc */}
                <Text style={styles.label}>Màu sắc ({colorName})</Text>
                <View style={styles.colorPaletteRow}>
                  {COLOR_PALETTE.map((c) => {
                    const active =
                      colorHex.toLowerCase() === c.hex.toLowerCase() ||
                      colorName.toLowerCase() === c.name.toLowerCase();
                    return (
                      <Pressable
                        key={c.id}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c.hex },
                          c.border ? { borderWidth: 1, borderColor: c.border } : null,
                          active && styles.colorCircleActive,
                        ]}
                        onPress={() => {
                          const oldColor = colorName;
                          setColorHex(c.hex);
                          setColorName(c.name);
                          if (oldColor && name.toLowerCase().includes(oldColor.toLowerCase())) {
                            setName((prev) =>
                              prev.replace(new RegExp(oldColor, 'i'), c.name.toLowerCase()),
                            );
                          } else if (/cam/i.test(name)) {
                            setName((prev) => prev.replace(/cam/i, c.name.toLowerCase()));
                          } else {
                            for (const pal of COLOR_PALETTE) {
                              if (name.toLowerCase().includes(pal.name.toLowerCase())) {
                                setName((prev) =>
                                  prev.replace(new RegExp(pal.name, 'i'), c.name.toLowerCase()),
                                );
                                break;
                              }
                            }
                          }
                        }}
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

                {/* Độ lịch sự */}
                <Text style={styles.label}>Độ lịch sự</Text>
                <View style={styles.formalityCol}>
                  {FORMALITY_OPTIONS.map((opt) => {
                    const active = formality === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.formalityOption, active && styles.formalityOptionActive]}
                        onPress={() => setFormality(opt.value)}
                      >
                        <View style={styles.radioOuter}>
                          {active && <View style={styles.radioInner} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.formalityLabel, active && styles.formalityLabelActive]}>
                            {opt.label}
                          </Text>
                          <Text style={styles.formalityDesc}>{opt.desc}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Dịp mặc */}
                <Text style={styles.label}>Phù hợp dịp nào</Text>
                <View style={styles.chipRow}>
                  {CONTEXT_OPTIONS.map((ctx) => {
                    const active = contexts.includes(ctx);
                    return (
                      <Pressable
                        key={ctx}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => toggleContext(ctx)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {ctx}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Nút lưu & hủy */}
                <View style={styles.editBtnRow}>
                  <Pressable
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.saveBtn]}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    <Text style={styles.saveBtnText}>
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* --- CHẾ ĐỘ XEM CHI TIẾT --- */
              <View style={styles.viewSection}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemName}>{name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{category}</Text>
                  </View>
                </View>

                {/* Màu sắc */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Màu sắc:</Text>
                  <View style={styles.colorIndicator}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: colorHex },
                        (colorHex.toUpperCase() === '#FFFFFF' || colorHex.toUpperCase() === '#F5F2EB') && {
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                        },
                      ]}
                    />
                    <Text style={styles.detailValue}>{colorName}</Text>
                  </View>
                </View>

                {/* Độ lịch sự */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Độ lịch sự:</Text>
                  <Text style={styles.detailValue}>
                    {formality === 1
                      ? '1 · Thoải mái (Casual)'
                      : formality === 5
                      ? '5 · Trang trọng (Formal)'
                      : '3 · Lịch sự vừa (Smart Casual)'}
                  </Text>
                </View>

                {/* Dịp mặc */}
                <View style={styles.contextsSection}>
                  <Text style={styles.detailLabel}>Dịp mặc phù hợp:</Text>
                  <View style={styles.contextTagsRow}>
                    {contexts.length > 0 ? (
                      contexts.map((ctx) => (
                        <View key={ctx} style={styles.contextTag}>
                          <Ionicons name="sparkles" size={12} color={colors.primary} />
                          <Text style={styles.contextTagText}>{ctx}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.mutedText}>Mọi dịp</Text>
                    )}
                  </View>
                </View>

                {/* Nút hành động */}
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.editActionBtn]}
                    onPress={() => setIsEditing(true)}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.onPrimary} />
                    <Text style={styles.editActionText}>Chỉnh sửa</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, styles.deleteActionBtn]}
                    onPress={handleDelete}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={styles.deleteActionText}>Xóa món đồ</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.lg,
    marginVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '90%',
    height: '90%',
  },
  viewSection: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  colorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contextsSection: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  contextTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  contextTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  contextTagText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  mutedText: {
    fontSize: 13,
    color: colors.textLight,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  editActionBtn: {
    backgroundColor: colors.primary,
  },
  editActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  deleteActionBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },

  // Edit Section
  editSection: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleActive: {
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  formalityCol: {
    gap: spacing.xs,
  },
  formalityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formalityOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  formalityLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  formalityLabelActive: {
    color: colors.primaryDark,
  },
  formalityDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  cancelBtn: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});

