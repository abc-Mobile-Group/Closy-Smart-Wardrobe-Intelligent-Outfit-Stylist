# 05. Build APK và giao khách

> Dùng khi cần cho người khác cài app thử, hoặc bật đăng nhập Google.
> **Mọi lệnh `eas` chạy trong `client/`.** Thư mục gốc có `app.json` và `eas.json` riêng với `projectId` khác, dễ nhầm.

## 1. Google Cloud Console (làm một lần, hay mất thời gian nhất)

1. Tạo project, cấu hình màn hình đồng ý OAuth.
2. Tạo **OAuth client ID loại Web application** → đây là `GOOGLE_CLIENT_ID` (server) và `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (client).
3. Tạo **OAuth client ID loại Android**:
   - Package name: `com.nhom.closy` (phải khớp `android.package` trong `client/app.json`)
   - SHA-1: lấy bằng `eas credentials -p android` → Keystore → SHA-1.
     **Chỉ xem.** Đừng chọn "Set up a new keystore" hay "Delete", vì sẽ đổi mất SHA-1.
4. Kiểm tra mục Clients phải có đủ 2 dòng (Web và Android). Android client mới tạo có thể mất tới ~10 phút mới có hiệu lực.
5. Nếu app ở trạng thái **Testing**: thêm Gmail của mọi người cần đăng nhập vào **Test users** (mục Audience); hoặc chuyển sang **In production**.
6. Mỗi build profile có thể dùng keystore khác nhau (và bản debug khác bản EAS). Profile mới phải đăng ký thêm SHA-1 của nó.
7. Giao diện Google Cloud hay đổi; đối chiếu tài liệu hiện hành của `@react-native-google-signin/google-signin`.

## 2. Các profile build (`client/eas.json`)

| Profile | Ra file | Dùng để |
| :--- | :--- | :--- |
| `development` | APK (có dev client) | Phát triển, chạy với `expo start --dev-client` |
| `preview` | APK | **Giao khách / demo độc lập** (không cần `expo start`) |
| `production` | AAB (app bundle) | Đưa lên cửa hàng |

## 3. Chuẩn bị biến môi trường cho bản build

Bản build trên EAS **không đọc** `client/.env` của máy bạn. Đặt biến bằng EAS (không commit):
```bash
cd client
eas env:create --name EXPO_PUBLIC_API_URL --value https://api.example.com --environment preview
eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <web-client-id> --environment preview
```
`EXPO_PUBLIC_API_URL` bị **nhúng cứng** vào APK lúc build. Link đổi thì app đã cài sẽ gọi sai.

## 4. Link server cố định (bắt buộc trước khi giao khách)

Link `trycloudflare` miễn phí đổi mỗi lần chạy lại. Dùng **Cloudflare Tunnel có tên** (cần một domain):

1. Cloudflare Zero Trust → Networks → Tunnels → tạo tunnel, trỏ hostname (vd `api.example.com`) tới `http://api:8000`, copy token.
2. Thêm vào `server/.env`: `TUNNEL_TOKEN=...`
3. Sửa service `tunnel` trong `docker-compose.yml` (gốc):
```yaml
  tunnel:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    depends_on: [api]
    restart: unless-stopped
```
Hoặc dùng Tailscale Funnel, hoặc đưa server lên một host. Laptop làm server thì phải **cắm sạc, tắt sleep** và báo khung giờ server online. Bản giao khách nên bỏ hai dòng bind-mount `main.py`, `color_extractor.py` trong compose (xem file 02).

## 5. Build và cài

```bash
cd client
eas build -p android --profile preview      # ra APK, tải từ link EAS
```
Cài trên điện thoại:
1. Chép `.apk` vào máy (hoặc mở link EAS trên điện thoại).
2. Cho phép "Cài ứng dụng từ nguồn không xác định" cho trình duyệt/trình quản lý tệp.
3. Mở file → Cài đặt → Mở Closy.

Bản release **bắt buộc HTTPS** để gọi server (HTTP thường bị chặn mặc định).

## 6. Checklist trước khi giao (làm trên máy sạch)

- [ ] Cài APK thành công
- [ ] Đăng nhập Gmail được; tắt mở app vẫn còn phiên; Đăng xuất hoạt động
- [ ] Đăng ký/đăng nhập bằng email hoạt động
- [ ] Thêm 1 món (chọn ảnh → Lưu) trong ≤ 4 chạm
- [ ] Xem, sửa, xóa món; tắt mở app dữ liệu còn
- [ ] Phối đồ, khóa/đổi món, xác nhận mặc, xem Lịch sử
- [ ] Tắt server: vẫn phối đồ được; thêm món vẫn lưu được (ảnh gốc)
- [ ] Server online đúng khung giờ đã báo khách
- [ ] Đã ghi số liệu tách nền vào `Benchmark.md`

## 7. Các việc **chưa được kiểm chứng** (cần người có thiết bị làm)
Đăng nhập Google trên máy thật, bản build `preview` trên máy sạch, thời gian tách nền thực tế. Làm xong thì đánh dấu lại ở file 06.
