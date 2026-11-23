# Behance Product Design Case Study — Closy

> **Mục đích:** Bản biên tập nội dung kể chuyện trực quan (Visual Storytelling) sẵn sàng đăng công khai (**Public**) trên **Behance** cho **Mục 6 (Trọng số: 5%)**.  
> **Nguyên tắc biên tập:** Viết mới hoàn toàn theo giọng văn Product Design Case Study (ngắn gọn, tập trung insight & quyết định thiết kế, **không sao chép nguyên văn bảng dài từ GitHub Wiki**, hạn chế chi tiết trang trí thừa).  
> **Thư mục ảnh đính kèm sẵn:** `Docs/BehanceCaseStudy/images/` (đã có đủ 9 ảnh PNG sắc nét từ `01` đến `09`; chỉ cần export thêm 1 ảnh frame `Closy Design System` từ Figma nếu muốn chèn bảng Design System nguyên tấm).

---

## Thông tin thiết lập dự án trên Behance

- **Project Title:** `Closy — Smart Wardrobe & Intelligent Outfit Stylist (Mobile UX/UI Case Study)`
- **Short Tagline / Cover Subtitle:** `Ít phân vân hơn. Đúng chất bạn hơn. · Phối đồ dưới 20 giây ngay từ tủ đồ của riêng bạn.`
- **Creative Fields:** `UI/UX`, `Interaction Design`, `Product Design`
- **Tools Used:** `Figma`, `React Native (Expo)`, `Google Forms`
- **Project Tags:** `UI/UX Design`, `Mobile App`, `Product Design`, `Wardrobe App`, `Design System`, `Usability Testing`, `Case Study`, `Local-First`
- **Visibility:** **Everyone (Public)**

---

## 1. Tổng quan sản phẩm (Hero & Overview)

> **Gợi ý bố cục Behance:** Khối mở đầu nền sáng tối giản (`#F8FAFC`), tiêu đề lớn Deep Teal (`#007B8F`) + đặt cạnh nhau 3 ảnh màn hình nổi bật: `02-today.png`, `05-outfit-suggest.png`, `06-outfit-adjust.png`.

### Closy — Trợ lý tủ đồ giúp bạn chốt trang phục trong 20 giây

**“Tủ đầy quần áo nhưng sáng nào cũng không biết mặc gì.”**  
**Closy** là ứng dụng di động quản lý tủ đồ theo hướng **Local-First**, giúp người trẻ 18–26 tuổi biến quần áo sẵn có thành những bộ phối hài hòa màu sắc, hợp bối cảnh và thời tiết — mà không cần mua sắm thêm hay đánh đổi quyền riêng tư hình ảnh cá nhân.

- **Nền tảng:** Mobile App (Android ưu tiên)
- **Nhóm thực hiện:** Nhóm L01 abc — Môn Phát triển Ứng dụng Di động (CO3043, ĐH Bách Khoa TP.HCM)
- **Thời gian:** Tháng 10 – 11/2026
- **Phạm vi:** Product Discovery → User Flows → Design System → Interactive Prototype → Usability Testing & Iteration

---

## 2. Vấn đề & Đối tượng mục tiêu (The Problem & Audience)

> **Gợi ý bố cục Behance:** Trình bày 3 thẻ số liệu lớn (Stat Cards) nền `#E6F4F6` chữ `#007B8F` thay vì đoạn văn dài.

### Khoảng cách giữa “sở hữu quần áo” và “biết mặc gì hôm nay”

Mỗi buổi sáng trước khi đi học hay đi làm, người trẻ **18–26 tuổi** thường mắc kẹt giữa ba lựa chọn bất tiện: thử đi thử lại trước gương, tìm ảnh phối đồ trên mạng nhưng không khớp tủ ở nhà, hoặc quay về mặc lại vài bộ an toàn quen thuộc.

Khảo sát khám phá ban đầu với nhóm học sinh – sinh viên (`N = 17`) cho thấy ba rào cản thực tế:
- **76.5%** thường xuyên hoặc thỉnh thoảng gặp tình trạng *"tủ đầy nhưng không biết mặc gì"*.
- **50.0%** sẵn sàng từ chối app phối đồ nếu gợi ý **"lệch gu thẩm mỹ"** và họ không kiểm soát được bộ đồ.
- **41.7%** sẽ bỏ cuộc ngay từ phiên đầu nếu **nhập tủ đồ mất quá nhiều công sức**.

