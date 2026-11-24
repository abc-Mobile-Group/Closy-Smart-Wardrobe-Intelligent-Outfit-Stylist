# 03. Changelog so với Assignment 1

> Cột "Trước" suy ra từ Backlog v2 (`Docs/Backlog.md`) vì người soạn chưa thấy bản Assignment 1. **Hãy đối chiếu từng dòng với Assignment 1 thật** và sửa cột "Trước" cho đúng trước khi nộp.

| # | Thay đổi | Trước | Sau | Lý do |
|---|---|---|---|---|
| 1 | **Thêm luồng Đăng ký / Đăng nhập** (màn hình 1, 2) | Chỉ đăng nhập Gmail | Đăng nhập Google và email + mật khẩu | Server cần tài khoản. Google Sign-In không chạy trong Expo Go nên cần phương án email để thử trên máy thật và bản web |
| 2 | **Thêm Lịch sử mặc đồ** (màn hình 9) | Chưa có | Lịch tháng, xem bộ đã mặc theo ngày | Nút "Xác nhận mặc" cần có nơi lưu. Dữ liệu `last_worn`, `wear_count` là nền cho tiêu chí **Reuse** (nhắc đồ bị lãng quên) |
| 3 | **Thêm Cài đặt & Minh bạch quyền riêng tư** (màn hình 10) | Chỉ có hộp Hồ sơ | Màn hình riêng | Người dùng cần biết dữ liệu nào ở máy, dữ liệu nào gửi đi; có đường xóa dữ liệu và đăng xuất |
| 4 | **Mở rộng danh mục** | Áo, Quần/Váy | Áo, Quần, Váy, **Đầm, Giày** | Đầm là bộ độc lập; giày làm bộ đồ hoàn chỉnh |
| 5 | **Gợi ý chạy trên máy (local-first)** | Server hoặc không rõ | Engine tính trên thiết bị, không gửi dữ liệu tủ đồ lên server | Đúng cam kết riêng tư, chạy được khi mất mạng, nhanh hơn |
| 6 | **Giải thích lý do gợi ý** | Chỉ ghi nhãn màu | Mỗi bộ kèm 2–4 lý do (màu, độ lịch sự, thời tiết, dùng lại đồ cũ) | Người dùng tin và hiểu vì sao được gợi ý |
| 7 | **Khóa / Đổi món** | Có trong kế hoạch | Có trong sản phẩm, có test | Cho người dùng quyền quyết định |
| 8 | **Thời tiết (Open-Meteo, GPS)** | Để sau | Có, và có trạng thái không có GPS/mất mạng | Gợi ý hợp trời nóng/lạnh/mưa |
| 9 | **AI nhận diện loại đồ** | Chỉ tách nền + lấy màu | Thêm nhận diện loại, tên, độ lịch sự, dịp; từ chối ảnh không phải trang phục | Giảm số chạm nhập liệu (mục tiêu ≤ 4 chạm) |
| 10 | **Trạng thái tương tác và lỗi** | Chưa thiết kế đủ | Loading, Empty, Error & Recovery, Offline/No GPS, Permission & Success | Yêu cầu Assignment 2 và trải nghiệm thực tế |
| 11 | **Thống kê, Sự kiện quan trọng** | Giai đoạn sau | Đã có code, **ngoài MVP trên Figma** | **[Nhóm chốt: đưa vào Phase 2 hay bỏ khỏi phạm vi nộp]** |

## Thay đổi về tài liệu
| Tài liệu | Thay đổi |
|---|---|
| Problem Statement / Target Users / UVP / MVP | Viết lại, xem `01-Product-Refinement.md` |
| User Flows | Vẽ lại 5 flow, khớp Figma, xem `02-User-Flows.md` |
| AI Disclosure | Mới, xem `04-AI-Disclosure.md` |
