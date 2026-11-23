# Nghiệm thu Sprint 3 và 4

## Sprint 3
| UC | Việc | Nơi làm |
|---|---|---|
| UC3 | Chọn bối cảnh, engine local tính điểm, 3 bộ kèm lý do | `engine/suggest.ts`, `OutfitService`, màn Hôm nay + Phối đồ |
| UC4 | Khóa món / Đổi (loại bộ đã xem, nhiễu ngẫu nhiên nhỏ) | `engine/swap.ts`, `outfit-detail.tsx` |
| UC5 | Xác nhận mặc → bảng `history`, cập nhật `last_worn`, `wear_count` | `HistoryService`, `history.tsx` |

Công thức: `Tổng = Màu + Trang trọng + Đồng bộ + Tái sử dụng (+ thời tiết)`
- Màu: trung tính/tương đồng +3, tương phản +2, xung đột −2 (nhân 10); bộ xung đột bị loại nếu còn bộ khác.
- Trang trọng: −8 mỗi bậc lệch so với mức mong muốn (học 2, làm 3, hẹn hò 3, chơi 2, sự kiện 5).
- Đồng bộ: −5 mỗi bậc chênh giữa áo và quần.
- Tái sử dụng: +10 nếu có món ≥ 14 ngày chưa mặc, chỉ khi bộ đã đạt (điểm màu ≥ 2).

Nghiệm thu:
- [ ] Chọn bối cảnh → có 2–3 bộ trong < 3 giây, tắt mạng vẫn chạy
- [ ] Mỗi bộ hiện lý do
- [ ] Khóa 1 món → bấm Đổi → món khóa giữ nguyên, bộ mới khác bộ đã xem
- [ ] Xác nhận mặc → hiện trong Lịch sử đúng ngày, `wear_count` tăng

## Sprint 4
| UC | Việc | Nơi làm |
|---|---|---|
| UC6 | Thống kê lần mặc, đồ ít dùng, đề xuất tái sử dụng / cho đi | `InsightService.analyzeUsage`, tab Thống kê |
| UC7 | Lưu ngày + loại sự kiện, đến lúc gọi engine bối cảnh "Sự kiện quan trọng" (mức 5) | `EventService`, `events.tsx`, thẻ ở màn Hôm nay |
| UC8 | Phân tích tủ còn thiếu gì | `InsightService.analyzeGaps`, tab Thống kê |
| Thiết kế | Lịch, thông báo nhắc | `docs/NOTIFICATIONS.md` (chưa code) |

Ngưỡng UC6: ít dùng khi ≥ 30 ngày chưa mặc, hoặc chưa mặc lần nào sau 14 ngày; đề xuất cho đi khi ≥ 120 ngày. Chỉnh ở đầu `InsightService.ts` theo dữ liệu thật.

Nghiệm thu:
- [ ] Tab Thống kê hiện số liệu đúng sau vài lần xác nhận mặc
- [ ] "Phối ngay" mở bộ đồ có chứa món bị bỏ quên
- [ ] Thêm sự kiện, đóng mở app còn; "Lên đồ" cho bộ trang trọng nhất
- [ ] Tủ thiếu giày/quần/đồ trang trọng thì có cảnh báo