**Chân dung mục tiêu:** Sinh viên và người mới đi làm (18–26 tuổi), di chuyển qua nhiều bối cảnh trong tuần (*Đi học, Đi làm, Đi chơi, Hẹn hò*), muốn ăn mặc gọn gàng nhanh chóng, khai thác lại đồ cũ và giữ kín ảnh trang phục trên điện thoại cá nhân.

---

## 3. Giá trị cốt lõi (Core Value Proposition)

> **Gợi ý bố cục Behance:** 3 cột gọn sạch, mỗi cột 1 tiêu đề ngắn + 2 dòng giải thích.

1. **Chốt nhanh, có lý do rõ ràng**  
   Chọn bối cảnh trong 1 chạm → nhận tối đa 3 bộ gợi ý kèm lý do ngắn về phối màu, độ lịch sự và thời tiết thay vì danh sách dài gây quá tải.
2. **Giữ quyền quyết định cho người dùng**  
   Khóa món đồ bạn yêu thích (`Lock`) và đổi nhanh phần còn lại (`Swap`) chỉ bằng một chạm — loại bỏ nỗi lo gợi ý "lệch gu".
3. **Riêng tư & Local-First ngay từ thiết kế**  
   Tủ đồ, lịch sử mặc và thuật toán phối đồ chạy hoàn toàn trên thiết bị (dùng được khi mất mạng); ảnh tách nền không bị lưu lại trên máy chủ.

---

## 4. Các quyết định thiết kế trọng tâm (Key Design Decisions)

> **Gợi ý bố cục Behance:** Dạng 3 thẻ đối chiếu ngắn *"Thay vì X → Chúng tôi chọn Y → Vì sao"*.

### Quyết định 1: Gợi ý theo luật màu HSL kèm giải thích, thay vì “hộp đen” ngẫu nhiên
Người dùng khảo sát đánh giá cao nhất việc **phối màu hợp mắt (58.3%)** và **hợp bối cảnh/thời tiết (41.7%)**. Thay vì chỉ đưa ra ảnh bộ đồ mà không nói gì, Closy áp dụng quy tắc bánh xe màu HSL (*Trung tính an toàn, Tương đồng, Tương phản bổ sung*) kết hợp độ trang trọng theo dịp, đồng thời hiển thị câu giải thích ngắn ngay dưới mỗi bộ để tạo niềm tin.

### Quyết định 2: Cơ chế Khóa & Đổi (`Lock & Swap`), thay vì Canvas kéo-thả nhiều lớp
Trên màn hình điện thoại nhỏ vào buổi sáng vội vã, kéo-thả từng món đồ dễ gây rối thao tác. Cơ chế **Khóa 1 món chủ đạo → Đổi các món chưa khóa** cho phép người dùng giữ đúng gu cá nhân chỉ trong vài chạm, trực tiếp giải quyết rào cản lớn nhất (50% sợ lệch gu).

### Quyết định 3: Tập trung luồng nhập ảnh nhanh & Fallback ảnh gốc, loại bỏ Avatar 3D khỏi MVP
Để vượt qua rào cản "ngại nhập liệu" (41.7%), màn hình Thêm món đồ ưu tiên **chụp ảnh/chọn thư viện tự tách nền & điền sẵn nhãn**, và tự động cho **giữ ảnh gốc chọn màu tay** nếu mất mạng. Các tính năng nặng như Avatar 3D hay đo số đo cơ thể được loại khỏi MVP để giữ trải nghiệm nhẹ và nhanh.

---

## 5. Luồng người dùng cốt lõi (Core User Flows)

> **Gợi ý bố cục Behance:** Vẽ/đặt sơ đồ mũi tên ngang tối giản cho 3 luồng MVP — mỗi luồng tối đa 4–5 bước.

- **Luồng 1 — Số hóa món đồ nhanh:** `Tủ đồ` → `Thêm món đồ (Chụp / Thư viện / Kho mẫu)` → `Tách nền & xác nhận nhãn` → `Lưu về thiết bị`
- **Luồng 2 — Chọn đồ theo bối cảnh (< 20s):** `Hôm nay` → `Chọn dịp (Đi học / Đi làm / Đi chơi / Hẹn hò)` → `Xem tối đa 3 bộ kèm lý do` → `Chọn & điều chỉnh`
- **Luồng 3 — Kiểm soát bộ đồ & Lịch sử:** `Điều chỉnh bộ đồ` → `Khóa món thích (Lock)` → `Đổi món khác (Swap)` → `Xác nhận mặc` → `Lưu lịch sử tháng`

