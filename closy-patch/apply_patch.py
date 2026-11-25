#!/usr/bin/env python3
"""Áp dụng bản vá "trạng thái tương tác và xử lý lỗi" cho client Closy.

Cách dùng (từ thư mục gốc repo, đã commit hết thay đổi cũ trước):
    python3 closy-patch/apply_patch.py --check     # chỉ kiểm tra, không ghi gì
    python3 closy-patch/apply_patch.py             # áp dụng thật

- Mỗi file được sửa trong bộ nhớ; chỉ ghi ra đĩa khi TẤT CẢ chỗ sửa của file đó khớp.
- Chạy lại nhiều lần an toàn: chỗ nào đã vá thì bỏ qua.
- Chỗ nào không khớp (do code đã đổi) sẽ được in rõ để sửa tay.
"""
import shutil
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent
ROOT = Path.cwd()
CHECK = "--check" in sys.argv
for a in sys.argv[1:]:
    if not a.startswith("--"):
        ROOT = Path(a).resolve()

if not (ROOT / "client" / "app").is_dir():
    sys.exit("Hãy chạy từ thư mục gốc repo (nơi có client/app), hoặc truyền đường dẫn gốc repo.")


class PatchError(Exception):
    pass


def sub(text, old, new, count=1):
    """Thay `old` bằng `new`, đúng `count` chỗ. count=0 nghĩa là mọi chỗ (ít nhất 1)."""
    if new in text:
        return text, "đã vá"
    n = text.count(old)
    if n == 0:
        raise PatchError("không tìm thấy đoạn cần thay: " + repr(old[:90]))
    if count and n != count:
        raise PatchError(f"đoạn cần thay xuất hiện {n} lần (cần {count}): " + repr(old[:90]))
    return text.replace(old, new), "ok"


def between(text, start, end, new, include_end=False):
    """Thay toàn bộ phần từ `start` tới `end` bằng `new` (end có thể được giữ lại)."""
    if new in text:
        return text, "đã vá"
    if text.count(start) != 1:
        raise PatchError(f"mốc đầu xuất hiện {text.count(start)} lần: " + repr(start[:90]))
    i = text.index(start)
    j = text.find(end, i + len(start))
    if j < 0:
        raise PatchError("không thấy mốc cuối: " + repr(end[:90]))
    if include_end:
        j += len(end)
    return text[:i] + new + text[j:], "ok"


# ---------------------------------------------------------------------------
# Nội dung thay thế dài
# ---------------------------------------------------------------------------

TODAY_WEATHER_LOGIC = r'''  // Thời tiết: chỉ xin quyền vị trí sau khi người dùng đồng ý ở màn giải thích (P3).
  // Không có thời tiết thật thì ẩn thẻ, việc phối đồ vẫn chạy bình thường (O1).
  const fetchWeather = async (askPermission = false) => {
    setIsLoadingWeather(true);
    try {
      const data = await WeatherService.getCurrentWeather({ askPermission });
      setWeather((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
      if (data) {
        setWeatherState('ok');
      } else {
        const st = await WeatherService.getPermissionStatus();
        setWeatherState(st === 'granted' ? 'unavailable' : 'denied');
      }
    } catch (e) {
      console.warn('[TodayScreen] Không thể lấy thời tiết:', e);
      setWeatherState('unavailable');
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const status = await WeatherService.getPermissionStatus();
      if (!alive) return;
      if (status === 'granted') {
        await fetchWeather();
      } else if (status === 'undetermined') {
        setWeatherState('unavailable');
        setShowLocationPrompt(true);
      } else {
        setWeatherState('denied');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleAllowLocation = async () => {
    setShowLocationPrompt(false);
    await fetchWeather(true);
  };

  const handleLaterLocation = () => {
    setShowLocationPrompt(false);
    setWeatherState('denied');
  };

  const handleWeatherChip = async () => {
    const status = await WeatherService.getPermissionStatus();
    if (status === 'undetermined') setShowLocationPrompt(true);
    else if (status === 'denied') Linking.openSettings();
    else await fetchWeather();
  };

'''

