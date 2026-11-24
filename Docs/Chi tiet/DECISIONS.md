# Các quyết định kiến trúc (đang hiệu lực)

> Bản trước (`Archive/Backlog-v2.md`) ghi quyết định ban đầu. Bảng dưới là **trạng thái hiện tại**: cái nào giữ nguyên, cái nào đã đổi và vì sao.

| # | Quyết định | Hiện tại | Lý do |
| :-: | :--- | :--- | :--- |
| 1 | Xác thực và tài khoản | **Có server.** Đăng nhập Google **và** email + mật khẩu | Cần tài khoản; Google Sign-In không chạy trong Expo Go nên cần thêm đường email để thử trên máy |
| 2 | Tách nền ảnh | Qua server (rembg); lỗi thì giữ ảnh gốc | Tách nền trên máy quá nặng; luồng không bị chặn khi server lỗi |
| 3 | Gợi ý chạy ở đâu | **Trên điện thoại (local-first)** | Dùng được khi mất mạng, nhanh, dữ liệu tủ đồ không rời máy |
| 4 | Danh mục | **Áo, Quần, Váy, Đầm, Giày** *(đổi so với bản đầu: chỉ Áo và Quần/Váy)* | Đầm là bộ độc lập; giày làm bộ hoàn chỉnh |
| 5 | Bối cảnh | Đi học, Đi làm, Đi chơi, Hẹn hò; "Sự kiện quan trọng" ở Phase 2 | Mỗi bối cảnh cần mức trang trọng khác nhau |
| 6 | Nền tảng | Android ưu tiên; iOS để sau | Cần tài khoản Apple Developer cho iOS |
| 7 | Lưu trữ | SQLite + file ảnh trên máy; **không đồng bộ cloud** | Riêng tư, nhẹ, đơn giản |
| 8 | Server làm gì | Chỉ tài khoản và xử lý ảnh | Giữ phần lớn logic ở client |
| 9 | Nhận diện loại đồ | Ollama (Gemma) nếu có; không có thì heuristic hình học | Chạy cục bộ, không cần API key bên thứ ba |
| 10 | Thời tiết | GPS + Open-Meteo (không cần khóa), chỉ là dữ liệu phụ trợ | Phối đồ không được phụ thuộc vào thời tiết |
| 11 | Hạ tầng demo | Docker + Cloudflare Tunnel trên laptop | Rẻ; **link miễn phí đổi liên tục**, bản giao khách cần link cố định |
| 12 | Thông báo nhắc sự kiện | **Thiết kế, chưa code.** Đề xuất local notification | Xem `Design-Notifications.md` |
| 13 | Gợi ý phía server (`/outfit/suggest`) | Còn trong code nhưng **client không dùng** | Là phương án cũ; nên xóa để tránh hai bộ luật lệch nhau |

## Công thức gợi ý
Xem `03-Kien-truc.md`, mục 4. Các ngưỡng là số khởi đầu, nên chỉnh bằng 20–30 món đồ thật.

## Tiêu chí dự án (từ bản đầu, vẫn đúng)
| Tiêu chí | Ý nghĩa | Đáp ứng bởi |
| :--- | :--- | :--- |
| **Time** | Tìm đồ nhanh | Engine chạy trên máy, mục tiêu < 3 giây |
| **Best match** | Đúng bối cảnh | Chấm điểm màu + độ trang trọng + đồng bộ |
| **Reuse** | Biết đồ nào ít dùng, tủ thiếu gì | Điểm tái sử dụng, tab Thống kê |
