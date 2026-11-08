Ứng dụng mobile tủ đồ gợi ý đồ thông minh

Tiêu chí dự án:
1. Time -> phục vụ người dùng tìm đồ nhanh
2. Best match: Phục vụ tìm đồ phù hợp cho lịch hẹn
3. Reuse: Kiểm tra tủ đồ còn thứ bị thiếu gì không

Usecase theo sprint: 

Sprint 1: Auth qua gmail

Sprint 2: Xây dựng tủ đồ - CRUD Wardrobe
UC1: Thêm món đồ: chọn nguồn ( kho ảnh đt ) -> xử lí ảnh -> xác nhận nhãn -> lưu
UC2: Xem và sửa kho đồ 

Sprint 3: MVP XÂY DỰNG HỆ THỐNG GỢI Ý 
UC3: GỬI BỐI CẢNH ( BACKGROUND ) cho server -> client nhận lại hệ thống gợi ý 
UC4: Đổi gợi ý / Khóa outfit
UC5: Lưu lịch sử

Sprint 4: Xây dựng hệ thống phụ trợ
UC6: Thống kê những đồ mặc bao lần
UC7: Gợi ý chọn đồ cho ngày đã chọn ( sự kiện quan trọng như đám cưới, ... )

Mô hình client-server, user lưu data local nhưng vài thông tin sẽ gửi tới server phục vụ mục tiêu kinh doanh thông tin 

Frontend:

Nền tảng: Android > IOS
Framework: React-Native
Màn hình chính: Tủ Đồ, Thêm món, Gợi ý 
State management: Zustand / Context API
Phần cứng: Camera, thư viện ảnh, GPS ( tạm thời chỉ có thư viện ảnh )
Xin quyền: Contextual permission: chỉ xin camera khi bấm chụp ( ưu tiên thư viện ảnh trước, từ từ )

Backend ( tham khảo, tui chưa rõ lắm nha )

WardrobeService -> Thêm, sửa, xóa món đồ; kiểm tra isReady()
ImageService -> Tách nền, lấy màu chủ đạo, nén ảnh
ColorHarmonyEngine -> Chấm điểm cặp màu theo HSL
RecommendationEngine -> Lọc, tạo tổ hợp, chấm điểm, suggest(), Lock/Swap
HistoryService -> confirmWear(), cập nhật last_worn

Kiến trúc Monolith, Kiến trúc: Clean/Layered gồm UI → ViewModel/Controller → Service → Repository → LocalDB.
( Service có thể liên kết với server vài công việc, tui không rõ chuyên môn cái này )

Data:
Client: 
Server:

Code chia làm 2 phần: folder client và folder server, server là laptop cá nhân, đẩy lên mạng sao cho các đt khác mạng cũng sài đc

Nhớ viết docker hộ