---

## 6. Hệ thống thiết kế (Design System)

> **Gợi ý bố cục Behance:** Chèn ảnh xuất từ frame **`Closy Design System`** (`93:75` trên Page 1 Figma — export PNG 2x) kèm đoạn giới thiệu ngắn bên dưới.

Closy sử dụng phong cách **tối giản, nền sáng sạch sẽ** để **trang phục thật của người dùng luôn là nhân vật chính** thay vì bị cạnh tranh màu sắc với giao diện:

- **Màu chủ đạo (Brand Primary):** Deep Teal `#007B8F` (tạo cảm giác tin cậy, thanh lịch) & Deep Teal Dark `#006575`, kết hợp nền nhấn `#E6F4F6`.
- **Màu trung tính (Neutrals):** Nền trắng `#FFFFFF`, bề mặt thẻ `#F8FAFC` / `#F1F5F9`, chữ chính Slate `#0F172A`, chữ phụ `#64748B`.
- **Màu trạng thái:** Thành công `#0D9488`, Cảnh báo/Điểm nhấn `#F59E0B`, Lỗi `#EF4444`.
- **Kiểu chữ (Typography):** `Inter` (Regular / Medium / Semi Bold / Bold) — rõ ràng trên màn hình nhỏ, tối ưu hiển thị tiếng Việt có dấu.
- **Nhịp khoảng cách & Bo góc:** Hệ lưới `4 / 8 / 16 / 20px`, bo góc thẻ `12–16px`, chip lọc dạng pill `999px` thân thiện thao tác ngón cái.

---

## 7. Các màn hình chính (Key Screens)

> **Gợi ý bố cục Behance:** Trình bày dạng lưới 2–3 màn hình mỗi hàng từ thư mục `Docs/BehanceCaseStudy/images/`, mỗi màn chỉ kèm 1 chú thích ngắn 1–2 dòng (không viết tường thuật dài).

1. **Khởi đầu nhẹ nhàng (`01-onboarding.png`)**  
   Giới thiệu nhanh giá trị sản phẩm và mở lối vào tạo tủ đồ chỉ từ 5–7 món cơ bản.
2. **Màn hình Hôm nay (`02-today.png`)**  
   Chọn bối cảnh trong 1 chạm (*Đi học, Đi làm, Đi chơi, Hẹn hò*), xem nhanh thời tiết tham khảo và thẻ nhắc *"Lâu rồi chưa mặc nhỉ?"*.
3. **Tủ đồ cá nhân (`03-wardrobe.png`) & Thêm món đồ (`04-add-item.png`)**  
   Lưới 3 cột lọc nhanh theo danh mục, lưu trữ cục bộ trên thiết bị; luồng nạp đồ tinh gọn từ Chụp ảnh, Thư viện hoặc Kho mẫu.
4. **Gợi ý phối đồ theo bối cảnh (`05-outfit-suggest.png`)**  
   Đề xuất 1 bộ nổi bật nhất cùng 2 phương án thay thế, đi kèm giải thích hòa hợp màu sắc và sự phù hợp hoàn cảnh.
5. **Điều chỉnh Lock/Swap (`06-outfit-adjust.png`) & Lịch sử mặc đồ (`07-history.png`)**  
   Khóa món yêu thích, đổi các món chưa khóa trong 1 chạm, và bấm *"Xác nhận mặc"* để lưu nhật ký theo lịch tháng.

---

## 8. Kiểm thử khả năng sử dụng & Cải tiến thiết kế (Usability Testing & Iteration)

> **Gợi ý bố cục Behance:** Đặt dải 3 chỉ số nổi bật ở trên (`5 người ngoài nhóm · 18–20 tuổi` | `SEQ 4.4 – 4.6 / 5.0` | `4.8 / 5.0 sẵn sàng dùng thử`), ngay bên dưới chèn full-width 2 ảnh đối chiếu **`08-iteration-1-before-after.png`** và **`09-iteration-2-before-after.png`** (`1400px`).

### Kiểm chứng thực tế với 5 người dùng ngoài nhóm (18–20 tuổi)

Chúng tôi tổ chức kiểm thử trên Interactive Prototype với **5 sinh viên ngoài nhóm** (80% chưa từng sử dụng ứng dụng quản lý tủ đồ trước đây) qua 3 tác vụ cốt lõi: *Nạp món đồ mới (UT01)*, *Chọn bối cảnh nhận gợi ý (UT02)* và *Khóa/Đổi món & Xác nhận mặc (UT03)*.

