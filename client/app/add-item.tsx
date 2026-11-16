import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../src/constants/theme';
import { ImageService } from '../src/services/ImageService';
import { ProcessedColor } from '../src/api/endpoints';
import { Category, Formality } from '../src/types/item';
import { useWardrobeStore } from '../src/store/wardrobeStore';

// 5 Danh mục chuẩn: Áo, Quần, Váy, Đầm, Giày
const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: 'Áo', label: 'Áo', icon: 'shirt-outline' },
  { id: 'Quần', label: 'Quần', icon: 'file-tray-outline' },
  { id: 'Váy', label: 'Váy', icon: 'woman-outline' },
  { id: 'Đầm', label: 'Đầm', icon: 'sparkles-outline' },
  { id: 'Giày', label: 'Giày', icon: 'footsteps-outline' },
];

// Formality (Độ lịch sự): 1, 3, 5
const FORMALITY_LEVELS: { value: Formality; label: string; desc: string }[] = [
  { value: 1, label: '1 · Thoải mái', desc: 'Casual, mặc ở nhà / dạo phố' },
  { value: 3, label: '3 · Lịch sự vừa', desc: 'Smart Casual, đi học / công sở' },
  { value: 5, label: '5 · Trang trọng', desc: 'Formal, tiệc / gặp đối tác' },
];

// Contexts (Bối cảnh): Đi học, Đi làm, Đi chơi, Hẹn hò
const CONTEXT_OPTIONS = ['Đi học', 'Đi làm', 'Đi chơi', 'Hẹn hò'] as const;

// Bảng màu chuẩn của ứng dụng Closy
const COLOR_PALETTE = [
  { id: 'white', name: 'Trắng', hex: '#FFFFFF', border: '#E2E8F0', h: 0, s: 0, l: 100 },
  { id: 'cream', name: 'Kem', hex: '#F5F2EB', border: '#E2E8F0', h: 42, s: 35, l: 94 },
  { id: 'dusty-pink', name: 'Hồng phấn', hex: '#D29B9B', h: 0, s: 38, l: 72 },
  { id: 'navy', name: 'Xanh đậm', hex: '#243A63', h: 219, s: 47, l: 26 },
  { id: 'olive', name: 'Ô liu', hex: '#636F4E', h: 82, s: 17, l: 37 },
  { id: 'black', name: 'Đen', hex: '#1E293B', h: 222, s: 47, l: 11 },
  { id: 'gray', name: 'Xám', hex: '#808080', h: 0, s: 0, l: 50 },
  { id: 'brown', name: 'Nâu', hex: '#795548', h: 16, s: 25, l: 38 },
  { id: 'blue', name: 'Xanh dương', hex: '#2196F3', h: 207, s: 90, l: 54 },
  { id: 'red', name: 'Đỏ', hex: '#E53935', h: 1, s: 79, l: 56 },
  { id: 'yellow', name: 'Vàng', hex: '#FDD835', h: 48, s: 98, l: 59 },
];

