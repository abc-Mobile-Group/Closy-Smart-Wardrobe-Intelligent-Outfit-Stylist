"""Chạy ở thư mục GỐC repo:  python apply_patches.py
Mỗi bản vá thay đúng 1 đoạn text. Đoạn nào không khớp sẽ được báo, không ghi đè file."""
import sys
from pathlib import Path

P = []  # (file, [(old, new), ...])

# ───────────────────────── server/main.py ─────────────────────────
P.append(("server/main.py", [
 ("import hashlib\nimport io\n", "import hashlib\nimport hmac\nimport io\n"),
 ("from PIL import Image\nfrom pydantic import BaseModel\n",
  "from PIL import Image\nfrom pydantic import BaseModel\nfrom starlette.concurrency import run_in_threadpool\n"),
 ("MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB\n",
  "MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB\nImage.MAX_IMAGE_PIXELS = 40_000_000  # chặn decompression bomb\n"
  "ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(\"ALLOWED_ORIGINS\", \"*\").split(\",\") if o.strip()]\n"),
 ("    allow_origins=[\"*\"],\n    allow_credentials=True,\n",
  "    allow_origins=ALLOWED_ORIGINS,\n    allow_credentials=False,\n"),
 ('    h = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()\n    return f"{salt}:{h}"\n',
  '    h = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERS).hex()\n    return f"pbkdf2${PBKDF2_ITERS}${salt}${h}"\n'),
 ('        salt, h = stored_hash.split(":")\n        check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()\n        return h == check\n',
  '        if stored_hash.startswith("pbkdf2$"):\n            _, iters, salt, h = stored_hash.split("$")\n            iters = int(iters)\n        else:  # định dạng cũ salt:hash\n            salt, h = stored_hash.split(":")\n            iters = 100_000\n'
  '        check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iters).hex()\n        return hmac.compare_digest(h, check)\n'),
 ("def hash_password(password: str) -> str:\n",
  'PBKDF2_ITERS = 210_000\n\n# Rate-limit đăng nhập sai (in-memory, đủ cho 1 instance)\n_FAILS: dict[str, list[float]] = {}\n\n\n'
  'def _rate_check(key: str, limit: int = 5, window: int = 300):\n    now = time.time()\n    hits = [t for t in _FAILS.get(key, []) if now - t < window]\n    _FAILS[key] = hits\n'
  '    if len(hits) >= limit:\n        raise HTTPException(429, "Sai quá nhiều lần, vui lòng thử lại sau 5 phút")\n\n\n'
  'def hash_password(password: str) -> str:\n'),
 ('        raise HTTPException(400, "Vui lòng nhập email")\n',
  '        raise HTTPException(400, "Vui lòng nhập email")\n    _rate_check(email)\n'),
 ('        raise HTTPException(401, "Email hoặc mật khẩu không chính xác")\n\n    expires_at',
  '        _FAILS.setdefault(email, []).append(time.time())\n        raise HTTPException(401, "Email hoặc mật khẩu không chính xác")\n    _FAILS.pop(email, None)\n\n    expires_at'),
 ('''    con = get_db()
    try:
        con.execute(
            "INSERT OR IGNORE INTO users(google_sub, email, name, created_at) VALUES(?,?,?,?)",
            (info["sub"], info.get("email"), info.get("name"), time.time()),
        )
        con.commit()
        uid = con.execute(
            "SELECT id FROM users WHERE google_sub=?", (info["sub"],)
        ).fetchone()["id"]
    finally:
        con.close()
''', '''    sub = info["sub"]
    g_email = (info.get("email") or "").strip().lower() or None

    con = get_db()
    try:
        row = con.execute("SELECT id FROM users WHERE google_sub=?", (sub,)).fetchone()
        if not row and g_email:
            # Email đã đăng ký bằng mật khẩu: liên kết tài khoản (email Google đã được xác minh ở trên)
            row = con.execute("SELECT id FROM users WHERE email=?", (g_email,)).fetchone()
            if row:
                con.execute(
                    "UPDATE users SET google_sub=?, name=COALESCE(name, ?) WHERE id=?",
                    (sub, info.get("name"), row["id"]),
                )
        if row:
            uid = row["id"]
        else:
            cur = con.execute(
                "INSERT INTO users(google_sub, email, name, created_at) VALUES(?,?,?,?)",
                (sub, g_email, info.get("name"), time.time()),
            )
            uid = cur.lastrowid
        con.commit()
    finally:
        con.close()
'''),
 ("        transparent_bytes = rembg.remove(raw_bytes, session=session)\n",
  "        transparent_bytes = await run_in_threadpool(rembg.remove, raw_bytes, session=session)\n"),
 ("    color_res = extract_colors_from_rgba(transparent_image)\n",
  "    color_res = await run_in_threadpool(extract_colors_from_rgba, transparent_image)\n"),
 ('    classification = classify_clothing_with_ollama(raw_bytes, primary["name"], transparent_image)\n',
  '    classification = await run_in_threadpool(\n        classify_clothing_with_ollama, raw_bytes, primary["name"], transparent_image\n    )\n'),
 ("resp = requests.post(url, json=payload, timeout=30)", "resp = requests.post(url, json=payload, timeout=20)"),
 ("                except Exception:\n                    continue\n",
  "                except requests.ConnectionError:\n                    break  # host không kết nối được, sang host kế tiếp\n                except Exception:\n                    continue\n"),
 ("def suggest_outfits(body: OutfitSuggestRequest):",
  "def suggest_outfits(body: OutfitSuggestRequest, uid: int = Depends(current_user_id)):"),
 ("    raw_items = body.items\n",
  '    raw_items = body.items\n    if len(raw_items) > 200:\n        raise HTTPException(413, "Tủ đồ quá lớn để gợi ý (tối đa 200 món)")\n'),
 ("            outfit_items.insert(0, best_jacket)", "            outfit_items.append(best_jacket)  # đầm luôn là items[0]"),
]))

