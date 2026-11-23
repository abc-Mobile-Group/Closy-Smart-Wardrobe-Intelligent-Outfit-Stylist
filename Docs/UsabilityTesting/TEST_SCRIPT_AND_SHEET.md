# Kịch bản Kiểm thử Khả năng Sử dụng (Unmoderated Usability Testing — Google Form & Figma Prototype)

> **Dự án:** Closy — Smart Wardrobe & Intelligent Outfit Stylist (CO3043)  
> **Hình thức kiểm thử:** Kiểm thử tự thực hiện từ xa (**Unmoderated Remote Usability Testing**) — gửi duy nhất 1 link **Google Form** ẩn danh (bên trong đã tích hợp sẵn hướng dẫn và 3 link Figma Interactive Prototype).  
> **Link Google Form gửi người tham gia:** `https://docs.google.com/forms/d/1SqK1ulokq9GoEXNduOWbOG2mJldpQ8X1COo0bY0QjDQ/viewform` *(có thể thay bằng link rút gọn `forms.gle`)*  
> **Đối tượng mục tiêu:** Tối thiểu **3 người tham gia ngoài nhóm**, độ tuổi **18–26** (sinh viên / người mới đi làm)  
> **Thời lượng ước tính:** 5–10 phút / người  
> **Nguyên tắc bảo mật:** Ẩn danh hoàn toàn — Google Form tắt thu thập email, không hỏi họ tên/MSSV; khi tổng hợp dữ liệu từ Google Sheets sẽ đánh mã `P01`, `P02`, `P03`... theo thứ tự gửi.

---

## 1. Checklist trước khi gửi link Google Form

- [ ] **Figma Prototype:** Bật **Share → Anyone with the link → can view** cho file Figma của nhóm.
- [ ] **Google Form:** Đã bấm **Xuất bản (Published)** và tắt **Thu thập địa chỉ email** (*Cài đặt → Câu trả lời → Thu thập địa chỉ email: Không thu thập*).
- [ ] **Kiểm tra 3 link Figma gắn trong Form bằng trình duyệt Ẩn danh (Incognito):**
  - **Phần 2 — UT01 (`Tủ đồ của An`):** `https://www.figma.com/proto/275uX1MaT8FUdPYXBMhre6/Untitled?node-id=2-5913&starting-point-node-id=2%3A5913`
  - **Phần 3 — UT02 (`Hôm nay của bạn`):** `https://www.figma.com/proto/275uX1MaT8FUdPYXBMhre6/Untitled?node-id=2-5833&starting-point-node-id=2%3A5833`
  - **Phần 4 — UT03 (`Điều chỉnh bộ đồ`):** `https://www.figma.com/proto/275uX1MaT8FUdPYXBMhre6/Untitled?node-id=2-6177`
- [ ] **Liên kết Google Sheets:** Vào tab *Câu trả lời → Liên kết với Trang tính* để tự động tổng hợp dữ liệu khi có phản hồi.

---

## 2. Tin nhắn mẫu gửi mời người tham gia (Zalo / Messenger)

> *"Chào bạn, nhóm mình đang làm đồ án ứng dụng tủ đồ thông minh **Closy** và cần nhờ bạn (5–10 phút) bấm thử mẫu thiết kế (Figma Prototype) rồi điền giúp nhóm 1 form ngắn hoàn toàn ẩn danh (không cần đăng nhập hay để lại tên/email).*
>
> *👉 Link form (đã có sẵn link mẫu thiết kế bên trong từng phần): `https://docs.google.com/forms/d/1SqK1ulokq9GoEXNduOWbOG2mJldpQ8X1COo0bY0QjDQ/viewform`*
>
> *Bạn cứ bấm thử tự nhiên theo 3 tình huống trong form, có chỗ nào khó hiểu hoặc bấm nhầm cứ góp ý thẳng giúp nhóm mình nhé. Cảm ơn bạn nhiều!"*

---

## 3. Cấu trúc kịch bản 5 phần trên Google Form (Tự thực hiện)

Người tham gia mở link Google Form và tự hoàn thành tuần tự 5 phần mà không có sự can thiệp hay gợi ý từ nhóm:

| Phần | Nội dung | Tác vụ trên Figma Interactive Prototype | Dữ liệu thu thập |
| :-: | :--- | :--- | :--- |
| **Phần 1** | **Thông tin làm quen (Ẩn danh)** | *(Chưa mở Prototype)* | Nhóm tuổi (`18–26`), nhóm đối tượng (SV / đi làm), thời gian chọn đồ buổi sáng, kinh nghiệm dùng app tủ đồ. |
| **Phần 2** | **UT01 — Nạp món đồ mới vào tủ** | Mở link `Tủ đồ của An` (`2:5913`) → tìm cách thêm chiếc **áo sơ mi trắng** mới, kiểm tra loại đồ / màu sắc / dịp mặc và lưu vào tủ. | Trạng thái hoàn thành, điểm dễ dùng SEQ (`1–5`), điểm vướng mắc. |
| **Phần 3** | **UT02 — Chọn bối cảnh nhận gợi ý (< 20s)** | Mở link `Hôm nay của bạn` (`2:5833`) → chọn bối cảnh **Đi học**, xem các bộ gợi ý kèm lý do và chọn 1 bộ để xem chi tiết. | Trạng thái hoàn thành, độ rõ lý do gợi ý, điểm SEQ (`1–5`), điểm vướng mắc. |
| **Phần 4** | **UT03 — Khóa/Đổi món & Xác nhận mặc** | Mở link `Điều chỉnh bộ đồ` (`2:6177`) → giữ nguyên **áo thun kem**, đổi các món còn lại và bấm **Xác nhận mặc**. | Mức độ phân biệt Khóa vs Đổi, độ rõ phản hồi đã lưu lịch sử, điểm SEQ (`1–5`), điểm vướng mắc. |
| **Phần 5** | **Đánh giá tổng quan & Góp ý cải tiến** | *(Hoàn tất gửi Form)* | Tác vụ vướng nhất trong 3 tác vụ, mức độ muốn dùng thử (`1–5`), và **1 điểm muốn sửa nhất**. |

---

## 4. Quy trình tổng hợp kết quả từ Google Sheets

Sau khi nhận đủ **≥ 3 phản hồi hợp lệ** (thuộc độ tuổi 18–26, ngoài nhóm):
1. Mở Google Sheets gắn với Form, gán mã ẩn danh **`P01`, `P02`, `P03`...** tương ứng với từng hàng phản hồi (xóa/loại bỏ nếu có bản test nháp của thành viên nhóm).
2. Tính **tỷ lệ hoàn thành**, **điểm SEQ trung bình (1–5)** cho từng tác vụ UT01–UT03, tỷ lệ hiểu rõ lý do gợi ý (UT02), tỷ lệ phân biệt Khóa/Đổi và nhận biết lưu lịch sử (UT03).
3. Tổng hợp các câu trả lời mở ở mục điểm vướng và mục `5.3` (*1 điểm muốn sửa nhất*) → gom nhóm lỗi theo mức độ `Critical / Major / Minor`.
4. Chọn **1–2 vấn đề có tác động cao nhất** để thực hiện cải tiến trên Figma, chụp đối chiếu **Before / After** và cập nhật báo cáo hoàn chỉnh vào [Usability-Testing-Report.md](./Usability-Testing-Report.md) rồi đăng lên **GitHub Wiki**.
