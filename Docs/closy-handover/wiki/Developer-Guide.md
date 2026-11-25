# 🛠️ Hướng dẫn tiếp quản dự án (dành cho dev mới)

Trang này là **cổng vào** cho người mới. Tài liệu kỹ thuật đầy đủ nằm trong thư mục [`Docs/`](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/tree/main/Docs) của repo, để cập nhật cùng code.

## Bắt đầu trong 5 phút
1. Đọc [`README.md`](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist#readme) ở gốc repo, chạy thử server + web theo mục "Chạy thử nhanh nhất".
2. Đọc **Docs/README.md** để có lộ trình ngày đầu tiên.

## Đọc theo thứ tự
| # | Tài liệu | Nội dung |
| :-: | :--- | :--- |
| 1 | [01-Tong-quan](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/blob/main/Docs/01-Tong-quan.md) | App làm gì, danh sách màn hình ↔ file, thuật ngữ |
| 2 | [02-Cai-dat-va-chay](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/blob/main/Docs/02-Cai-dat-va-chay.md) | Cài đặt, biến môi trường, chạy server/client/test |
| 3 | [03-Kien-truc](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/blob/main/Docs/03-Kien-truc.md) | Sơ đồ, DB, engine gợi ý, API, "muốn sửa X thì vào đâu" |
| 4 | [04-Su-co-thuong-gap](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/blob/main/Docs/04-Su-co-thuong-gap.md) | Bảng lỗi hay gặp và cách xử lý |
| 5 | [05-Build-APK-va-giao-khach](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/blob/main/Docs/05-Build-APK-va-giao-khach.md) | Google Cloud, build APK, link server cố định |
| 6 | [06-Tinh-trang-va-no-ky-thuat](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/blob/main/Docs/06-Tinh-trang-va-no-ky-thuat.md) | Cái gì xong, cái gì chưa, việc dễ cho người mới |
| 7 | [07-Quy-uoc-phat-trien](https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/blob/main/Docs/07-Quy-uoc-phat-trien.md) | Cách thêm màn hình, endpoint, migration, test |

## Quan hệ giữa Wiki và `Docs/`
| Nơi | Dành cho | Nội dung |
| :--- | :--- | :--- |
| **Wiki → Home** | Giảng viên, người đánh giá môn học | Nghiên cứu người dùng, MVP, User Stories, Flows, Changelog, AI Disclosure |
| **Wiki → Usability Testing Report** | Giảng viên | Kết quả kiểm thử với người dùng |
| **`Docs/` trong repo** | Dev | Cài đặt, kiến trúc, bảo trì, tình trạng kỹ thuật |

Nếu hai nơi mâu thuẫn về **kỹ thuật** thì tin `Docs/` (đi cùng code). Mâu thuẫn về **phạm vi sản phẩm và nghiên cứu** thì tin Wiki Home.

## Tình trạng ngắn gọn
- **Đã chạy được:** đăng ký/đăng nhập, tủ đồ, tách nền AI, gợi ý có lý do, khóa/đổi món, xác nhận mặc, lịch sử, thống kê, sự kiện.
- **Chỉ có thiết kế:** màn Cài đặt & Minh bạch quyền riêng tư và một số trạng thái lỗi (banner "dùng ảnh gốc", ẩn thời tiết khi không có GPS...). Bảng đối chiếu ở **Wiki Home, Mục 8.3**.
- **Chưa kiểm chứng trên thiết bị:** đăng nhập Google, bản APK giao khách, thời gian tách nền.
