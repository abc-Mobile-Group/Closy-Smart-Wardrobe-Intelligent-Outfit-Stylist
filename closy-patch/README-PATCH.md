# Bản vá: trạng thái tương tác và xử lý lỗi

## 1. Hiện trạng code so với yêu cầu (trước khi vá)

| Yêu cầu | Trạng thái trước khi vá | Sau khi vá |
|---|---|---|
| **Loading**: đang tách nền AI | Đạt (spinner, nút Lưu bị mờ) | Giữ nguyên |
| **Loading**: đang tạo gợi ý | Màn Gợi ý có spinner nhưng ghi "Backend AI Stylist" (sai, engine chạy trên máy). Màn Hôm nay **không có** | Skeleton "Closy đang phối đồ cho bạn..." ở cả hai màn, chỉ hiện khi chờ quá 300 ms (không nháy) |
| **Empty**: tủ đồ trống | Đạt | Giữ nguyên |
| **Incomplete**: có 3 áo, chưa có quần | **Chưa**: chỉ có câu chung chung | Nêu rõ "Bạn có 3 áo nhưng chưa có quần hoặc chân váy", nút "Thêm quần/váy" mở sẵn danh mục Quần |
| **Error**: tách nền lỗi + giữ ảnh gốc | **Chưa**: lặng lẽ dùng ảnh gốc, không báo | Banner "Chưa tách được nền" + [Dùng ảnh gốc] [Thử lại] [Chọn ảnh khác] |
| **Error**: lỗi nhập liệu Đăng nhập/Đăng ký | Một hộp lỗi đỏ phía trên form | Lỗi hiện ngay dưới từng ô, ô lỗi viền đỏ, cập nhật theo lúc gõ. Lỗi từ server vẫn ở hộp phía trên |
| **Error**: lỗi mạng | Hiện chuỗi kỹ thuật `[TypeError]...` | Câu tiếng Việt dễ hiểu |
| **Error**: phiên hết hạn | Tự đăng xuất, không báo | Màn Đăng nhập báo "Phiên đăng nhập đã hết hạn" |
| **Offline / No GPS**: ẩn thời tiết, vẫn phối đồ | **Sai**: hiện "Hà Nội 26°" như thể là thật | Ẩn thẻ, thay bằng chip "Chưa có thời tiết · chạm để bật vị trí / thử lại". Phối đồ dùng thời tiết trung tính. Mất mạng vẫn dùng bản cache dưới 3 giờ |
| **Permission**: xin quyền Camera theo ngữ cảnh | Xin ngay khi chạm, không giải thích trước | Màn giải thích của Closy trước hộp thoại hệ thống. Bị từ chối thì có [Mở Cài đặt] / [Chọn từ thư viện] |
| **Permission**: xin quyền GPS theo ngữ cảnh | **Sai**: xin ngay khi mở Hôm nay, không giải thích | Màn giải thích trước, nút [Cho phép] [Để sau] |
| **Success**: sau khi lưu món | **Chưa**: chuyển thẳng về Tủ đồ | Toast "Đã thêm vào tủ đồ" |
| **Success**: sau "Xác nhận mặc" | Đạt (banner ở Lịch sử) | Thêm chống bấm đúp (nút mờ khi đang lưu) |

## 2. Cách áp dụng

```bash
# 1. Commit hết thay đổi hiện tại để dễ hoàn tác
git add -A && git commit -m "chore: trước khi vá trạng thái tương tác"

# 2. Chép thư mục closy-patch/ vào thư mục gốc repo, rồi chạy kiểm tra (không ghi gì)
python3 closy-patch/apply_patch.py --check

# 3. Nếu mọi dòng đều [OK] thì áp dụng thật
python3 closy-patch/apply_patch.py

# 4. Kiểm tra
cd client && npx tsc --noEmit && npm test
```

- Script chỉ ghi một file khi **tất cả** chỗ sửa của file đó khớp. Dòng `[LỖI]` cho biết đoạn nào không tìm thấy (code đã khác bản mẫu); khi đó sửa tay đoạn đó theo bảng ở mục 1.
- Chạy lại nhiều lần an toàn (chỗ đã vá thì bỏ qua).
- Hoàn tác: `git checkout -- client/ && git clean -fd client/src/components client/src/utils client/__tests__/wardrobeGaps.test.ts`.

## 3. Phải build lại APK