TODAY_WEATHER_JSX = r'''        {/* Thời tiết: chỉ hiện khi có dữ liệu thật. Không có thì hiện chip nhỏ, vẫn phối đồ bình thường */}
        {weather ? (
          showWeather ? (
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
          )
        ) : weatherState === 'checking' ? null : (
          <View style={styles.weatherHiddenBar}>
            <Pressable
              style={styles.reopenWeatherBtn}
              onPress={handleWeatherChip}
              accessibilityRole="button"
            >
              <Ionicons name="cloud-offline-outline" size={14} color={colors.primary} />
              <Text style={styles.reopenWeatherText}>
                {weatherState === 'denied'
                  ? 'Chưa có thời tiết · chạm để bật vị trí'
                  : 'Chưa có thời tiết · chạm để thử lại'}
              </Text>
            </Pressable>
          </View>
        )}

'''

TODAY_PROMPT = r'''      </ScrollView>
      <PermissionPrompt
        visible={showLocationPrompt}
        icon="location-outline"
        title="Xem thời tiết nơi bạn ở?"
        message="Closy dùng vị trí để xem thời tiết và gợi ý đồ hợp trời. Vị trí không được lưu. Bạn có thể bỏ qua, vẫn phối đồ bình thường."
        confirmLabel="Cho phép"
        cancelLabel="Để sau"
        onConfirm={handleAllowLocation}
        onCancel={handleLaterLocation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({'''

ADD_ITEM_HELPERS = r'''const askOpenSettings = (what: string) => {
    Alert.alert(
      `Cần quyền ${what}`,
      `Hãy bật quyền ${what} trong Cài đặt, hoặc chọn ảnh từ thư viện.`,
      [
        { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
        ...(what === 'máy ảnh'
          ? [{ text: 'Chọn từ thư viện', onPress: () => handleGalleryPick() }]
          : []),
        { text: 'Để sau', style: 'cancel' as const },
      ],
    );
  };

  const friendlyAiError = (msg: string) =>
    /không kết nối|quá chậm/i.test(msg)
      ? 'Không kết nối được máy chủ. Bạn vẫn có thể dùng ảnh gốc, rồi tự chọn màu.'
      : 'Bạn có thể dùng ảnh gốc, rồi tự chọn màu.';

  // Xin quyền theo ngữ cảnh: chỉ hiện màn giải thích khi quyền còn "chưa hỏi" (P1)
  const handleCameraCapture = async () => {
    const cur = await ImagePicker.getCameraPermissionsAsync();
    if (cur.status === 'undetermined') {
      setShowCameraPrompt(true);
      return;
    }
    await openCamera();
  };

  const openCamera = async () => {'''

ADD_ITEM_BANNER = r'''        {/* Tách nền lỗi: giữ ảnh gốc, có lối thoát (R1) */}
        {aiFailed && !isProcessingImage && (
          <InlineBanner
            tone="warning"
            title="Chưa tách được nền."
            message={friendlyAiError(aiFailed.message)}
            actions={[
              { label: 'Dùng ảnh gốc', primary: true, onPress: () => setAiFailed(null) },
              { label: 'Thử lại', onPress: () => processImageUri(aiFailed.uri) },
              { label: 'Chọn ảnh khác', onPress: handleGalleryPick },
            ]}
          />
        )}

        {/* Khung xem trước ảnh (Preview) */}'''

ADD_ITEM_PROMPT = r'''      <PermissionPrompt
        visible={showCameraPrompt}
        icon="camera-outline"
        title="Cho Closy dùng máy ảnh?"
        message="Closy cần máy ảnh để chụp trang phục của bạn. Ảnh chỉ được dùng để thêm vào tủ đồ."
        confirmLabel="Tiếp tục"
        cancelLabel="Để sau"
        onConfirm={() => {
          setShowCameraPrompt(false);
          openCamera();
        }}
        onCancel={() => setShowCameraPrompt(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({'''

FIELD_STYLES = r'''  eyeBtn: { padding: 4 },
  inputError: { borderColor: colors.danger },
  fieldError: { fontSize: 12, color: colors.danger },'''

# ---------------------------------------------------------------------------
# Danh sách chỗ sửa theo file
# ---------------------------------------------------------------------------

