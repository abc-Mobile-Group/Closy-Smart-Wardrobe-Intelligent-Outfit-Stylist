# Design – Trạng thái tương tác và xử lý lỗi (Interaction States & Error Handling)

> Phạm vi: mọi trạng thái **không phải "đường vui"** của Closy. Nguyên tắc chung đi trước, sau đó là 5 nhóm trạng thái.
> Đây là **đặc tả thiết kế**. Tên component, chuỗi chữ và thời lượng là đề xuất, cần đối chiếu với code trong `client/` khi triển khai.

## 0. Nguyên tắc chung

| # | Nguyên tắc | Hệ quả |
| :-- | :--- | :--- |
| 1 | **Local-first**: phối đồ không bao giờ phụ thuộc mạng/server | Mất mạng chỉ làm mất *tính năng phụ* (thời tiết, tách nền AI), không chặn luồng chính |
| 2 | **Không bao giờ mất dữ liệu người dùng** | Tách nền lỗi → vẫn lưu được ảnh gốc |
| 3 | **Mọi lỗi đều có lối ra** | Mỗi thông báo lỗi có ≥ 1 nút hành động (Thử lại / Giữ ảnh gốc / Mở cài đặt) |
| 4 | **Nói người, không nói máy** | Không hiện `Network request failed`, `500`, stack trace. Ghi chi tiết kỹ thuật ra log |
| 5 | **Đúng chỗ, đúng cỡ** | Lỗi nhập liệu: inline dưới ô. Lỗi thao tác nhỏ: toast. Lỗi chặn luồng: banner/màn hình trạng thái |
| 6 | **Xin quyền theo ngữ cảnh** | Chỉ hỏi khi người dùng bấm hành động cần quyền, kèm lý do |
| 7 | **Phản hồi trong 100 ms** | Bấm nút → đổi trạng thái ngay (disabled + spinner), tránh bấm đúp |
| 8 | **Truy cập được** | Không chỉ dựa vào màu; có icon + chữ; thông báo lỗi có `accessibilityLiveRegion`/`accessibilityRole="alert"` |

### Bảng chọn kiểu hiển thị

| Tình huống | Kiểu | Tự tắt? |
| :--- | :--- | :---: |
| Xác nhận thành công nhỏ (lưu, xác nhận mặc) | Toast | ✅ 2.5 s |
| Lỗi/nhắc nhẹ, không chặn việc | Banner mỏng trên đầu màn hình | ❌ tới khi hết lỗi hoặc bấm × |
| Lỗi nhập liệu | Chữ đỏ + icon dưới ô nhập | ❌ tới khi sửa |
| Lỗi chặn luồng, cần chọn | Bottom sheet / hộp thoại | ❌ |
| Màn hình không có gì để hiện | Empty state toàn màn hình (hình + 1 câu + 1 nút) | — |
| Chờ > 1 s | Skeleton hoặc spinner + chữ mô tả | — |

---

## 1. Loading

### 1.1 Đang tách nền AI (thêm món đồ)

Thời gian chờ thực tế dài và không ổn định (lần đầu server còn tải model ~170 MB). Vì vậy cần cho người dùng **thấy tiến triển** và **cho phép thoát**.

| Giai đoạn | Thời điểm | Hiển thị | Hành động của người dùng |
| :--- | :--- | :--- | :--- |
| A. Chuẩn bị | 0–1 s | Ảnh gốc hiện ngay, nút **Lưu** bật. Chip nhỏ "Đang tách nền…" kèm spinner đè lên góc ảnh | Có thể **Lưu ngay** bằng ảnh gốc |
| B. Chờ lâu | > 8 s | Chip đổi thành "Đang tách nền… lần đầu hơi lâu" | Vẫn lưu được; nút **Bỏ qua tách nền** xuất hiện |
| C. Quá giờ | > 30 s | Chuyển sang trạng thái lỗi (xem 3.1) | Thử lại / Giữ ảnh gốc |
| D. Xong | — | Ảnh nền trong suốt thay thế mượt (cross-fade 200 ms), chip đổi thành ✓ "Đã tách nền" rồi biến mất sau 1.5 s | Xem trước, **Lưu** |

