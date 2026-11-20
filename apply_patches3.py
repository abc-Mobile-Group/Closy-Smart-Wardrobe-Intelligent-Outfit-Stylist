"""Chạy ở thư mục GỐC repo:  python apply_patches3.py
Đoạn nào không khớp sẽ được báo và file đó không bị ghi."""
import sys
from pathlib import Path

P = []

# Tab "Thống kê"
P.append(("client/app/(tabs)/_layout.tsx", [
 ('      <Tabs.Screen\n        name="add"',
  """      <Tabs.Screen
        name="insights"
        options={{
          title: 'Thống kê',
          headerShown: false,
          tabBarIcon: renderIcon('stats-chart-outline', 'stats-chart'),
        }}
      />
      <Tabs.Screen
        name="add\""""),
]))

# Route /events
P.append(("client/app/_layout.tsx", [
 ("      </Stack>\n      <ProfileModal",
  """        <Stack.Screen
          name="events"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      <ProfileModal"""),
]))

# outfit-detail: bối cảnh Sự kiện quan trọng
P.append(("client/app/outfit-detail.tsx", [
 ("      case 'Đi học':\n      default:",
  "      case 'Sự kiện quan trọng':\n        return { text: 'Chỉn chu cho dịp quan trọng', icon: 'ribbon-outline' as const };\n      case 'Đi học':\n      default:"),
]))

# Màn Hôm nay: lý do gợi ý + thẻ sự kiện sắp tới
P.append(("client/app/(tabs)/today.tsx", [
 ("import { WeatherData, WeatherService } from '../../src/services/WeatherService';\n",
  "import { WeatherData, WeatherService } from '../../src/services/WeatherService';\nimport { EventService, PlannedEvent } from '../../src/services/EventService';\nimport { daysUntil } from '../../src/utils/eventDate';\n"),
 ("  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);\n",
  "  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);\n  const [nextEvent, setNextEvent] = useState<PlannedEvent | null>(null);\n"),
 ("  useFocusEffect(\n    useCallback(() => {\n      loadItems();\n    }, [])\n  );",
  """  useFocusEffect(
    useCallback(() => {
      loadItems();
      EventService.listUpcoming()
        .then((list) => setNextEvent(list[0] ?? null))
        .catch(() => setNextEvent(null));
    }, [])
  );"""),
 ("                {/* CTA Button */}",
  """                {currentOutfit.reasons && currentOutfit.reasons.length > 0 && (
                  <View style={styles.reasonBox}>
                    {currentOutfit.reasons.map((r, i) => (
                      <View key={i} style={styles.reasonRow}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                        <Text style={styles.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* CTA Button */}"""),
 ("        {/* Lâu rồi chưa mặc nhỉ? */}",
  """        {/* Sự kiện quan trọng */}
        <Pressable style={styles.eventCard} onPress={() => router.push('/events')}>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>
              {nextEvent
                ? `${nextEvent.type} · ${daysUntil(nextEvent.date) === 0 ? 'hôm nay' : 'còn ' + daysUntil(nextEvent.date) + ' ngày'}`
                : 'Có sự kiện quan trọng?'}
            </Text>
            <Text style={styles.eventDesc}>
              {nextEvent ? nextEvent.note || 'Chạm để lên đồ cho sự kiện' : 'Lưu ngày và nhờ Closy lên đồ trang trọng.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>

        {/* Lâu rồi chưa mặc nhỉ? */}"""),
 ("  // Reminder Card\n  reminderCard: {",
  """  // Reasons
  reasonBox: { gap: 4 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasonText: { flex: 1, fontSize: 12, color: colors.textMuted },

  // Event Card
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  eventDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // Reminder Card
  reminderCard: {"""),
]))

# Màn Phối đồ: lý do gợi ý
P.append(("client/app/(tabs)/suggest.tsx", [
 ("                <Text style={styles.outfitDesc}>{mainOutfit.subtitle}</Text>\n",
  """                <Text style={styles.outfitDesc}>{mainOutfit.subtitle}</Text>
                {mainOutfit.reasons && mainOutfit.reasons.length > 0 && (
                  <View style={styles.reasonBox}>
                    {mainOutfit.reasons.map((r, i) => (
                      <View key={i} style={styles.reasonRow}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                        <Text style={styles.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}
"""),
 ("  // Actions\n  actionRow: {",
  "  // Reasons\n  reasonBox: { gap: 4, marginTop: 4 },\n  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },\n  reasonText: { flex: 1, fontSize: 12, color: colors.textMuted },\n\n  // Actions\n  actionRow: {"),
]))

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