# ───────────────────────── client ─────────────────────────
P.append(("client/app/outfit-detail.tsx", [
 ("import { outfitHarmony, outfitSignature, swapOutfit } from '../src/engine/swap';\n",
  "import { outfitHarmony, outfitSignature, swapOutfit } from '../src/engine/swap';\nimport { HistoryService } from '../src/services/HistoryService';\n"),
 ("  const handleConfirmWear = () => {\n    router.replace('/(tabs)/history');\n  };\n",
  """  const handleConfirmWear = async () => {
    const ids = currentItems.map((i) => Number(i.id)).filter((n) => Number.isFinite(n));
    try {
      await HistoryService.confirmWear(ids, currentContext);
      await useWardrobeStore.getState().loadItems();
      router.replace({ pathname: '/(tabs)/history', params: { saved: '1' } });
    } catch (e) {
      console.warn('[outfit-detail] Lưu lịch sử thất bại:', e);
    }
  };
"""),
]))

P.append(("client/app/(tabs)/today.tsx", [
 ("import { OutfitService, SuggestedOutfit } from '../../src/services/OutfitService';\n",
  "import { OutfitService, SuggestedOutfit } from '../../src/services/OutfitService';\nimport { daysSince } from '../../src/utils/date';\n"),
 ("      const data = await WeatherService.getCurrentWeather();\n      setWeather(data);\n",
  "      const data = await WeatherService.getCurrentWeather();\n      setWeather((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));\n"),
 ("  const displayName = name || (email ? email.split('@')[0] : 'An');\n",
  """  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  }, []);

  const displayName = name || (email ? email.split('@')[0] : 'An');
"""),
 ("Chào buổi sáng, {displayName}!", "{greeting}, {displayName}!"),
 ("""  const reminderItem = useMemo(() => {
    if (items.length > 0) {
      const dbItem = items[items.length - 1];
      return {
        name: dbItem.name || `${dbItem.category} ${dbItem.color_name || ''}`.trim(),
        image: { uri: dbItem.image_path },
      };
    }
    return null;
  }, [items]);
""", """  const reminderItem = useMemo(() => {
    if (items.length === 0) return null;
    // Món chưa mặc bao giờ hoặc mặc lâu nhất
    const oldest = [...items].sort(
      (a, b) =>
        (a.last_worn ?? '').localeCompare(b.last_worn ?? '') ||
        a.created_at.localeCompare(b.created_at),
    )[0];
    const d = daysSince(oldest.last_worn);
    if (d !== null && d < 7) return null; // mới mặc gần đây thì không nhắc
    return {
      name: oldest.name || `${oldest.category} ${oldest.color_name || ''}`.trim(),
      image: { uri: oldest.image_path },
    };
  }, [items]);
"""),
]))

P.append(("client/app/(tabs)/suggest.tsx", [
 ("    WeatherService.getCurrentWeather().then(setWeather).catch(() => {});\n",
  "    WeatherService.getCurrentWeather()\n      .then((data) => setWeather((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data)))\n      .catch(() => {});\n"),
 ("""                        {mainOutfit.items[1] && (
                          <Image
                            source={mainOutfit.items[1].image}
                            style={styles.collageSingleLeft}
                            resizeMode="contain"
                          />
                        )}
                      </View>""",
  """                        {mainOutfit.items[1] && (
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
                      </View>"""),
]))