PATCHES = {
    # ---------------- Hôm nay: loading, thời tiết (O1, P3), thiếu danh mục (E3)
    "client/app/(tabs)/today.tsx": [
        ("sub", "  Image,\n  Platform,", "  Image,\n  Linking,\n  Platform,"),
        (
            "sub",
            "import { daysSince } from '../../src/utils/date';",
            "import { daysSince } from '../../src/utils/date';\n"
            "import OutfitSkeleton from '../../src/components/OutfitSkeleton';\n"
            "import PermissionPrompt from '../../src/components/PermissionPrompt';\n"
            "import { describeMissing } from '../../src/utils/wardrobeGaps';\n"
            "import { useDelayedFlag } from '../../src/utils/useDelayedFlag';",
        ),
        (
            "sub",
            "  const [weather, setWeather] = useState<WeatherData>(WeatherService.getDefaultWeather());",
            "  const [weather, setWeather] = useState<WeatherData | null>(null);\n"
            "  const [weatherState, setWeatherState] = useState<'checking' | 'ok' | 'denied' | 'unavailable'>('checking');\n"
            "  const [showLocationPrompt, setShowLocationPrompt] = useState(false);",
        ),
        (
            "sub",
            "  const [nextEvent, setNextEvent] = useState<PlannedEvent | null>(null);",
            "  const [nextEvent, setNextEvent] = useState<PlannedEvent | null>(null);\n"
            "  const showSkeleton = useDelayedFlag(isLoadingOutfits, 300);",
        ),
        (
            "between",
            "  // Lấy thời tiết hiện tại khi vào màn hình",
            "  // Tự động tải lại đồ khi quay lại tab Hôm nay",
            TODAY_WEATHER_LOGIC,
            False,
        ),
        (
            "sub",
            "const list = await OutfitService.getSuggestions(items, currentContext.name, weather);",
            "const list = await OutfitService.getSuggestions(\n"
            "          items,\n"
            "          currentContext.name,\n"
            "          weather ?? WeatherService.getDefaultWeather(),\n"
            "        );",
        ),
        (
            "sub",
            "  const currentOutfit = outfits.length > 0 ? outfits[Math.min(activeOutfitIndex, outfits.length - 1)] : null;",
            "  const currentOutfit = outfits.length > 0 ? outfits[Math.min(activeOutfitIndex, outfits.length - 1)] : null;\n"
            "  const gap = useMemo(() => describeMissing(items), [items]);",
        ),
        (
            "between",
            "        {/* Weather card (Tuân thủ User Story Sprint-3) */}",
            "        {/* Hôm nay bạn đi đâu? */}",
            TODAY_WEATHER_JSX,
            False,
        ),
        (
            "sub",
            "{currentOutfit ? (",
            "{showSkeleton && !currentOutfit ? (\n"
            "            <OutfitSkeleton />\n"
            "          ) : isLoadingOutfits && !currentOutfit ? null : currentOutfit ? (",
        ),
        (
            "sub",
            "<Text style={styles.emptyOutfitTitle}>Chưa có đủ đồ để phối</Text>",
            "<Text style={styles.emptyOutfitTitle}>{gap.title}</Text>",
        ),
        (
            "between",
            "<Text style={styles.emptyOutfitDesc}>",
            "</Text>",
            "<Text style={styles.emptyOutfitDesc}>{gap.message}</Text>",
            True,
        ),
        (
            "sub",
            "onPress={() => router.push('/add-item')}",
            "onPress={() =>\n"
            "                  router.push({\n"
            "                    pathname: '/add-item',\n"
            "                    params: gap.category ? { category: gap.category } : {},\n"
            "                  })\n"
            "                }",
        ),
        (
            "sub",
            "<Text style={styles.ctaText}>Thêm món đồ đầu tiên 📸</Text>",
            "<Text style={styles.ctaText}>{gap.cta}</Text>",
        ),
        (
            "sub",
            "      </ScrollView>\n    </SafeAreaView>\n  );\n}\n\nconst styles = StyleSheet.create({",
            TODAY_PROMPT,
        ),
    ],
    # ---------------- Gợi ý: loading (L2), thiếu danh mục (E3)
    "client/app/(tabs)/suggest.tsx": [
        (
            "sub",
            "import React, { useCallback, useEffect, useState } from 'react';",
            "import React, { useCallback, useEffect, useMemo, useState } from 'react';",
        ),
        (
            "sub",
            "import { OutfitService, SuggestedOutfit } from '../../src/services/OutfitService';",
            "import { OutfitService, SuggestedOutfit } from '../../src/services/OutfitService';\n"
            "import { describeMissing } from '../../src/utils/wardrobeGaps';\n"
            "import { useDelayedFlag } from '../../src/utils/useDelayedFlag';",
        ),
        (
            "sub",
            "  const [isLoading, setIsLoading] = useState(false);",
            "  const [isLoading, setIsLoading] = useState(false);\n"
            "  const showLoading = useDelayedFlag(isLoading, 300);",
        ),
        (
            "sub",
            ".then((data) => setWeather((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data)))",
            ".then((data) => {\n"
            "        if (data) setWeather((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));\n"
            "      })",
        ),
        (
            "sub",
            "  const mainOutfit = outfits.length > 0 ? outfits[0] : null;",
            "  const mainOutfit = outfits.length > 0 ? outfits[0] : null;\n"
            "  const gap = useMemo(() => describeMissing(items), [items]);",
        ),
        ("sub", "{isLoading ? (", "{showLoading ? ("),
        ("sub", ") : mainOutfit ? (", ") : isLoading ? null : mainOutfit ? ("),
        (
            "sub",
            "<Text style={styles.loadingText}>Backend AI Stylist đang phối đồ...</Text>",
            "<Text style={styles.loadingText}>Closy đang phối đồ cho bạn...</Text>",
        ),
        (
            "sub",
            "'Gợi ý thông minh dựa trên độ hòa hợp màu sắc HSL'",
            "'Gợi ý dựa trên màu sắc, bối cảnh và đồ trong tủ của bạn'",
        ),
        (
            "sub",
            "<Text style={styles.emptyTitle}>Chưa đủ trang phục để phối</Text>",
            "<Text style={styles.emptyTitle}>{gap.title}</Text>",
        ),
        (
            "between",
            "<Text style={styles.emptyDesc}>",
            "</Text>",
            "<Text style={styles.emptyDesc}>{gap.message}</Text>",
            True,
        ),
        (
            "sub",
            "onPress={() => router.push('/add-item')}",
            "onPress={() =>\n"
            "                router.push({\n"
            "                  pathname: '/add-item',\n"
            "                  params: gap.category ? { category: gap.category } : {},\n"
            "                })\n"
            "              }",
        ),
        (
            "sub",
            "<Text style={styles.emptyBtnText}>Thêm món đồ</Text>",
            "<Text style={styles.emptyBtnText}>{gap.cta}</Text>",
        ),
    ],
    # ---------------- Thêm món: R1 banner, P1 xin quyền camera, P4 toast
    "client/app/add-item.tsx": [
        ("sub", "  Image,\n  Pressable,", "  Image,\n  Linking,\n  Pressable,"),
        (
            "sub",
            "import { useRouter } from 'expo-router';",
            "import { useLocalSearchParams, useRouter } from 'expo-router';",
        ),
        (
            "sub",
            "import { useWardrobeStore } from '../src/store/wardrobeStore';",
            "import { useWardrobeStore } from '../src/store/wardrobeStore';\n"
            "import InlineBanner from '../src/components/InlineBanner';\n"
            "import PermissionPrompt from '../src/components/PermissionPrompt';",
        ),
        (
            "sub",
            "  const router = useRouter();\n  const addItemToStore",
            "  const router = useRouter();\n"
            "  // Mở từ thông báo \"thiếu danh mục\" thì chọn sẵn danh mục còn thiếu\n"
            "  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();\n"
            "  const initialCategory: Category = CATEGORIES.some((c) => c.id === categoryParam)\n"
            "    ? (categoryParam as Category)\n"
            "    : 'Áo';\n"
            "  const addItemToStore",
        ),
        (
            "sub",
            "  const [category, setCategory] = useState<Category>('Áo');",
            "  const [category, setCategory] = useState<Category>(initialCategory);",
        ),
        (
            "sub",
            "  const [isSaving, setIsSaving] = useState(false);",
            "  const [isSaving, setIsSaving] = useState(false);\n"
            "  const [showCameraPrompt, setShowCameraPrompt] = useState(false);\n"
            "  const [aiFailed, setAiFailed] = useState<{ uri: string; message: string } | null>(null);",
        ),
        ("sub", "setIsProcessingImage(true);", "setIsProcessingImage(true);\n    setAiFailed(null);"),
        (
            "sub",
            "setCurrentImageUri(result.uri);",
            "setCurrentImageUri(result.uri);\n"
            "      setAiFailed(result.isFallback ? { uri: rawUri, message: result.errorMessage || '' } : null);",
        ),
        (
            "sub",
            "setCurrentImageUri(rawUri);",
            "setCurrentImageUri(rawUri);\n"
            "      setAiFailed({ uri: rawUri, message: e?.message || '' });",
        ),
        ("sub", "const handleCameraCapture = async () => {", ADD_ITEM_HELPERS),
        (
            "sub",
            "Alert.alert('Quyền truy cập', 'Closy cần quyền máy ảnh để chụp trang phục của bạn.');",
            "askOpenSettings('máy ảnh');",
        ),
        (
            "sub",
            "Alert.alert('Quyền truy cập', 'Closy cần quyền truy cập thư viện để chọn ảnh trang phục.');",
            "askOpenSettings('thư viện ảnh');",
        ),
        (
            "sub",
            "router.replace('/(tabs)/wardrobe');",
            "router.replace({ pathname: '/(tabs)/wardrobe', params: { added: '1' } });",
        ),
        ("sub", "        {/* Khung xem trước ảnh (Preview) */}", ADD_ITEM_BANNER),
        (
            "sub",
            "    </SafeAreaView>\n  );\n}\n\nconst styles = StyleSheet.create({",
            ADD_ITEM_PROMPT,
        ),
    ],
    # ---------------- Tủ đồ: P4 toast "Đã thêm vào tủ đồ"
    "client/app/(tabs)/wardrobe.tsx": [
        (
            "sub",
            "import { useRouter } from 'expo-router';",
            "import { useLocalSearchParams, useRouter } from 'expo-router';",
        ),
        (
            "sub",
            "import ItemDetailModal from '../../src/components/ItemDetailModal';",
            "import ItemDetailModal from '../../src/components/ItemDetailModal';\n"
            "import Toast from '../../src/components/Toast';",
        ),
        (
            "sub",
            "  const router = useRouter();",
            "  const router = useRouter();\n"
            "  const { added } = useLocalSearchParams<{ added?: string }>();\n"
            "  const [showAddedToast, setShowAddedToast] = useState(false);\n"
            "  useEffect(() => {\n"
            "    if (added === '1') {\n"
            "      setShowAddedToast(true);\n"
            "      router.setParams({ added: '' });\n"
            "    }\n"
            "  }, [added]);",
        ),
        (
            "sub",
            "        {/* Modal xem chi tiết, chỉnh sửa & xóa món đồ */}",
            "        <Toast\n"
            "          visible={showAddedToast}\n"
            "          message=\"Đã thêm vào tủ đồ\"\n"
            "          onHide={() => setShowAddedToast(false)}\n"
            "        />\n\n"
            "        {/* Modal xem chi tiết, chỉnh sửa & xóa món đồ */}",
        ),
    ],
    # ---------------- Đăng nhập: R3 lỗi từng ô, R6 phiên hết hạn
    "client/app/login.tsx": [
        (
            "sub",
            "import { useAuthStore } from '../src/store/authStore';",
            "import { useAuthStore } from '../src/store/authStore';\n"
            "import InlineBanner from '../src/components/InlineBanner';",
        ),
        (
            "sub",
            "const { signIn, login, busy, error, clearError } = useAuthStore();",
            "const { signIn, login, busy, error, clearError, sessionExpired } = useAuthStore();",
        ),
        (
            "sub",
            "  const [showPassword, setShowPassword] = useState(false);",
            "  const [showPassword, setShowPassword] = useState(false);\n"
            "  const [submitted, setSubmitted] = useState(false);\n"
            "  // Lỗi hiện ngay dưới từng ô sau lần bấm gửi đầu tiên và cập nhật theo lúc gõ\n"
            "  const errs = {\n"
            "    email: submitted && !emailOrPhone.trim() ? 'Vui lòng nhập email' : undefined,\n"
            "    password: submitted && !password ? 'Vui lòng nhập mật khẩu' : undefined,\n"
            "  };",
        ),
        (
            "sub",
            "    if (!emailOrPhone.trim()) {\n"
            "      setLocalError('Vui lòng nhập email');\n"
            "      return;\n"
            "    }\n"
            "    if (!password) {\n"
            "      setLocalError('Vui lòng nhập mật khẩu');\n"
            "      return;\n"
            "    }",
            "    setSubmitted(true);\n    if (!emailOrPhone.trim() || !password) return;",
        ),
        (
            "sub",
            "        contentContainerStyle={styles.content}\n        showsVerticalScrollIndicator={false}",
            "        contentContainerStyle={styles.content}\n"
            "        keyboardShouldPersistTaps=\"handled\"\n"
            "        showsVerticalScrollIndicator={false}",
        ),
        (
            "sub",
            "        {displayError && (",
            "        {sessionExpired && !displayError && (\n"
            "          <InlineBanner\n"
            "            tone=\"info\"\n"
            "            title=\"Phiên đăng nhập đã hết hạn\"\n"
            "            message=\"Hãy đăng nhập lại để tiếp tục. Tủ đồ của bạn vẫn còn trên máy.\"\n"
            "          />\n"
            "        )}\n\n"
            "        {displayError && (",
        ),
        (
            "sub",
            "            <Text style={styles.fieldLabel}>Email</Text>\n            <View style={styles.inputContainer}>",
            "            <Text style={styles.fieldLabel}>Email</Text>\n"
            "            <View style={[styles.inputContainer, errs.email && styles.inputError]}>",
        ),
        (
            "sub",
            "                keyboardType=\"email-address\"\n              />\n            </View>",
            "                keyboardType=\"email-address\"\n              />\n            </View>\n"
            "            {errs.email ? <Text style={styles.fieldError}>{errs.email}</Text> : null}",
        ),
        (
            "sub",
            "            <Text style={styles.fieldLabel}>Mật khẩu</Text>\n            <View style={styles.inputContainer}>",
            "            <Text style={styles.fieldLabel}>Mật khẩu</Text>\n"
            "            <View style={[styles.inputContainer, errs.password && styles.inputError]}>",
        ),
        (
            "sub",
            "              </Pressable>\n            </View>\n          </View>\n\n          <Pressable style={styles.forgotBtn}>",
            "              </Pressable>\n            </View>\n"
            "            {errs.password ? <Text style={styles.fieldError}>{errs.password}</Text> : null}\n"
            "          </View>\n\n          <Pressable style={styles.forgotBtn}>",
        ),
        ("sub", "  eyeBtn: { padding: 4 },", FIELD_STYLES),
    ],
    # ---------------- Đăng ký: R5 lỗi từng ô
    "client/app/register.tsx": [
        (
            "sub",
            "  const [showPassword, setShowPassword] = useState(false);",
            "  const [showPassword, setShowPassword] = useState(false);\n"
            "  const [submitted, setSubmitted] = useState(false);\n"
            "  // Lỗi hiện ngay dưới từng ô sau lần bấm gửi đầu tiên và cập nhật theo lúc gõ\n"
            "  const errs = {\n"
            "    fullName: submitted && !fullName.trim() ? 'Vui lòng nhập họ và tên' : undefined,\n"
            "    email: submitted && (!email.trim() || !email.includes('@')) ? 'Vui lòng nhập email hợp lệ' : undefined,\n"
            "    password: submitted && password.length < 8 ? 'Mật khẩu phải có ít nhất 8 ký tự' : undefined,\n"
            "  };",
        ),
        (
            "sub",
            "    if (!fullName.trim()) {\n"
            "      setLocalError('Vui lòng nhập họ và tên');\n"
            "      return;\n"
            "    }\n"
            "    if (!email.trim() || !email.includes('@')) {\n"
            "      setLocalError('Vui lòng nhập email hợp lệ');\n"
            "      return;\n"
            "    }\n"
            "    if (password.length < 8) {\n"
            "      setLocalError('Mật khẩu phải có ít nhất 8 ký tự');\n"
            "      return;\n"
            "    }",
            "    setSubmitted(true);\n"
            "    if (!fullName.trim() || !email.trim() || !email.includes('@') || password.length < 8) return;",
        ),
        (
            "sub",
            "        contentContainerStyle={styles.content}\n        showsVerticalScrollIndicator={false}",
            "        contentContainerStyle={styles.content}\n"
            "        keyboardShouldPersistTaps=\"handled\"\n"
            "        showsVerticalScrollIndicator={false}",
        ),
        (
            "sub",
            "            <Text style={styles.fieldLabel}>Họ Tên</Text>\n            <View style={styles.inputContainer}>",
            "            <Text style={styles.fieldLabel}>Họ Tên</Text>\n"
            "            <View style={[styles.inputContainer, errs.fullName && styles.inputError]}>",
        ),
        (
            "sub",
            "            </View>\n          </View>\n\n          <View style={styles.fieldGroup}>\n            <Text style={styles.fieldLabel}>Email</Text>",
            "            </View>\n"
            "            {errs.fullName ? <Text style={styles.fieldError}>{errs.fullName}</Text> : null}\n"
            "          </View>\n\n          <View style={styles.fieldGroup}>\n            <Text style={styles.fieldLabel}>Email</Text>",
        ),
        (
            "sub",
            "            <Text style={styles.fieldLabel}>Email</Text>\n            <View style={styles.inputContainer}>",
            "            <Text style={styles.fieldLabel}>Email</Text>\n"
            "            <View style={[styles.inputContainer, errs.email && styles.inputError]}>",
        ),
        (
            "sub",
            "            </View>\n          </View>\n\n          <View style={styles.fieldGroup}>\n            <Text style={styles.fieldLabel}>Mật khẩu</Text>",
            "            </View>\n"
            "            {errs.email ? <Text style={styles.fieldError}>{errs.email}</Text> : null}\n"
            "          </View>\n\n          <View style={styles.fieldGroup}>\n            <Text style={styles.fieldLabel}>Mật khẩu</Text>",
        ),
        (
            "sub",
            "            <Text style={styles.fieldLabel}>Mật khẩu</Text>\n            <View style={styles.inputContainer}>",
            "            <Text style={styles.fieldLabel}>Mật khẩu</Text>\n"
            "            <View style={[styles.inputContainer, errs.password && styles.inputError]}>",
        ),
        (
            "sub",
            "            </View>\n            <Text style={styles.hintText}>Sử dụng ít nhất 8 ký tự cho mật khẩu.</Text>",
            "            </View>\n"
            "            {errs.password ? <Text style={styles.fieldError}>{errs.password}</Text> : null}\n"
            "            <Text style={styles.hintText}>Sử dụng ít nhất 8 ký tự cho mật khẩu.</Text>",
        ),
        ("sub", "  eyeBtn: { padding: 4 },", FIELD_STYLES),
    ],
    # ---------------- Phiên hết hạn (R6)
    "client/src/store/authStore.ts": [
        (
            "sub",
            "  isProfileOpen: boolean;\n  init: () => Promise<void>;",
            "  isProfileOpen: boolean;\n  sessionExpired: boolean;\n  expireSession: () => Promise<void>;\n  init: () => Promise<void>;",
        ),
        (
            "suball",
            "set({ status: 'signedIn', email: s.email, name: s.name ?? null, busy: false });",
            "set({ status: 'signedIn', email: s.email, name: s.name ?? null, busy: false, sessionExpired: false });",
        ),
        (
            "sub",
            "    set({ status: 'signedOut', email: null, name: null, error: null, isProfileOpen: false });",
            "    set({ status: 'signedOut', email: null, name: null, error: null, isProfileOpen: false, sessionExpired: false });",
        ),
        (
            "sub",
            "  openProfile: () => set({ isProfileOpen: true }),",
            "  sessionExpired: false,\n"
            "  // Server trả 401: đăng xuất và báo \"phiên đã hết hạn\" ở màn đăng nhập. Dữ liệu tủ đồ trên máy giữ nguyên.\n"
            "  expireSession: async () => {\n"
            "    await Auth.signOut();\n"
            "    set({ status: 'signedOut', email: null, name: null, error: null, isProfileOpen: false, sessionExpired: true });\n"
            "  },\n\n"
            "  openProfile: () => set({ isProfileOpen: true }),",
        ),
    ],
    "client/app/_layout.tsx": [
        (
            "sub",
            "setUnauthorizedHandler(() => useAuthStore.getState().signOut());",
            "setUnauthorizedHandler(() => useAuthStore.getState().expireSession());",
        ),
    ],
    # ---------------- Thông báo lỗi mạng bằng tiếng người (R7)
    "client/src/api/client.ts": [
        (
            "sub",
            "throw new ApiError(0, `Server phản hồi quá chậm (> ${timeoutMs / 1000}s)`);",
            "throw new ApiError(0, 'Máy chủ phản hồi quá chậm. Hãy thử lại.');",
        ),
        (
            "sub",
            "throw new ApiError(0, `Không kết nối được server: [${e?.name || 'Error'}] ${e?.message || 'Lỗi mạng'}`);",
            "throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');",
        ),
    ],
    # ---------------- Sự kiện: WeatherService có thể trả null
    "client/app/events.tsx": [
        (
            "sub",
            "const weather = await WeatherService.getCurrentWeather().catch(() => WeatherService.getDefaultWeather());",
            "const weather =\n"
            "        (await WeatherService.getCurrentWeather().catch(() => null)) ?? WeatherService.getDefaultWeather();",
        ),
    ],
    # ---------------- Xác nhận mặc: chống bấm đúp
    "client/app/outfit-detail.tsx": [
        (
            "sub",
            "  const [seenOutfits, setSeenOutfits] = useState<Set<string>>(new Set());",
            "  const [seenOutfits, setSeenOutfits] = useState<Set<string>>(new Set());\n"
            "  const [confirming, setConfirming] = useState(false);",
        ),
        (
            "sub",
            "    const ids = currentItems.map((i) => Number(i.id)).filter((n) => Number.isFinite(n));",
            "    if (confirming || currentItems.length === 0) return;\n"
            "    setConfirming(true);\n"
            "    const ids = currentItems.map((i) => Number(i.id)).filter((n) => Number.isFinite(n));",
        ),
        (
            "sub",
            "console.warn('[outfit-detail] Lưu lịch sử thất bại:', e);",
            "console.warn('[outfit-detail] Lưu lịch sử thất bại:', e);\n      setConfirming(false);",
        ),
        (
            "sub",
            "<Pressable style={styles.confirmBtn} onPress={handleConfirmWear}>",
            "<Pressable\n"
            "          style={[styles.confirmBtn, confirming && { opacity: 0.6 }]}\n"
            "          onPress={handleConfirmWear}\n"
            "          disabled={confirming}\n"
            "        >",
        ),
    ],
    # ---------------- Quyền Camera/Vị trí khai trong app.json (cần build lại APK)
    # ---------------- Quyền Camera/Vị trí khai trong app.json (cần build lại APK)
        "client/app.json": [
            (
                "sub",
                '      "@react-native-google-signin/google-signin",',
                '      "@react-native-google-signin/google-signin",\n'
                '      [\n'
                '        "expo-image-picker",\n'
                '        {\n'
                '          "cameraPermission": "Closy cần máy ảnh để chụp trang phục của bạn.",\n'
                '          "photosPermission": "Closy cần truy cập thư viện để bạn chọn ảnh trang phục."\n'
                '        }\n'
                '      ],\n'
                '      [\n'
                '        "expo-location",\n'
                '        {\n'
                '          "locationWhenInUsePermission": "Closy dùng vị trí để xem thời tiết."\n'
                '        }\n'
                '      ],',
            ),
        ],
    # ---------------- Engine: export hàm phân loại để dùng cho thông báo thiếu danh mục
    "client/src/engine/suggest.ts": [
        ("sub", "const isDress = (it: WardrobeItem) =>", "export const isDress = (it: WardrobeItem) =>"),
        ("sub", "const isTop = (it: WardrobeItem) =>", "export const isTop = (it: WardrobeItem) =>"),
        ("sub", "const isBottom = (it: WardrobeItem) =>", "export const isBottom = (it: WardrobeItem) =>"),
    ],
}