Quy tắc:
- Người dùng **không bị khóa màn hình** trong lúc tách nền: được sửa tên, danh mục, màu, rồi Lưu.
- Nếu người dùng bấm Lưu khi chưa xong: lưu bằng ảnh gốc, tách nền chạy tiếp ở nền; xong thì tự thay ảnh (hoặc bỏ qua, tùy phạm vi triển khai; ghi rõ trong code).
- Hủy request (AbortController) khi rời màn hình.

### 1.2 Đang tạo gợi ý phối đồ

Engine chạy cục bộ nên thường < 500 ms. Chỉ dùng loading khi cần.

| Thời gian | Hiển thị |
| :--- | :--- |
| < 300 ms | Không hiện gì, đưa kết quả luôn (tránh nháy) |
| 300 ms – 2 s | **Skeleton 3 thẻ bộ đồ** (khung xám nhấp nháy), tiêu đề "Đang chọn đồ cho bạn…" |
| > 2 s | Giữ skeleton, thêm dòng "Tủ đồ lớn, chờ chút nhé" |

- Nút **Phối đồ** chuyển `disabled` + spinner trong lúc chạy, chống bấm đúp.
- **Đổi món** (swap) trong một bộ: chỉ skeleton **ô món đó**, không làm lại cả bộ.
- Món đang **khóa** hiện icon 🔒 và không đổi trong khi tạo lại.

### 1.3 Loading khác (ngắn gọn)

| Nơi | Hiển thị |
| :--- | :--- |
| Mở app, đang đọc SQLite/phiên đăng nhập | Splash, tối đa ~1 s, không màn hình trắng |
| Danh sách tủ đồ | Skeleton lưới ảnh 2 cột |
| Đăng nhập/Đăng ký | Nút bấm có spinner, ô nhập vẫn hiện nhưng khóa |
| Ảnh đồ tải | Placeholder màu trung tính, hiện ảnh khi `onLoad` |

---

## 2. Empty / Incomplete

### 2.1 Tủ đồ trống (chưa có món nào)

```
┌──────────────────────────┐
│        [hình tủ đồ]      │
│   Tủ đồ của bạn còn trống│
│  Thêm vài món để Closy   │
│  bắt đầu phối giúp bạn   │
│                          │
│   [ + Thêm món đầu tiên ]│
│   Chụp ảnh · Chọn từ máy │
└──────────────────────────┘
```
- Một nút chính duy nhất. Mục tiêu: **thêm món đầu tiên trong ≤ 4 chạm** (khớp checklist file 05).
- Tab/nút **Phối đồ** vẫn bấm được và dẫn tới empty state 2.2 thay vì bị vô hiệu hóa không lời giải thích.

### 2.2 Chưa đủ danh mục để phối

Quy tắc đề xuất (đối chiếu với `suggest.ts`): một bộ cần **Áo + Quần/Váy** (hoặc Đầm/liền thân); Giày, phụ kiện, áo khoác là tùy chọn.

| Tủ đồ đang có | Hiển thị | Nút |
| :--- | :--- | :--- |
| 0 món | Empty 2.1 | Thêm món đầu tiên |
| Chỉ áo (vd 3 áo) | "Bạn có **3 áo** nhưng chưa có **quần hoặc váy**. Thêm 1 món để mình phối nhé." + tiến độ ● ○ (Áo ✓ · Quần/Váy ✗) | **Thêm quần/váy** (mở thẳng màn hình thêm món, **chọn sẵn danh mục** còn thiếu) |
| Chỉ quần/váy | Tương tự, thiếu **áo** | **Thêm áo** |
| Đủ áo + quần nhưng không bộ nào hợp bối cảnh | "Chưa tìm được bộ hợp **{bối cảnh}**. Thử bối cảnh khác hoặc thêm món." | Đổi bối cảnh / Thêm món |
| Ít hơn 3 bộ khả dụng | Vẫn hiện các bộ tìm được, kèm dòng "Mới tìm được {n} bộ. Thêm đồ để có nhiều lựa chọn hơn." | Thêm món |

Quy tắc: không bao giờ hiện danh sách rỗng không giải thích. Luôn nói **thiếu gì** và có nút **bổ sung đúng thứ thiếu**.