P.append(("client/src/components/ItemDetailModal.tsx", [
 ("  { id: 'Váy', label: 'Váy', icon: 'woman-outline' },\n  { id: 'Giày'",
  "  { id: 'Váy', label: 'Váy', icon: 'woman-outline' },\n  { id: 'Đầm', label: 'Đầm', icon: 'sparkles-outline' },\n  { id: 'Giày'"),
]))

P.append(("client/src/services/WeatherService.ts", [
 ("        cachedWeather = DEFAULT_WEATHER;\n        lastFetchTime = now;\n", ""),
 ("sử dụng fallback mặc định:', error);\n      cachedWeather = DEFAULT_WEATHER;\n      lastFetchTime = now;\n",
  "sử dụng fallback mặc định:', error);\n"),
]))

P.append(("client/src/services/WardrobeService.ts", [
 ("  static async deleteItem(id: number): Promise<void> {\n    return ItemRepository.delete(id);\n  }",
  "  static async deleteItem(id: number): Promise<void> {\n    const item = await ItemRepository.getById(id);\n    await ItemRepository.delete(id);\n    if (item) await FileRepository.deleteItemImage(item.image_path);\n  }"),
]))

P.append(("client/src/store/wardrobeStore.ts", [
 ("""      const items = await WardrobeService.getItems();
      set({ items, isLoading: false });""",
  """      const next = await WardrobeService.getItems();
      const prev = get().items;
      const same =
        prev.length === next.length &&
        prev.every((p, i) => {
          const n = next[i];
          return (
            p.id === n.id && p.name === n.name && p.category === n.category &&
            p.color_h === n.color_h && p.color_s === n.color_s && p.color_l === n.color_l &&
            p.formality === n.formality && p.contexts === n.contexts &&
            p.image_path === n.image_path && p.last_worn === n.last_worn
          );
        });
      // Không tạo mảng mới khi dữ liệu không đổi -> tránh gọi lại API gợi ý thừa
      set(same ? { isLoading: false } : { items: next, isLoading: false });"""),
]))

P.append(("client/app/login.tsx", [
 ("import {\n  ActivityIndicator,\n  Image,", "import {\n  ActivityIndicator,\n  Alert,\n  Image,"),
 ("onPress={() => router.replace('/(tabs)/today')}\n          >\n            <Ionicons name=\"logo-apple\"",
  "onPress={() => Alert.alert('Sắp có', 'Đăng nhập Apple sẽ có ở bản sau.')}\n          >\n            <Ionicons name=\"logo-apple\""),
 ("Email / Số điện thoại", "Email"),
 ("Nhập email hoặc số điện thoại", "Nhập email"),
]))

P.append(("client/src/components/ProfileModal.tsx", [
 ("import { useAuthStore } from '../store/authStore';\n",
  "import { useAuthStore } from '../store/authStore';\nimport { useWardrobeStore } from '../store/wardrobeStore';\n"),
 ("  const { email, name, busy, updateName, signOut } = useAuthStore();\n",
  "  const { email, name, busy, updateName, signOut } = useAuthStore();\n  const itemCount = useWardrobeStore((s) => s.items.length);\n"),
 ("7 món trang phục", "{itemCount} món trang phục"),
]))

# NestJS demo (nếu đã chuyển vào demo-nestjs/ thì đổi đường dẫn bên dưới)
for base in ("src/outfits/outfits.service.ts", "demo-nestjs/src/outfits/outfits.service.ts"):
    if Path(base).exists():
        P.append((base, [
          ("this.wardrobe.all(userId).filter((i) => i.occasions.includes(dto.occasion));",
           "this.wardrobe.all(userId).filter((i) => i.category === Category.SHOES || i.occasions.includes(dto.occasion));"),
        ]))

ok = bad = 0
for f, reps in P:
    p = Path(f)
    if not p.exists():
        print(f"✗ không thấy file: {f}"); bad += 1; continue
    s = p.read_text(encoding="utf-8")
    fails = []
    for old, new in reps:
        n = s.count(old)
        if n != 1:
            fails.append((n, old[:60].replace("\n", "⏎")))
            continue
        s = s.replace(old, new)
    if fails:
        bad += 1
        print(f"✗ {f}: KHÔNG ghi (không khớp):")
        for n, o in fails: print(f"    khớp {n} lần: {o}")
    else:
        p.write_text(s, encoding="utf-8"); ok += 1
        print(f"✓ {f}")
print(f"\nXong: {ok} file đã vá, {bad} file lỗi.")
sys.exit(1 if bad else 0)
