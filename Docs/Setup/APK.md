# Build và cài APK

## Chuẩn bị (một lần)
1. `npm i -g eas-cli && eas login`
2. Google Cloud Console: tạo **Web client ID** (server verify) và **Android client ID** với **SHA-1 của khóa ký bản build**.
   Lấy SHA-1: `eas credentials -p android` → Keystore → SHA-1. Bản debug và bản EAS có SHA-1 khác nhau, đăng ký đúng bản đang dùng.
3. Đặt biến môi trường cho build (không commit `.env`):
```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://api.example.com --environment preview
eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <web-client-id> --environment preview
```

## Build
```bash
cd client
eas build -p android --profile preview    # ra file .apk, tải về từ link EAS
```
Đăng nhập Google chỉ chạy trên bản build (preview/development), **không chạy trong Expo Go**.

## Cài lên điện thoại
1. Chép file `.apk` vào máy (hoặc mở link EAS trên điện thoại).
2. Cho phép "Cài ứng dụng từ nguồn không xác định" cho trình duyệt/trình quản lý tệp.
3. Mở file → Cài đặt → Mở Closy.

## Checklist trước khi giao (máy sạch)
- [ ] Cài APK thành công
- [ ] Đăng nhập Gmail được; tắt mở app vẫn còn phiên; Đăng xuất hoạt động
- [ ] Thêm 1 món (chọn ảnh → Lưu) trong ≤ 4 chạm
- [ ] Xem, sửa, xóa món; tắt mở app dữ liệu còn
- [ ] Tắt server: thêm món vẫn lưu được ảnh gốc
- [ ] Server online đúng khung giờ đã báo khách