### 2.3 Rỗng khác

| Màn hình | Nội dung | Nút |
| :--- | :--- | :--- |
| Lịch sử mặc (chưa xác nhận lần nào) | "Chưa có bộ nào được mặc. Bấm *Xác nhận mặc* sau khi phối để lưu lại." | Đi phối đồ |
| Lọc tủ đồ không ra kết quả | "Không có món nào khớp bộ lọc." | Xóa bộ lọc |

---

## 3. Error & Recovery

### 3.1 Tách nền AI thất bại

Nguyên nhân: server tắt/không tới được, timeout, ảnh lỗi, server trả 4xx/5xx.

```
┌──────────────────────────────┐
│ ⚠ Chưa tách được nền ảnh này │
│ Bạn vẫn có thể dùng ảnh gốc. │
│                              │
│ [ Giữ ảnh gốc & lưu ]  (chính)│
│ [ Thử lại ]            (phụ)  │
└──────────────────────────────┘
```

| Nguyên nhân | Câu chữ | Nút |
| :--- | :--- | :--- |
| Không có mạng / server không tới được | "Không kết nối được máy chủ. Bạn vẫn có thể lưu ảnh gốc." | Giữ ảnh gốc · Thử lại |
| Timeout > 30 s | "Tách nền đang quá lâu." | Giữ ảnh gốc · Thử lại · Hủy |
| Ảnh không đọc/không có vật thể | "Mình không nhận ra món đồ trong ảnh. Thử ảnh sáng và rõ hơn." | Chọn ảnh khác · Giữ ảnh gốc |
| Ảnh quá lớn | "Ảnh quá lớn." (app tự thu nhỏ trước khi gửi; chỉ báo nếu vẫn lỗi) | Chọn ảnh khác |
| Lỗi server 5xx | "Máy chủ đang bận." | Giữ ảnh gốc · Thử lại |

Quy tắc phục hồi:
- **Giữ ảnh gốc** là hành động mặc định và nổi bật nhất; dữ liệu nhập (tên, danh mục, màu) **không bị mất**.
- Món lưu bằng ảnh gốc có cờ nội bộ (vd `bgRemoved = false`) để sau này có thể **"Tách nền lại"** từ màn hình chi tiết món.
- Tự thử lại tối đa 1 lần khi lỗi mạng thoáng qua; sau đó mới hỏi người dùng.
- Ghi log kỹ thuật, không đẩy lên UI.

### 3.2 Lỗi nhập liệu: Đăng nhập / Đăng ký

Hiển thị **inline dưới từng ô**, đỏ + icon, kiểm tra khi **rời ô (blur)** và khi **bấm gửi**. Không dùng popup cho lỗi nhập liệu. Sau khi gửi lỗi, đưa focus tới ô lỗi đầu tiên.

| Trường | Điều kiện | Thông báo |
| :--- | :--- | :--- |
| Email | rỗng | "Nhập email của bạn" |
| Email | sai định dạng | "Email chưa đúng, ví dụ ten@gmail.com" |
| Mật khẩu | rỗng | "Nhập mật khẩu" |
| Mật khẩu (đăng ký) | quá ngắn | "Mật khẩu cần ít nhất {N} ký tự" (N lấy từ luật server) |
| Xác nhận mật khẩu | không khớp | "Hai mật khẩu chưa giống nhau" |
| Đăng nhập | sai email/mật khẩu (401) | Banner trên form: "Email hoặc mật khẩu chưa đúng" (**không** nói rõ cái nào sai, để an toàn) |
| Đăng ký | email đã tồn tại (409) | Dưới ô email: "Email này đã có tài khoản" + liên kết **Đăng nhập** |
| Mạng/server | không kết nối | Banner: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." + **Thử lại** |
| Google Sign-In | người dùng hủy | Không báo lỗi (hủy là chủ ý) |
| Google Sign-In | lỗi cấu hình/SHA-1 | "Đăng nhập Google chưa dùng được. Thử đăng nhập bằng email." |

