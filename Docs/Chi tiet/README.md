# Mục lục tài liệu Closy

> Cập nhật: 25/11/2026. Tài liệu này khớp với code ở nhánh `main` tại thời điểm cập nhật. Nếu bạn thấy chỗ lệch, **sửa tài liệu trong cùng Pull Request** với code.

Đây là **nguồn tài liệu duy nhất** của dự án (không còn `Docs/README.md` hay `Docs/setup.md`). README ở thư mục gốc repo chỉ là cổng vào ngắn, trỏ về đây.

## Bạn muốn làm gì?

| Mục tiêu | Đọc |
| :--- | :--- |
| Hiểu app làm gì, có những màn hình nào | [01-Tong-quan.md](01-Tong-quan.md) |
| Cài đặt và chạy được app, server, test | [02-Cai-dat-va-chay.md](02-Cai-dat-va-chay.md) |
| Hiểu code được tổ chức ra sao, chỗ nào sửa gì | [03-Kien-truc.md](03-Kien-truc.md) |
| Gặp lỗi lạ | [04-Su-co-thuong-gap.md](04-Su-co-thuong-gap.md) |
| Build APK, giao cho người khác dùng thử | [05-Build-APK-va-giao-khach.md](05-Build-APK-va-giao-khach.md) |
| Biết cái gì xong, cái gì chưa, nên làm gì tiếp, dọn repo | [06-Tinh-trang-va-no-ky-thuat.md](06-Tinh-trang-va-no-ky-thuat.md) |
| Cách làm việc: thêm màn hình, endpoint, migration, test | [07-Quy-uoc-phat-trien.md](07-Quy-uoc-phat-trien.md) |
| Vì sao chọn như vậy | [DECISIONS.md](DECISIONS.md) |
| Thiết kế thông báo nhắc sự kiện (chưa code) | [Design-Notifications.md](Design-Notifications.md) |
| Số liệu đo thời gian tách nền | [Benchmark.md](Benchmark.md) |

## Ngày đầu tiên (khoảng 1–2 giờ)

- [ ] Clone repo, chạy server và web theo `README.md` ở gốc
- [ ] Đăng ký tài khoản bằng email, thêm 3 món đồ (áo, quần, giày)
- [ ] Vào màn Hôm nay: chọn bối cảnh, xem 3 bộ gợi ý kèm lý do
- [ ] Mở một bộ → Khóa một món → Đổi → Xác nhận mặc → xem tab Lịch sử
- [ ] Chạy `npx tsc --noEmit && npm test` (client) và `pytest -q` (server)
- [ ] Đọc `03-Kien-truc.md`, rồi chọn một việc ở mục "Việc dễ làm cho người mới" trong `06-Tinh-trang-va-no-ky-thuat.md`

## Quy tắc giữ tài liệu không loạn lại

1. Thư mục là **`Docs/Chi tiet/`** (chữ D hoa, có khoảng trắng). Linux phân biệt hoa thường; link có khoảng trắng phải viết `Chi%20tiet`.
2. Mỗi chủ đề **một nơi duy nhất**. Cách chạy ở file 02, kiến trúc ở file 03, lỗi ở file 04. Đừng chép lại sang file khác, hãy đặt link.
3. Tài liệu hết đúng thì chuyển vào `Docs/Archive/` kèm cảnh báo ở đầu file, đừng để cạnh tài liệu đang dùng.
4. Không ghi bí mật (JWT_SECRET, token, mật khẩu) vào tài liệu hay code.
5. Các con số kiểm tra (số test, thời gian đo) sẽ đổi: ghi ngày, và khuyến khích chạy lại.