`client/app.json` được thêm plugin `expo-image-picker` và `expo-location` (khai báo quyền Camera/Vị trí và lời giải thích hệ thống). Đây là thay đổi **native**, nên sau khi vá phải:

```bash
cd client
npx expo install --check
eas build -p android --profile development
```
Cài APK mới đè lên bản cũ (không mất dữ liệu), rồi `npx expo start --dev-client -c`. Không có thư viện native mới nào ngoài hai plugin trên (đã có sẵn trong `package.json`).

## 4. Kiểm tra trên điện thoại (khoảng 10 phút)

| Trạng thái | Cách tạo | Kết quả đúng |
|---|---|---|
| Loading gợi ý | Tủ đồ lớn, đổi bối cảnh liên tục | Không nháy với tủ nhỏ; có skeleton nếu chờ lâu |
| Incomplete | Tài khoản mới, thêm 3 áo, không thêm quần | Nêu "3 áo nhưng chưa có quần"; nút mở màn Thêm món với danh mục Quần đã chọn |
| Tách nền lỗi | Tắt server (hoặc máy bay) rồi chọn ảnh | Banner vàng, ảnh gốc vẫn hiện, [Dùng ảnh gốc] tắt banner và lưu được |
| Lỗi nhập liệu | Bấm Đăng nhập/Đăng ký khi bỏ trống | Viền đỏ + dòng lỗi dưới từng ô; gõ vào thì lỗi biến mất |
| Phiên hết hạn | Đổi `JWT_SECRET` trên server, restart, mở lại app | Màn Đăng nhập có "Phiên đăng nhập đã hết hạn" |
| Không GPS | Gỡ app cài lại, mở Hôm nay, bấm [Để sau] | Không có thẻ thời tiết, có chip nhỏ; vẫn ra 3 bộ đồ |
| Offline | Có GPS nhưng bật máy bay (sau 3 giờ chưa có cache) | Như trên, chip "chạm để thử lại" |
| Xin quyền GPS | Gỡ cài lại, mở Hôm nay | Màn giải thích "Xem thời tiết nơi bạn ở?" trước hộp thoại hệ thống |
| Xin quyền Camera | Gỡ cài lại, Thêm món → Chụp ảnh | Màn giải thích trước; từ chối vĩnh viễn thì có [Mở Cài đặt] |
| Toast lưu món | Lưu một món | Toast "Đã thêm vào tủ đồ" ở Tủ đồ, tự tắt sau 2.5 giây |
| Xác nhận mặc | Bấm "Xác nhận mặc" liên tiếp | Chỉ ghi 1 lần, mở Lịch sử có banner |

## 5. Những điều chưa làm hoặc chưa chắc

- **Chưa chạy được trên điện thoại hay repo thật.** Mình đã kiểm tra: các file mới biên dịch sạch với `tsc`, `describeMissing` cho kết quả đúng ở 5 tình huống, và script áp dụng đúng + chạy lại không trùng trên file mô phỏng. Chỗ chưa kiểm chứng là các đoạn vá vào màn hình thật (`today.tsx`, `add-item.tsx`...); `--check` sẽ báo ngay nếu có đoạn lệch.
- **Hộp thoại quyền "Thư viện ảnh"** chưa có màn giải thích riêng (Android 13+ không cần xin quyền khi chọn ảnh bằng trình chọn của hệ thống). Nếu bị từ chối thì có nút Mở Cài đặt.
- **Không dùng NetInfo** (cần thêm thư viện native). "Offline" được nhận biết qua việc lấy thời tiết thất bại, không có banner "Đang offline" riêng.
- Tách nền quá 35 giây khi Ollama chậm vẫn rơi vào nhánh lỗi (banner hiện đúng), nhưng nguyên nhân gốc (server thử nhiều host/model) chưa sửa.
- Banner "Đã lưu bộ đồ hôm nay" ở Lịch sử vẫn hiện lại mỗi lần quay về tab (lỗi cũ, chưa nằm trong bản vá).
- Nhớ cập nhật `Docs`: các mục #2, #3, #4, #5, #6, #7 trong `06-Tinh-trang-va-no-ky-thuat.md` và các dòng R1, R6, O1, P3, P4, E3 trong bảng 8.3 của Wiki chuyển từ "Chỉ thiết kế" sang "Đã làm" sau khi bạn kiểm tra trên máy thật.
