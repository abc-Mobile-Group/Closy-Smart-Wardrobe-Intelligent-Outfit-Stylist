# 01. Tổng quan sản phẩm

## 1. Closy là gì?
Ứng dụng quản lý tủ đồ cá nhân và gợi ý phối đồ cho người trẻ 18–26 tuổi.
Vấn đề: có nhiều quần áo nhưng vẫn "không biết mặc gì", mất thời gian chọn, bỏ quên đồ cũ.
Chi tiết nghiên cứu, người dùng mục tiêu, so sánh đối thủ nằm ở **Wiki** của repo (tài liệu môn học). Tài liệu này chỉ nói về phần kỹ thuật.

**Slogan:** *Ít phân vân hơn. Đúng chất bạn hơn.*

## 2. Luồng chính của người dùng

```
Đăng ký / Đăng nhập → Thêm món đồ (chụp hoặc chọn ảnh) → Chọn bối cảnh
   → Xem tối đa 3 bộ gợi ý kèm lý do → Khóa món thích / Đổi món khác
   → Xác nhận mặc → Xem lại ở tab Lịch sử
```

Mục tiêu trải nghiệm: thêm một món trong ≤ 4 chạm sau khi chọn ảnh; chốt một bộ trong < 20 giây sau khi chọn bối cảnh (chưa đo chính thức, xem `Benchmark.md`).

## 3. Các màn hình và file tương ứng

| Màn hình | File (trong `client/app/`) | Việc chính |
| :--- | :--- | :--- |
| Đăng nhập | `login.tsx` | Email + mật khẩu, hoặc Google (chỉ trên bản build) |
| Đăng ký | `register.tsx` | Họ tên, email, mật khẩu ≥ 8 ký tự |
| Bắt đầu cùng Closy | `onboarding.tsx` | Giới thiệu, chọn phong cách (**chưa được lưu**) |
| Hôm nay của bạn | `(tabs)/today.tsx` | Thời tiết, chọn bối cảnh, gợi ý, nhắc món lâu chưa mặc, thẻ sự kiện |
| Tủ đồ | `(tabs)/wardrobe.tsx` | Lưới món đồ, lọc, tìm kiếm, xem/sửa/xóa món |
| Thêm món đồ | `add-item.tsx` | Chụp/chọn ảnh → tách nền AI → xác nhận thuộc tính → lưu |
| Gợi ý phối đồ | `(tabs)/suggest.tsx` | Chọn bối cảnh, xem bộ tốt nhất và các bộ khác |
| Điều chỉnh bộ đồ | `outfit-detail.tsx` | Khóa/Đổi món, Xác nhận mặc |
| Lịch sử mặc đồ | `(tabs)/history.tsx` | Lịch tháng, bộ đã mặc theo ngày |
| Thống kê *(Phase 2)* | `(tabs)/insights.tsx` | Đồ ít dùng, tủ còn thiếu gì |
| Sự kiện quan trọng *(Phase 2)* | `events.tsx` | Lưu ngày sự kiện, lên đồ trang trọng |
| Hồ sơ (hộp thoại) | `src/components/ProfileModal.tsx` | Đổi tên, đăng xuất |
| Chi tiết món (hộp thoại) | `src/components/ItemDetailModal.tsx` | Sửa danh mục, màu, độ lịch sự, dịp |

Tab `add` (`(tabs)/add.tsx`) là màn giữ chỗ bị ẩn khỏi thanh tab; màn thêm món thật là `add-item.tsx`.

## 4. Phạm vi

| | Nội dung |
| :--- | :--- |
| **MVP (trong Figma)** | Đăng ký/đăng nhập, onboarding, Hôm nay, Tủ đồ, Thêm món, Gợi ý, Điều chỉnh bộ, Lịch sử, Cài đặt & quyền riêng tư (mới ở mức thiết kế) |
| **Phase 2 (đã có code, ngoài Figma)** | Thống kê tủ đồ, Sự kiện quan trọng |
| **Chưa làm** | Kho mẫu Capsule Basics, Like/Dislike học gu, lưu phong cách onboarding, màn Cài đặt, thông báo nhắc sự kiện |
| **Không làm** | Avatar 3D, gợi ý theo số đo/kiểu tóc, đồng bộ Google Calendar |

Danh sách chi tiết và lý do: [06-Tinh-trang-va-no-ky-thuat.md](06-Tinh-trang-va-no-ky-thuat.md).

## 5. Từ điển thuật ngữ

| Thuật ngữ | Nghĩa trong dự án |
| :--- | :--- |
| **Local-first** | Dữ liệu tủ đồ, lịch sử và việc tính gợi ý nằm trên điện thoại; app dùng được khi mất mạng |
| **Bối cảnh** | Đi học, Đi làm, Đi chơi, Hẹn hò (+ "Sự kiện quan trọng" ở Phase 2) |
| **Độ lịch sự (formality)** | 1 = thoải mái, 3 = gọn gàng, 5 = trang trọng |
| **Bộ đồ (outfit)** | `two_piece` = áo + quần/váy (+ giày), hoặc `one_piece` = đầm (+ giày) |
| **Color Harmony** | Chấm điểm cặp màu theo HSL: trung tính, tương đồng, tương phản, xung đột |
| **Lock / Swap** | Khóa món giữ nguyên / đổi các món còn lại |
| **JWT** | Token đăng nhập server cấp, hạn 7 ngày, lưu trong SecureStore |
| **rembg** | Thư viện tách nền ảnh (model U2Net) chạy trên server |
| **Ollama / Gemma** | Mô hình AI chạy trên máy host, nhận diện loại đồ; **không bắt buộc** |
| **Tunnel (Cloudflare)** | Cho điện thoại gọi tới server ở laptop qua link HTTPS; link miễn phí **đổi mỗi lần chạy lại** |
| **Development build** | APK có sẵn native module (Google Sign-In) để chạy `expo start --dev-client`; khác với Expo Go |
| **Migration** | Cập nhật cấu trúc SQLite trên máy người dùng theo phiên bản (`PRAGMA user_version`) |