Chi tiết UX:
- Nút **Đăng nhập/Đăng ký** không `disabled` chỉ vì form chưa hợp lệ (người dùng không biết vì sao); thay vào đó bấm vào thì hiện lỗi. Chỉ khóa khi đang gửi.
- Nút mắt hiện/ẩn mật khẩu.
- Phiên hết hạn (JWT 7 ngày): quay về Đăng nhập với thông báo "Phiên đã hết hạn, hãy đăng nhập lại". **Dữ liệu tủ đồ cục bộ giữ nguyên.**

### 3.3 Lỗi nhỏ khác

| Tình huống | Xử lý |
| :--- | :--- |
| Lưu SQLite lỗi | Hộp thoại "Không lưu được món đồ" + Thử lại; giữ nguyên form |
| Xóa món | Hộp thoại xác nhận, rồi toast "Đã xóa" có **Hoàn tác** trong 5 s |
| Lỗi không lường trước | Màn hình "Có gì đó chưa ổn" + Thử lại + Về trang chủ (Error Boundary), không crash trắng |

---

## 4. Offline / Không có GPS

Nguyên tắc: **thời tiết là phụ gia, không phải điều kiện**. Mất nó thì ẩn đi, phối đồ vẫn chạy.

| Tình huống | Thẻ thời tiết | Phối đồ | Ghi chú |
| :--- | :--- | :---: | :--- |
| Online + có GPS | Hiện nhiệt độ + điều kiện | ✅ | Bình thường |
| **Offline** | **Ẩn thẻ** (không để ô trống/spinner mãi). Có thể hiện bản cache nếu < 3 giờ, kèm nhãn "Cập nhật lúc {giờ}" | ✅ cục bộ | Banner mỏng "Đang offline, vẫn phối đồ bình thường" (tự biến mất khi có mạng) |
| **Không có GPS / từ chối quyền vị trí** | Ẩn thẻ, hoặc thay bằng nút nhỏ "Bật vị trí để xem thời tiết" | ✅ | Không chặn, không nhắc lại liên tục (tối đa 1 lần/phiên) |
| GPS đang chờ | Skeleton thẻ nhỏ tối đa 5 s, hết giờ thì ẩn | ✅ | Không chờ GPS mới cho phép phối |
| Thời tiết lỗi (API) | Ẩn thẻ như offline | ✅ | Không hiện lỗi kỹ thuật |
| Đang offline mà bấm thêm món | Lưu bằng ảnh gốc, nhãn nhỏ "Chưa tách nền" (xem 3.1) | ✅ | Có thể tách lại khi có mạng |

Khi thiếu thời tiết, engine phối **bỏ qua yếu tố thời tiết** và dùng bối cảnh người dùng chọn (và, nếu có, nhiệt độ lần cuối đã biết). Cần ghi rõ trong code engine đang fallback thế nào để tránh kết quả khác biệt khó giải thích.

Phát hiện mạng: dùng `@react-native-community/netinfo` (hoặc tương đương). Cẩn trọng: "có Wi-Fi" không đồng nghĩa "server tới được". Trạng thái "server không tới được" nên dựa vào lỗi request thực tế, không chỉ NetInfo.

---

## 5. Permission & Success

### 5.1 Xin quyền Camera / Thư viện ảnh / GPS: theo ngữ cảnh

Quy trình 3 bước, **không bao giờ hỏi lúc mở app**:

1. **Pre-prompt của Closy** (hiện khi người dùng bấm hành động cần quyền, trước hộp thoại hệ thống):
   | Quyền | Tiêu đề | Lý do | Nút |
   | :--- | :--- | :--- | :--- |
   | Camera | "Cho Closy dùng camera?" | "Để chụp món đồ và thêm vào tủ. Ảnh chỉ lưu trong máy bạn." | Tiếp tục · Để sau |
   | Vị trí | "Xem thời tiết nơi bạn ở?" | "Mình dùng vị trí để gợi ý đồ hợp thời tiết. Không bắt buộc." | Cho phép · Không, cảm ơn |