export default function AddItemScreen() {
  const router = useRouter();
  const addItemToStore = useWardrobeStore((state) => state.addItem);

  // 1. Quản lý ảnh & AI (Bỏ mock data, chỉ dùng ảnh thật)
  const [currentImageUri, setCurrentImageUri] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isAiTransparent, setIsAiTransparent] = useState(false);
  const [aiDetectedColor, setAiDetectedColor] = useState<ProcessedColor | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string>('white');

  // Màu sắc hiện thời đang chọn: Đồng nhất 100% trên toàn bộ giao diện và cơ sở dữ liệu
  const activeColor = useMemo(() => {
    return COLOR_PALETTE.find((c) => c.id === selectedColorId) || COLOR_PALETTE[0];
  }, [selectedColorId]);

  // 2. Thuộc tính trang phục (DoD)
  const [itemName, setItemName] = useState<string>('');
  const [category, setCategory] = useState<Category>('Áo');
  const [formality, setFormality] = useState<Formality>(3); // Mặc định 3: Lịch sự vừa
  const [selectedContexts, setSelectedContexts] = useState<string[]>(['Đi học', 'Đi làm']);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Bật/tắt bối cảnh (Multi-select)
   */
  const toggleContext = (ctx: string) => {
    setSelectedContexts((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx],
    );
  };

  /**
   * Thay đổi Danh mục: đồng bộ tên gợi ý thông minh
   */
  const handleCategoryChange = (newCat: Category) => {
    const oldCat = category;
    setCategory(newCat);
    if (!itemName || itemName.trim() === '') {
      setItemName(`${newCat} ${activeColor.name.toLowerCase()}`);
    } else {
      const reg = new RegExp(`^${oldCat}`, 'i');
      if (reg.test(itemName)) {
        setItemName(itemName.replace(reg, newCat));
      } else {
        let replaced = false;
        for (const cat of CATEGORIES) {
          const cReg = new RegExp(`^${cat.id}`, 'i');
          if (cReg.test(itemName)) {
            setItemName(itemName.replace(cReg, newCat));
            replaced = true;
            break;
          }
        }
        if (!replaced) {
          setItemName(`${newCat} ${activeColor.name.toLowerCase()}`);
        }
      }
    }
  };

  /**
   * Thay đổi Màu sắc: đồng bộ bảng màu và tên gọi thông minh (100% người dùng quyết định)
   */
  const handleColorChange = (newColor: (typeof COLOR_PALETTE)[number]) => {
    setSelectedColorId(newColor.id);
    if (!itemName || itemName.trim() === '') {
      setItemName(`${category} ${newColor.name.toLowerCase()}`);
      return;
    }
    let updated = itemName;
    let replaced = false;

    // 1. Kiểm tra màu hiện tại
    if (activeColor?.name) {
      const reg = new RegExp(activeColor.name, 'i');
      if (reg.test(updated)) {
        updated = updated.replace(reg, newColor.name.toLowerCase());
        replaced = true;
      }
    }

    // 2. Kiểm tra các màu còn lại trong bảng màu
    if (!replaced) {
      for (const pal of COLOR_PALETTE) {
        const reg = new RegExp(pal.name, 'i');
        if (reg.test(updated)) {
          updated = updated.replace(reg, newColor.name.toLowerCase());
          replaced = true;
          break;
        }
      }
    }

    // 3. Xử lý các từ ngữ màu thông dụng khác (cam, rêu...)
    if (!replaced) {
      if (/cam/i.test(updated)) {
        updated = updated.replace(/cam/i, newColor.name.toLowerCase());
        replaced = true;
      } else if (/rêu/i.test(updated)) {
        updated = updated.replace(/rêu/i, newColor.name.toLowerCase());
        replaced = true;
      }
    }

    if (!replaced) {
      updated = `${category} ${newColor.name.toLowerCase()}`;
    }
    setItemName(updated);
  };

  /**
   * Xử lý ảnh sau khi chụp/chọn: Nén cạnh dài 800px & tách nền AI
   */
  const processImageUri = async (rawUri: string) => {
    setIsProcessingImage(true);
    try {
      const result = await ImageService.processClothingImage(rawUri);

      // Thẩm định AI: Nếu ảnh không phải là trang phục để mặc
      if (result.isClothing === false) {
        Alert.alert(
          'Không nhận diện được trang phục',
          result.rejectionReason ||
            'Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!',
        );
        return;
      }

      setCurrentImageUri(result.uri);
      setIsAiTransparent(result.isTransparent);

      if (result.color) {
        setAiDetectedColor(result.color);
        // Tự động map màu nhận diện AI vào bảng màu
        let match = COLOR_PALETTE.find((c) => c.id === result.color?.closest_palette_id);

        // Khớp màu theo ngữ nghĩa trong tên gọi do AI gợi ý (vd: "xanh ô liu", "hồng pastel", "xanh đậm")
        // giúp loại bỏ hoàn toàn việc bị màu tóc hay nền che khuất màu trang phục thực tế
        if (result.name) {
          const lowerName = result.name.toLowerCase();
          const matchByName = COLOR_PALETTE.find((c) => {
            if (c.id === 'olive' && (lowerName.includes('ô liu') || lowerName.includes('o liu') || lowerName.includes('rêu') || lowerName.includes('olive'))) return true;
            if (c.id === 'dusty-pink' && (lowerName.includes('hồng') || lowerName.includes('pink') || lowerName.includes('pastel'))) return true;
            if (c.id === 'cream' && (lowerName.includes('kem') || lowerName.includes('be') || lowerName.includes('beige'))) return true;
            if (c.id === 'navy' && (lowerName.includes('xanh đậm') || lowerName.includes('navy') || lowerName.includes('denim'))) return true;
            if (c.id === 'blue' && (lowerName.includes('xanh dương') || lowerName.includes('xanh biển') || lowerName.includes('da trời'))) return true;
            if (c.id === 'black' && lowerName.includes('đen')) return true;
            if (c.id === 'white' && lowerName.includes('trắng')) return true;
            if (c.id === 'brown' && lowerName.includes('nâu')) return true;
            if (c.id === 'gray' && (lowerName.includes('xám') || lowerName.includes('ghi'))) return true;
            if (c.id === 'red' && lowerName.includes('đỏ')) return true;
            if (c.id === 'yellow' && lowerName.includes('vàng')) return true;
            return false;
          });
          if (matchByName) {
            match = matchByName;
          }
        }

        if (match) {
          setSelectedColorId(match.id);
        }
      }

      // 1. Tự động cập nhật Loại trang phục (Áo / Quần / Váy / Giày)
      const currentCat = result.category || category;
      if (result.category) {
        setCategory(result.category);
      }

      // 2. Tự động cập nhật Tên món đồ chi tiết do AI gợi ý (đồng nhất với màu đã map)
      const detectedColorName =
        COLOR_PALETTE.find((c) => c.id === result.color?.closest_palette_id)?.name ||
        result.color?.name ||
        'mới';

      if (result.name) {
        setItemName(result.name);
      } else {
        setItemName(`${currentCat} ${detectedColorName.toLowerCase()}`);
      }

      // 3. Tự động cập nhật Độ lịch sự (Formality: 1 | 3 | 5)
      if (result.formality) {
        setFormality(result.formality);
      }

      // 4. Tự động cập nhật Dịp mặc phù hợp (Đi học, Đi làm, Đi chơi, Hẹn hò)
      if (result.contexts && result.contexts.length > 0) {
        setSelectedContexts(result.contexts);
      }
    } catch (e: any) {
      console.warn('Lỗi khi xử lý ảnh:', e);
      setCurrentImageUri(rawUri);
      setIsAiTransparent(false);
    } finally {
      setIsProcessingImage(false);
    }
  };

  /**
   * Chạm 1A: Chụp ảnh từ Camera
   */
  const handleCameraCapture = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Quyền truy cập', 'Closy cần quyền máy ảnh để chụp trang phục của bạn.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        await processImageUri(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể mở máy ảnh: ' + (e?.message || ''));
    }
  };

  /**
   * Chạm 1B: Chọn ảnh từ Thư viện
   */
  const handleGalleryPick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Quyền truy cập', 'Closy cần quyền truy cập thư viện để chọn ảnh trang phục.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        await processImageUri(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể mở thư viện: ' + (e?.message || ''));
    }
  };

  /**
   * Chạm cuối: Bấm "Lưu vào tủ đồ" thêm bản ghi vào SQLite và chuyển về tab Tủ đồ
   */
  const handleSaveToWardrobe = async () => {
    if (isSaving || isProcessingImage) return;

    if (!currentImageUri) {
      Alert.alert('Chưa chọn ảnh', 'Vui lòng chụp ảnh hoặc chọn ảnh trang phục từ thư viện!');
      return;
    }

    // Xác định màu sắc: Luôn ghi nhận 100% theo màu người dùng chọn trên giao diện
    const color_h = activeColor.h;
    const color_s = activeColor.s;
    const color_l = activeColor.l;
    const color_hex = activeColor.hex;
    const color_name = activeColor.name;

    const imagePath = currentImageUri;

    setIsSaving(true);
    try {
      await addItemToStore({
        name: itemName.trim() || `${category} ${color_name.toLowerCase()}`,
        category,
        image_path: imagePath,
        color_h,
        color_s,
        color_l,
        color_hex,
        color_name,
        formality,
        contexts: selectedContexts.length > 0 ? selectedContexts : ['Mọi dịp'],
      });

      // Chuyển hướng về tab Tủ đồ
      router.replace('/(tabs)/wardrobe');
    } catch (error: any) {
      Alert.alert('Lỗi lưu trang phục', error?.message || 'Không thể lưu vào tủ đồ. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
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
          <Text style={styles.headerTitle}>Thêm món đồ</Text>
          <Text style={styles.headerSubtitle}>Tối đa 4 chạm · Tự động tách nền & lưu SQLite</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* BƯỚC 1: Chọn hoặc chụp ảnh (Chạm 1) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Chọn hình ảnh</Text>
          <View style={styles.methodRow}>
            <Pressable
              style={styles.methodBtn}
              onPress={handleCameraCapture}
              disabled={isProcessingImage}
            >
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <Text style={styles.methodBtnText}>Chụp ảnh</Text>
            </Pressable>

            <Pressable
              style={styles.methodBtn}
              onPress={handleGalleryPick}
              disabled={isProcessingImage}
            >
              <Ionicons name="images-outline" size={22} color={colors.primary} />
              <Text style={styles.methodBtnText}>Thư viện</Text>
            </Pressable>
          </View>
        </View>

        {/* Khung xem trước ảnh (Preview) */}
        <View style={[styles.previewCard, isAiTransparent && styles.previewCardTransparent]}>
          <View style={styles.imageBox}>
            {isProcessingImage ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Đang tách nền AI...</Text>
              </View>
            ) : currentImageUri ? (
              <Image
                source={{ uri: currentImageUri }}
                style={styles.previewImg}
                resizeMode="contain"
              />
            ) : (
              <Pressable style={styles.emptyImageBox} onPress={handleGalleryPick}>
                <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
                <Text style={styles.emptyImageText}>Chạm để tải ảnh</Text>
              </Pressable>
            )}

            {isAiTransparent && !isProcessingImage && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                <Text style={styles.aiBadgeText}>AI Lookbook</Text>
              </View>
            )}
          </View>

          <View style={styles.previewInfo}>
            <TextInput
              style={styles.nameInput}
              value={itemName}
              onChangeText={setItemName}
              placeholder="Nhập tên món đồ..."
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.previewSub}>
              {currentImageUri ? 'Ảnh chụp/tải lên' : 'Chưa chọn ảnh'} · {category}
            </Text>

            {/* Huy hiệu màu sắc: Đồng bộ 100% theo activeColor người dùng hoặc AI chọn */}
            <View style={styles.detectedColorBadge}>
              <View
                style={[
                  styles.detectedColorDot,
                  { backgroundColor: activeColor.hex },
                  activeColor.border ? { borderWidth: 1, borderColor: activeColor.border } : null,
                ]}
              />
              <Text style={styles.detectedColorText}>
                {activeColor.name} ({activeColor.hex})
              </Text>
            </View>

            <Pressable
              style={styles.changeActionBtn}
              onPress={handleGalleryPick}
              disabled={isProcessingImage}
            >
              <Ionicons name="sync-outline" size={13} color={colors.primary} />
              <Text style={styles.changeActionText}>Đổi ảnh khác</Text>
            </Pressable>
          </View>
        </View>

        {/* BƯỚC 2: Chọn danh mục Áo, Quần, Váy, Giày (Chạm 2) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Danh mục trang phục</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryBtn, active && styles.categoryBtnActive]}
                  onPress={() => handleCategoryChange(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={20}
                    color={active ? colors.onPrimary : colors.textMuted}
                  />
                  <Text style={[styles.categoryBtnText, active && styles.categoryBtnTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* BƯỚC 3: Chọn Formality: 1, 3, 5 (Chạm 3A) */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>3. Độ lịch sự (Formality)</Text>
            <Text style={styles.highlightVal}>Mức {formality}</Text>
          </View>
          <View style={styles.formalityRow}>
            {FORMALITY_LEVELS.map((lvl) => {
              const active = formality === lvl.value;
              return (
                <Pressable
                  key={lvl.value}
                  style={[styles.formalityBtn, active && styles.formalityBtnActive]}
                  onPress={() => setFormality(lvl.value)}
                >
                  <Text style={[styles.formalityTitle, active && styles.formalityTitleActive]}>
                    {lvl.label}
                  </Text>
                  <Text style={[styles.formalityDesc, active && styles.formalityDescActive]}>
                    {lvl.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* BƯỚC 4: Bối cảnh (Contexts) & Màu sắc (Chạm 3B) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Phù hợp dịp nào? (Contexts)</Text>
          <View style={styles.contextsRow}>
            {CONTEXT_OPTIONS.map((ctx) => {
              const active = selectedContexts.includes(ctx);
              return (
                <Pressable
                  key={ctx}
                  style={[styles.contextChip, active && styles.contextChipActive]}
                  onPress={() => toggleContext(ctx)}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'add-circle-outline'}
                    size={16}
                    color={active ? colors.onPrimary : colors.textMuted}
                  />
                  <Text style={[styles.contextChipText, active && styles.contextChipTextActive]}>
                    {ctx}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Chọn / đổi màu sắc */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Màu sắc</Text>
            <Text style={styles.highlightVal}>
              {COLOR_PALETTE.find((c) => c.id === selectedColorId)?.name}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.paletteScroll}
          >
            {COLOR_PALETTE.map((c) => {
              const active = selectedColorId === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c.hex },
                    c.border ? { borderWidth: 1, borderColor: c.border } : null,
                    active && styles.colorDotActive,
                  ]}
                  onPress={() => handleColorChange(c)}
                >
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={15}
                      color={c.id === 'white' || c.id === 'cream' ? colors.primary : '#FFFFFF'}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Cam kết lưu an toàn */}
        <View style={styles.infoAlert}>
          <Ionicons name="save-outline" size={18} color={colors.primary} />
          <Text style={styles.infoAlertText}>
            Dữ liệu trang phục được lưu trữ vĩnh viễn trong SQLite nội bộ thiết bị của bạn.
          </Text>
        </View>
      </ScrollView>

      {/* CHẠM 4: Nút "Lưu vào tủ đồ" */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.saveBtn, (isSaving || isProcessingImage) && styles.saveBtnDisabled]}
          onPress={handleSaveToWardrobe}
          disabled={isSaving || isProcessingImage}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.saveBtnText}>Lưu vào tủ đồ</Text>
              <Ionicons name="checkmark-sharp" size={20} color={colors.onPrimary} />
            </>
          )}
        </Pressable>
        <Text style={styles.bottomNote}>
          Hoàn tất thêm trang phục trong 4 chạm nhanh chóng.
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

  section: { gap: spacing.xs + 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  highlightVal: { fontSize: 12, fontWeight: '700', color: colors.primary },

  // Method buttons (Chạm 1)
  methodRow: { flexDirection: 'row', gap: spacing.sm },
  methodBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
  },
  methodBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },

  // Preview Box
  previewCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderStyle: 'dashed',
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  previewCardTransparent: {
    borderColor: colors.primary,
    backgroundColor: '#F8FCFD',
  },
  imageBox: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingBox: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 9, color: colors.primary, fontWeight: '700', marginTop: 4 },
  emptyImageBox: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  emptyImageText: { fontSize: 10, color: colors.primary, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  previewImg: { width: 90, height: 90 },
  aiBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    right: 3,
    backgroundColor: 'rgba(15, 118, 110, 0.88)',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  aiBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  previewInfo: { flex: 1, gap: 4 },
  nameInput: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 2,
  },
  previewSub: { fontSize: 12, color: colors.textMuted },
  detectedColorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  detectedColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detectedColorText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  changeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  changeActionText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  // Categories (Chạm 2)
  categoryRow: { flexDirection: 'row', gap: spacing.xs + 2 },
  categoryBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
  },
  categoryBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  categoryBtnTextActive: { color: colors.onPrimary, fontWeight: '700' },

  // Formality: 1, 3, 5 (Chạm 3A)
  formalityRow: { flexDirection: 'row', gap: spacing.xs },
  formalityBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 2,
  },
  formalityBtnActive: {
    backgroundColor: '#F0F9FB',
    borderColor: colors.primary,
  },
  formalityTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  formalityTitleActive: { color: colors.primary },
  formalityDesc: { fontSize: 9, color: colors.textLight, textAlign: 'center' },
  formalityDescActive: { color: colors.primaryDark },

  // Contexts: Đi học, Đi làm, Đi chơi, Hẹn hò (Chạm 3B)
  contextsRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contextChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  contextChipText: { fontSize: 12, fontWeight: '600', color: colors.chipInactiveText },
  contextChipTextActive: { color: colors.chipActiveText },

  // Color Palette
  paletteScroll: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: colors.primary,
  },

  // Alert
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: spacing.sm + 2,
  },
  infoAlertText: { flex: 1, fontSize: 11, color: '#166534', lineHeight: 16 },

  // Bottom Save Action (Chạm 4)
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
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
  bottomNote: { fontSize: 10, color: colors.textLight, textAlign: 'center' },
});
