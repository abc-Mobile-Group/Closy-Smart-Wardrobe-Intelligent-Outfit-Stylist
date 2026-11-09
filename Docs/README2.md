# Closy — Sprint 1 (Auth + khung app)

```
closy/
├── client/   React Native + Expo (TypeScript)
└── server/   FastAPI + Docker (đăng nhập Google, JWT)
```

## 1. Google Cloud Console (làm đầu tiên, hay mất thời gian nhất)

1. Tạo project, cấu hình màn hình đồng ý OAuth.
2. Tạo **OAuth client ID loại "Web application"** → đây là `GOOGLE_CLIENT_ID` (server) và `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (client).
3. Tạo **OAuth client ID loại "Android"**: nhập package name (`android.package` trong `app.json`) và **SHA-1** của khóa ký app.
   - Lấy SHA-1 của bản build EAS: `eas credentials` (chọn Android → keystore).
   - SHA-1 bản debug và bản EAS **khác nhau**; đăng ký cái bạn đang dùng.
4. Giao diện Google Cloud hay đổi, đối chiếu tài liệu hiện hành của `@react-native-google-signin/google-signin`.

## 2. Chạy server

```bash
cd server
cp .env.example .env        # điền GOOGLE_CLIENT_ID, JWT_SECRET
docker compose up --build -d
docker compose logs tunnel | grep trycloudflare    # lấy link https://xxxx.trycloudflare.com
curl https://xxxx.trycloudflare.com/health         # {"ok": true}
```

Test cùng Wi-Fi: `http://IP-laptop:8000/health`. Link tunnel miễn phí **đổi mỗi lần chạy lại**.

Chạy test: `pip install -r requirements.txt -r requirements-dev.txt && pytest -q`

## 3. Dựng client

```bash
npx create-expo-app@latest client-tmp        # template mặc định có Expo Router + TypeScript
```

Sau đó:

1. Xóa các màn hình mẫu của template (`app/`, `components/`, `hooks/`, `constants/`, `scripts/`...).
2. Chép **thư mục `app/`, `src/`, `eas.json`, `.env.example`** của repo này vào project.
3. Cài thư viện:
   ```bash
   npx expo install expo-secure-store expo-sqlite @expo/vector-icons
   npm install zustand @react-native-google-signin/google-signin
   ```
4. Trong `app.json` thêm `android.package` (ví dụ `com.nhom.closy`) và plugin:
   ```json
   "plugins": ["expo-router", "expo-secure-store", "@react-native-google-signin/google-signin"]
   ```
   (Bản mới của thư viện có thể yêu cầu cấu hình plugin thêm cho iOS; xem tài liệu.)
5. `cp .env.example .env`, điền `EXPO_PUBLIC_API_URL` và `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

## 4. Chạy trên điện thoại

Google Sign-In là module native, **không chạy trong Expo Go**. Dùng development build:

```bash
npm install -g eas-cli && eas login
eas build --profile development --platform android    # cài file APK nhận được vào máy
npx expo start --dev-client
```

Bản demo/giao khách: `eas build --profile preview --platform android` (ra APK).

## 5. Nghiệm thu Sprint 1

- [ ] Đăng nhập Gmail thành công trên điện thoại thật.
- [ ] Bấm "Kiểm tra kết nối server" ở tab Tủ đồ → hiện "Server OK".
- [ ] `/me` không token trả 401 (đã có test tự động).
- [ ] Tắt hẳn app, mở lại: vẫn đăng nhập.
- [ ] Đăng xuất → quay về màn đăng nhập.
- [ ] Phiên hết hạn (7 ngày) → quay về màn đăng nhập.
- [ ] 3 tab hiển thị đúng; DB `items` được tạo (migration v1).

## Ghi chú

- Phần **client chưa chạy thử trên thiết bị** trong lúc viết: cần bạn chạy bước 3-4 và báo lỗi nếu có.
- Phiên bản thư viện thay đổi nhanh; nếu `signIn()` trả về dạng khác, sửa ở `src/services/AuthService.ts`.
- Một máy dùng nhiều tài khoản sẽ **dùng chung một DB cục bộ** ở Sprint 1; tách DB theo tài khoản nếu cần.
