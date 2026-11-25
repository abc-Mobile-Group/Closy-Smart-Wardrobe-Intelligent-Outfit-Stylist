import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/constants/theme';
import ItemDetailModal from '../../src/components/ItemDetailModal';
import Toast from '../../src/components/Toast';
import { useAuthStore } from '../../src/store/authStore';
import { useWardrobeStore } from '../../src/store/wardrobeStore';
import { WardrobeItem } from '../../src/types/item';

const CATEGORIES = ['Tất cả', 'Áo', 'Quần', 'Váy', 'Đầm', 'Giày'] as const;

// Hàm hỗ trợ chèn các ô trống vô hình để hàng cuối của lưới 3 cột không bị tách lệch hai bên
const formatGridData = (dataList: any[], numCols: number = 3) => {
  const total = dataList.length;
  const remainder = total % numCols;
  if (remainder === 0) return dataList;
  const blanksNeeded = numCols - remainder;
  const padded = [...dataList];
  for (let i = 0; i < blanksNeeded; i++) {
    padded.push({ id: `__blank_${i}__`, isBlank: true });
  }
  return padded;
};

export default function WardrobeScreen() {
  const router = useRouter();
  const { added } = useLocalSearchParams<{ added?: string }>();
  const [showAddedToast, setShowAddedToast] = useState(false);
  useEffect(() => {
    if (added === '1') {
      setShowAddedToast(true);
      router.setParams({ added: '' });
    }
  }, [added]);
  const { email, name, openProfile } = useAuthStore();
  const { items: dbItems, loadItems, deleteItem, updateItem } = useWardrobeStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItem, setActiveItem] = useState<WardrobeItem | null>(null);

  // Tải danh sách đồ từ SQLite khi màn hình hiển thị
  useEffect(() => {
    loadItems();
  }, []);

  const displayName = name || (email ? email.split('@')[0] : 'An');
  const initial = displayName.charAt(0).toUpperCase();

  // Chỉ lấy các món đồ thật người dùng đã lưu trong SQLite
  const combinedItems = useMemo(() => {
    return dbItems.map((item) => ({
      id: `db_${item.id}`,
      rawDbId: item.id,
      name: item.name || `${item.category} ${item.color_name || ''}`.trim(),
      category: item.category,
      colorName: item.color_name || 'Tự chọn',
      context: item.contexts || 'Mọi dịp',
      image: { uri: item.image_path },
      isDbItem: true,
    }));
  }, [dbItems]);

  const filteredItems = useMemo(() => {
    return combinedItems.filter((item) => {
      const matchCategory =
        selectedCategory === 'Tất cả' || item.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.colorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.context.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [combinedItems, selectedCategory, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Tủ đồ của bạn</Text>
            <Text style={styles.headerSubtitle}>
              {combinedItems.length} món quen thuộc, nhiều cách phối mới
            </Text>
          </View>
          <Pressable style={styles.avatar} onPress={openProfile}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, màu sắc hoặc loại đồ"
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable hitSlop={8}>
            <Ionicons name="options-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Categories Chips */}
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Section title & Add link */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'Tất cả' ? 'Tất cả món đồ' : selectedCategory} · {filteredItems.length}
          </Text>
          <Pressable
            style={styles.addLinkBtn}
            onPress={() => router.push('/add-item')}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addLinkText}>Thêm đồ</Text>
          </Pressable>
        </View>

        {/* 3-Column Grid */}
        <FlatList
          data={formatGridData([...filteredItems, { id: '__add_new__', isAddBtn: true } as any])}
          keyExtractor={(item) => item.id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => {
            if (item.isBlank) {
              return <View style={styles.blankCard} />;
            }

            if (item.isAddBtn) {
              return (
                <Pressable
                  style={styles.addNewCard}
                  onPress={() => router.push('/add-item')}
                >
                  <Ionicons name="add" size={28} color={colors.primary} />
                  <Text style={styles.addNewText}>Thêm món mới</Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                style={styles.itemCard}
                onPress={() => {
                  const raw = dbItems.find((d) => d.id === item.rawDbId);
                  if (raw) setActiveItem(raw);
                }}
                onLongPress={() => {
                  if (item.rawDbId) {
                    Alert.alert(
                      'Xóa món đồ',
                      `Bạn có chắc muốn xóa "${item.name}" khỏi tủ đồ?`,
                      [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: 'Xóa',
                          style: 'destructive',
                          onPress: () => deleteItem(item.rawDbId),
                        },
                      ]
                    );
                  }
                }}
              >
                <Image source={item.image} style={styles.itemImage} resizeMode="cover" />
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.colorName} · {item.context}
                </Text>
              </Pressable>
            );
          }}
          ListHeaderComponent={
            combinedItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shirt-outline" size={40} color={colors.primary} />
                <Text style={styles.emptyTitle}>Tủ đồ đang trống</Text>
                <Text style={styles.emptyDesc}>Chụp hoặc chọn ảnh một món để bắt đầu.</Text>
                <Pressable style={styles.emptyBtn} onPress={() => router.push('/add-item')}>
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                  <Text style={styles.emptyBtnText}>Thêm món đầu tiên</Text>
                </Pressable>
              </View>
            ) : undefined
          }
          ListFooterComponent={
            <View style={styles.footerNote}>
              <Ionicons name="phone-portrait-outline" size={14} color={colors.textLight} />
              <Text style={styles.footerNoteText}>
                Tủ đồ này được lưu trên thiết bị của bạn.
              </Text>
            </View>
          }
        />

        <Toast
          visible={showAddedToast}
          message="Đã thêm vào tủ đồ"
          onHide={() => setShowAddedToast(false)}
        />

        {/* Modal xem chi tiết, chỉnh sửa & xóa món đồ */}
        <ItemDetailModal
          visible={Boolean(activeItem)}
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onDelete={async (id) => {
            await deleteItem(id);
            setActiveItem(null);
          }}
          onUpdate={async (id, data) => {
            const updated = await updateItem(id, data as any);
            if (updated) setActiveItem(updated);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },

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
  headerSubtitle: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginTop: 2 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    height: 42,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },

  // Categories
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.chipInactiveText,
  },
  categoryTextActive: {
    color: colors.chipActiveText,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  addLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addLinkText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Grid
  gridContent: { paddingBottom: spacing.xl },
  gridRow: { justifyContent: 'space-between', marginBottom: spacing.md },
  itemCard: {
    width: '31%',
    gap: 4,
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: '#EAE6E1',
  },
  itemName: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
  itemMeta: { fontSize: 10, color: colors.textMuted },

  // Add New Card
  addNewCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    backgroundColor: '#F0F9FB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addNewText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  blankCard: {
    width: '31%',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    backgroundColor: '#F0F9FB',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyDesc: { fontSize: 12, color: colors.textMuted },
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
  emptyBtnText: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },

  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  footerNoteText: { fontSize: 11, color: colors.textMuted },
});