def apply_ops(text, ops):
    log = []
    for op in ops:
        kind = op[0]
        if kind == "sub":
            text, st = sub(text, op[1], op[2])
        elif kind == "suball":
            text, st = sub(text, op[1], op[2], count=0)
        elif kind == "between":
            text, st = between(text, op[1], op[2], op[3], op[4])
        else:
            raise PatchError("loại thao tác lạ: " + kind)
        log.append(st)
    return text, log


def main():
    failed = []
    changed = 0
    print(f"Repo: {ROOT}  ({'CHỈ KIỂM TRA' if CHECK else 'ÁP DỤNG'})\n")

    for rel, ops in PATCHES.items():
        path = ROOT / rel
        if not path.exists():
            print(f"[THIẾU]  {rel}: không có file này")
            failed.append(rel)
            continue
        original = path.read_text(encoding="utf-8")
        try:
            new_text, log = apply_ops(original, ops)
        except PatchError as e:
            print(f"[LỖI]    {rel}: {e}")
            failed.append(rel)
            continue
        applied = log.count("ok")
        if new_text == original:
            print(f"[BỎ QUA] {rel}: đã vá đủ")
            continue
        print(f"[OK]     {rel}: {applied}/{len(ops)} chỗ ({len(ops) - applied} đã vá sẵn)")
        changed += 1
        if not CHECK:
            path.write_text(new_text, encoding="utf-8")

    # Chép file mới (và ghi đè WeatherService.ts)
    files_dir = KIT / "files"
    for src in sorted(p for p in files_dir.rglob("*") if p.is_file()):
        rel = src.relative_to(files_dir)
        dst = ROOT / rel
        same = dst.exists() and dst.read_bytes() == src.read_bytes()
        verb = "bỏ qua (giống hệt)" if same else ("ghi đè" if dst.exists() else "tạo mới")
        print(f"[FILE]   {rel}: {verb}")
        if not same and not CHECK:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)

    print()
    if failed:
        print("CÓ FILE KHÔNG VÁ ĐƯỢC (code khác với bản mẫu): " + ", ".join(failed))
        print("Các file đó chưa bị sửa. Xem dòng [LỖI] ở trên để sửa tay theo README-PATCH.md.")
        sys.exit(1)
    print("Xong." if not CHECK else "Kiểm tra xong: mọi chỗ sửa đều khớp.")


if __name__ == "__main__":
    main()
