# Checklist Người 2: Mục 1 (Wiki) + Mục 2 (Edge states)

## Mục 1: Product Refinement và GitHub Wiki (làm trên GitHub)
- [ ] Wiki → New Page, dán 4 file trong thư mục `wiki/` (tên trang: Product Refinement, User Flows, Changelog, AI Disclosure)
- [ ] Điền hết chỗ **[ĐIỀN]**: dữ liệu Assignment 1, góp ý giảng viên, tên người dùng AI
- [ ] Đối chiếu bảng Changelog với Assignment 1 thật, sửa cột "Trước"
- [ ] Nhóm chốt: Thống kê và Sự kiện đưa vào Phase 2 hay bỏ khỏi phạm vi
- [ ] Đối chiếu bảng Flow ↔ Màn hình với Figma của Người 1 (tên frame trùng)
- [ ] GitHub Project: tạo card cho từng mục, gắn người phụ trách, kéo sang Done khi xong
- [ ] Xem Wiki bằng cửa sổ ẩn danh để chắc người ngoài mở được

## Mục 2: Edge states và màn hình phụ (làm trên Figma)
Làm theo `figma/05-Edge-States-and-Settings-Spec.md`.
- [ ] Loading: L1, L2
- [ ] Empty / Incomplete: E1, E2, E3 (nêu rõ thiếu gì), E4
- [ ] Error & Recovery: R1 (giữ ảnh gốc), R2, R3–R5, R6, R7
- [ ] Offline / No GPS: O1, O2
- [ ] Permission & Success: P1–P5
- [ ] Màn hình Cài đặt & Quyền riêng tư
- [ ] Kiểm tra vùng chạm ≥ 44, chữ ≥ 12/11, tương quan màu bằng plugin
- [ ] Gửi Người 1 danh sách component dùng chung (Banner, Toast, Dialog, Skeleton) để đưa vào Design System

## Chỗ lệch giữa yêu cầu thiết kế và code (nói với nhóm)
1. R1: app chưa có banner "Dùng ảnh gốc"
2. O1: app đang hiện thời tiết mặc định "Hà Nội 26°" thay vì ẩn
3. P3: app xin vị trí ngay khi mở Hôm nay, chưa có màn giải thích
4. P4: chưa có toast sau khi lưu món
5. E3: chưa nêu rõ thiếu danh mục nào
6. Màn hình Cài đặt chưa có trong code
Các điểm này không bắt buộc sửa code để nộp phần Figma; chỉ cần Wiki ghi rõ "Thiết kế" và "Đã làm" khác nhau chỗ nào.