2. **Hộp thoại hệ thống** (chỉ hiện sau khi bấm Tiếp tục/Cho phép).
3. **Kết quả**:
   | Kết quả | Xử lý |
   | :--- | :--- |
   | Cho phép | Tiếp tục đúng hành động người dùng vừa bấm (mở camera luôn) |
   | Từ chối lần đầu | Quay lại màn hình trước, có lối thay thế: Camera → **Chọn từ thư viện**; GPS → ẩn thời tiết (mục 4). Không báo lỗi |
   | Từ chối vĩnh viễn ("Không hỏi lại") | Hộp thoại: "Cần bật quyền camera trong Cài đặt" + **Mở Cài đặt** (`Linking.openSettings()`) · Chọn từ thư viện |

Quy tắc:
- Từ chối **không phải lỗi**; luôn có đường thay thế (Camera ↔ thư viện ảnh).
- Không hỏi lại cùng một quyền trong cùng phiên sau khi bị từ chối.
- Nội dung `Info.plist`/`app.json` (lý do quyền) phải khớp lời pre-prompt.

### 5.2 Xác nhận thành công

| Hành động | Phản hồi | Chi tiết |
| :--- | :--- | :--- |
| **Lưu món đồ** | Toast ✓ "Đã thêm vào tủ đồ" + rung nhẹ (haptic success) | Quay về danh sách, **món mới được làm nổi bật ~1.5 s** (viền/scale nhẹ) và cuộn tới vị trí |
| **Xác nhận mặc** | Toast ✓ "Đã lưu bộ đồ hôm nay" + haptic | Nút đổi thành trạng thái "Đã mặc" (✓), **vô hiệu hóa** để tránh ghi đúp. Toast có liên kết **Xem lịch sử** và **Hoàn tác** (5 s) |
| Sửa món | Toast "Đã cập nhật" | |
| Xóa món | Toast "Đã xóa" + **Hoàn tác** | |
| Khóa/đổi món | Không toast (đã có phản hồi trực quan 🔒/hoạt ảnh) | Tránh nhiễu |

Thông số toast: vị trí **trên thanh điều hướng dưới**, không che nút chính; 2.5 s (5 s nếu có Hoàn tác); `accessibilityLiveRegion="polite"`; một toast tại một thời điểm (toast mới thay toast cũ).

---

## 6. Bảng tổng hợp mã trạng thái (để dev bám theo)

| Trạng thái | Mã đề xuất | Khi nào |
| :--- | :--- | :--- |
| Đang tách nền | `bg:processing` | gửi `/image/process` |
| Tách nền xong | `bg:done` | có ảnh trong suốt |
| Tách nền lỗi | `bg:failed` → chọn `keepOriginal` / `retry` | 3.1 |
| Đang phối | `suggest:loading` | > 300 ms |
| Phối trống | `suggest:empty` (`reason: no_items | missing_category | no_match`) | 2.2 |
| Offline | `net:offline` | NetInfo hoặc request fail |
| Không vị trí | `geo:denied` / `geo:unavailable` | 4 |
| Quyền | `perm:undetermined` / `granted` / `denied` / `blocked` | 5.1 |

Ý định: mỗi màn hình dùng **một máy trạng thái nhỏ** (`idle → loading → success | error | empty`) thay vì nhiều cờ boolean rời rạc, để không xảy ra tổ hợp vô lý (vừa loading vừa empty).

## 7. Checklist nghiệm thu

- [ ] Tắt server → thêm món → vẫn **Giữ ảnh gốc & lưu** được
- [ ] Tủ đồ chỉ có áo → màn Phối đồ nói rõ thiếu quần/váy và có nút thêm đúng danh mục
- [ ] Bật chế độ máy bay → thẻ thời tiết ẩn, phối đồ vẫn ra bộ
- [ ] Từ chối GPS → không bị hỏi dồn, thời tiết ẩn, phối đồ vẫn chạy
- [ ] Từ chối Camera vĩnh viễn → có nút Mở Cài đặt và lối chọn từ thư viện
- [ ] Đăng nhập sai mật khẩu → lỗi hiển thị, nhập lại không phải gõ lại email
- [ ] Bấm Xác nhận mặc 2 lần liên tiếp chỉ ghi **1** lần
- [ ] Không có màn hình nào để trắng hoặc spinner vô tận (kiểm tra thủ công từng màn)
- [ ] Đọc bằng TalkBack: lỗi và toast được đọc lên