- **100% (5/5)** hoàn thành mượt cả 3 luồng và nhận biết rõ phản hồi lưu lịch sử ở UT03.
- **Điểm mức độ dễ dùng (SEQ):** UT01 đạt **4.4/5**, UT02 đạt **4.6/5**, UT03 đạt **4.6/5**.
- **Mức độ sẵn sàng dùng thử buổi sáng:** **4.8 / 5.0** (4/5 người chấm tối đa 5/5).

### Hai cải tiến có giá trị dựa trực tiếp trên phản hồi người dùng

1. **Cải tiến 1 — Làm nổi bật “Lý do gợi ý bộ đồ” (`08-iteration-1-before-after.png`):**  
   *Phát hiện:* 60% ngập ngừng nhẹ khi quét màn gợi ý; người dùng góp ý dòng giải thích lý do phối đồ còn nhỏ và chìm.  
   *Giải pháp:* Nâng dòng giải thích `12px` xám nhạt thành **Hộp lý do nền xanh teal dịu (`#E6F4F6`)**, tăng cỡ chữ lên `13px Medium` đậm rõ, gắn tag quét nhanh (`+3 Trung tính hài hòa`, `26°C · Thoải mái đi học`) và đổi 2 dòng lý do thẻ phụ từ `10px` thành pill `11px Semi Bold`.

2. **Cải tiến 2 — Hướng dẫn 3 bước cho người mới & Mở rộng kho đồ đa dạng (`09-iteration-2-before-after.png`):**  
   *Phát hiện:* UT01 có SEQ thấp nhất (`4.4/5`), 20% người mới cần hướng dẫn ban đầu và người dùng mong muốn nguồn nhập đa dạng hơn.  
   *Giải pháp:* Bổ sung **thanh chỉ dẫn 3 bước** (`1. Chọn ảnh → 2. Kiểm tra nhãn → 3. Lưu tủ đồ`), nâng thẻ *Mẫu cơ bản* thành **`Kho mẫu (30+)`** và bổ sung hàng chip chọn nhanh **5 danh mục (`Áo · Quần · Váy · Đầm · Giày`)**.

---

## 9. Trải nghiệm Interactive Prototype & Kết luận

> **Gợi ý bố cục Behance:** Khối kết thúc gọn gàng với nút/link rõ ràng sang Interactive Prototype (hoặc nhúng trực tiếp Figma Prototype bằng khối **Embed** của Behance!).

- **Trải nghiệm Interactive Prototype (Figma):**  
  https://www.figma.com/proto/275uX1MaT8FUdPYXBMhre6/Untitled?node-id=2-5833&starting-point-node-id=2%3A5833
- **Xem file thiết kế & Design System (Figma):**  
  https://www.figma.com/design/275uX1MaT8FUdPYXBMhre6/Untitled?node-id=0-1
- **Mã nguồn & Tài liệu dự án (GitHub):**  
  https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist

**Cảm ơn bạn đã xem Case Study của Closy!**

---

## Checklist xuất bản Behance Public (bắt buộc trước khi nộp)

1. Vào [behance.net](https://www.behance.net/) → bấm **Share Your Work → Project**.
2. Dán nội dung theo đúng thứ tự **9 phần** ở trên, xen kẽ ảnh PNG trong thư mục `Docs/BehanceCaseStudy/images/` (và export thêm 1 ảnh frame `Closy Design System` trên Page 1 Figma chèn vào Phần 6).
3. Ở Phần 9, có thể dùng khối **Embed** của Behance hoặc chèn thẳng link **Figma Interactive Prototype** (`/proto/`).
4. Đặt Cover Image sạch (dùng 3 màn hình hero `02-today.png`, `05-outfit-suggest.png`, `06-outfit-adjust.png` trên nền `#E6F4F6` + chữ `Closy`).
5. Bấm **Settings → Visibility: Everyone (Public)** → **Publish**.
6. **Kiểm tra quyền truy cập:** Mở link Behance vừa đăng + bấm thử link Figma Prototype bên trong bằng cửa sổ **Ẩn danh (Incognito)** để đảm bảo giảng viên xem được trọn vẹn không cần đăng nhập.
7. Dán link Behance Public vào **Mục 12.2** trên trang `Home` của **GitHub Wiki**!
