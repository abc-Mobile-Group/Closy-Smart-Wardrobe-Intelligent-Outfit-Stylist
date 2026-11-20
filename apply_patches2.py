"""Chạy ở thư mục GỐC repo:  python apply_patches2.py"""
import sys
from pathlib import Path

P = [
("client/app/(tabs)/wardrobe.tsx", [
 ("          ListFooterComponent={\n            <View style={styles.footerNote}>",
  """          ListHeaderComponent={
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
            ) : null
          }
          ListFooterComponent={
            <View style={styles.footerNote}>"""),
 ("  // Footer\n  footerNote: {",
  """  // Empty state
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
  footerNote: {"""),
]),
("client/package.json", [
 ('    "lint": "expo lint"\n  },\n  "private": true',
  '    "lint": "expo lint",\n    "test": "jest"\n  },\n  "jest": {\n    "preset": "jest-expo"\n  },\n  "private": true'),
]),
(".github/workflows/ci.yml", [
 ("      - run: npx tsc --noEmit\n", "      - run: npx tsc --noEmit\n      - run: npm test -- --ci\n"),
]),
]

ok = bad = 0
for f, reps in P:
    p = Path(f)
    if not p.exists():
        print(f"✗ không thấy file: {f}"); bad += 1; continue
    s = p.read_text(encoding="utf-8"); fails = []
    for old, new in reps:
        n = s.count(old)
        if n != 1: fails.append((n, old[:60].replace("\n", "⏎"))); continue
        s = s.replace(old, new)
    if fails:
        bad += 1; print(f"✗ {f}: KHÔNG ghi:")
        for n, o in fails: print(f"    khớp {n} lần: {o}")
    else:
        p.write_text(s, encoding="utf-8"); ok += 1; print(f"✓ {f}")
print(f"\nXong: {ok} file đã vá, {bad} lỗi.")
sys.exit(1 if bad else 0)
