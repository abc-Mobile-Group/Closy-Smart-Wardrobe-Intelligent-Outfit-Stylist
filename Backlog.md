# Closy: Hướng dẫn chạy và bảo trì (cho người mới tiếp nhận)

Tài liệu này dành cho người mới vào dự án. Đọc xong có thể tự chạy server, build app, chạy demo và sửa lỗi thường gặp. Trạng thái hiện tại: **Sprint 1** (đăng nhập Google + khung app 3 tab).

## 1. Tổng quan

```
closy/
├── client/   React Native + Expo + TypeScript (app Android)
└── server/   FastAPI + Docker (đăng nhập Google, JWT)
```

Luồng đăng nhập:

```
Điện thoại: Google Sign-In -> id_token
   -> POST /auth/google (server verify token với Google)
   -> server trả JWT (hạn 7 ngày)
   -> app lưu JWT trong SecureStore, các request sau gắn "Authorization: Bearer <JWT>"
```

Server hiện có 3 endpoint: `GET /health`, `POST /auth/google`, `GET /me`. Endpoint `/image/process` (tách nền ảnh) thuộc Sprint 2, **chưa có**.

Dữ liệu tủ đồ nằm trên điện thoại (SQLite `closy.db`). Server chỉ lưu bảng `users`.

## 2. Yêu cầu cài đặt

| Công cụ | Dùng để |
|---|---|
| Docker + Docker Compose | Chạy server và tunnel |
| Node.js 20+ và npm | Chạy client |
| `eas-cli` (`npm i -g eas-cli`) | Build APK |
| Tài khoản Expo (https://expo.dev) | Đăng nhập `eas login` |
| Điện thoại Android | Chạy app (Google Sign-In không chạy trong Expo Go) |
| Python 3.11 (tùy chọn) | Chạy test server ngoài Docker |

## 3. Cấu hình lần đầu

### 3.1 Biến môi trường server

```bash
cd server
cp .env.example .env
```

Sửa `server/.env`:

```
GOOGLE_CLIENT_ID=<Web client ID từ Google Cloud>
JWT_SECRET=<chuỗi ngẫu nhiên dài>
DB_PATH=/data/closy.db
```

Tạo `JWT_SECRET`: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`

**Không commit `server/.env`.**

### 3.2 Biến môi trường client

```bash
cd client
cp .env.example .env
```

Sửa `client/.env`:

```
EXPO_PUBLIC_API_URL=<link tunnel hiện tại>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<cùng giá trị GOOGLE_CLIENT_ID của server>
```

Mọi biến `EXPO_PUBLIC_*` bị nhúng vào app và ai cũng đọc được. **Không đặt bí mật** (JWT_SECRET, API key) vào đây. Web client ID vốn không phải bí mật.

### 3.3 Google Cloud Console (làm 1 lần)

1. Tạo project, cấu hình OAuth consent screen.
2. Tạo **OAuth client ID loại Web application**. Đây là `GOOGLE_CLIENT_ID`.
3. Tạo **OAuth client ID loại Android**:
   - Package name: `com.nhom.closy` (khớp `android.package` trong `client/app.json`)
   - SHA-1: lấy bằng `eas credentials` (Android, profile `development`, xem mục Keystore). **Chỉ xem, đừng chọn "Set up a new keystore" hay "Delete" vì sẽ đổi mất SHA-1.**
4. Nếu app ở trạng thái **Testing**: thêm Gmail của mọi người cần đăng nhập vào **Test users** (Audience, hoặc OAuth consent screen ở giao diện cũ). Hoặc chuyển sang **In production** nếu muốn ai cũng đăng nhập được.

Mỗi build profile (`development`, `preview`, `production`) có thể dùng keystore khác. Build profile mới thì phải đăng ký thêm SHA-1 của nó.

### 3.4 Build APK development (làm 1 lần)

```bash
cd client
npm install
eas login
eas build --profile development --platform android
```

Mất khoảng 10-20 phút. Xong tải APK từ link EAS và cài vào điện thoại.

**Chỉ phải build lại khi đổi phần native**: cài thư viện native mới, sửa `app.json` (plugins, package, icon), nâng phiên bản Expo/React Native. Sửa code `.ts/.tsx`, đổi API URL thì **không** cần build lại.

## 4. Chạy demo hằng ngày

### Bước 1: bật server và lấy link tunnel

```bash
cd server
docker compose up -d
docker compose logs tunnel | grep trycloudflare | tail -1
```

Kiểm tra: `curl https://<link>/health` phải ra `{"ok":true}`.

Link tunnel miễn phí **đổi mỗi lần tunnel khởi động lại** (kể cả khi laptop mất mạng rồi tự kết nối lại).

### Bước 2: cập nhật link vào client

Dán link vào `client/.env` (dòng `EXPO_PUBLIC_API_URL`).

### Bước 3: chạy Metro (trong thư mục `client/`)

```bash
cd client
npx expo start --dev-client -c
```

`-c` xóa cache, bắt buộc khi vừa đổi `.env`.

### Bước 4: mở app trên điện thoại

Mở app **Closy (Development Build)**, bấm **Scan QR Code** và quét mã trong terminal.

Nếu báo `Failed to connect to <IP>:8081`: điện thoại không thấy laptop trong mạng (Wi-Fi chặn, firewall, khác mạng). Chạy bằng tunnel:

```bash
npx expo start --dev-client --tunnel -c
```

(lần đầu sẽ hỏi cài `@expo/ngrok`, bấm `y`). Nếu cùng Wi-Fi mà vẫn lỗi, thử `sudo ufw allow 8081`.

### Kịch bản demo

1. Bấm **Đăng nhập bằng Google** -> vào tab Tủ đồ.
2. Bấm **Kiểm tra kết nối server** -> hiện "Server OK. Tài khoản #<số>".
3. Tắt hẳn app, mở lại -> vẫn đăng nhập.
4. Bấm **Đăng xuất** -> về màn đăng nhập.

## 5. Cấu trúc code cần biết

### Client (`client/`)

| Đường dẫn | Việc |
|---|---|
| `app/_layout.tsx` | Gốc: mở DB, đọc phiên đăng nhập, điều hướng theo trạng thái đăng nhập |
| `app/index.tsx` | Trang `/`, chuyển hướng sang `/login` hoặc `/(tabs)/wardrobe` |
| `app/login.tsx` | Màn đăng nhập |
| `app/(tabs)/` | 3 tab: `wardrobe`, `add`, `suggest` |
| `app/item/[id].tsx` | Màn một món đồ (Sprint 2, hiện là placeholder) |
| `src/api/client.ts` | `apiFetch`: gắn JWT, timeout 15s, tự đăng xuất khi server trả 401 |
| `src/api/endpoints.ts` | Khai báo các endpoint (`authApi.google/me/health`) |
| `src/api/session.ts` | Lưu JWT trong SecureStore |
| `src/services/AuthService.ts` | Google Sign-In, đổi `id_token` lấy JWT |
| `src/store/authStore.ts` | Zustand: trạng thái đăng nhập (`loading`/`signedOut`/`signedIn`) |
| `src/db/` | Mở SQLite và migration |
| `src/constants/theme.ts` | Màu, khoảng cách, bo góc |

Các file trống trong `components/`, `repositories/`, `engine/`, `store/wardrobeStore.ts`... là chỗ dành cho Sprint 2-4, chưa làm.

Kiến trúc phân lớp: **UI -> Store -> Service -> Repository -> DB**. Giữ đúng hướng gọi này khi thêm tính năng.

### Server (`server/main.py`)

- `/health`: kiểm tra sống.
- `/auth/google`: verify Google ID token (kiểm tra email đã xác minh), tạo user nếu chưa có, trả `{token, expires_at, email}`.
- `/me`: cần JWT, trả thông tin tài khoản. Không token hoặc token hết hạn trả 401.
- Hạn JWT: 7 ngày (`TOKEN_TTL`).

## 6. Bảo trì

### Thêm migration cho DB trên điện thoại

Sửa `client/src/db/migrations.ts`: **chỉ thêm phần tử mới vào cuối mảng `MIGRATIONS`, không sửa phần tử cũ.** Phiên bản schema lưu ở `PRAGMA user_version`. Máy đã chạy migration cũ sẽ chỉ chạy phần mới.

### Thêm endpoint mới

1. Thêm route trong `server/main.py`. Route cần đăng nhập thì thêm `uid: int = Depends(current_user_id)`.
2. Thêm test trong `server/tests/test_api.py`.
3. Khai báo hàm gọi trong `client/src/api/endpoints.ts`.

### Chạy test và kiểm tra kiểu

```bash
# Server
cd server
pip install -r requirements.txt -r requirements-dev.txt
pytest -q

# Client
cd client
npx tsc --noEmit
```

CI (`ci.yml`) chạy cả hai khi push lên `main`/`develop` và khi mở pull request. Lưu ý file workflow phải nằm ở `.github/workflows/ci.yml` thì GitHub mới chạy.

### Đổi package name, icon hoặc thêm thư viện native

Phải build lại APK (mục 3.4). Đổi package name còn phải cập nhật Android OAuth client trong Google Cloud.

### Link server cố định

Tunnel miễn phí đổi link liên tục và phụ thuộc laptop bật. Với bản giao khách nên dùng Cloudflare Tunnel có tên + domain riêng hoặc đưa server lên host. Lưu ý link nhúng trong APK `preview`/`production` là link tại thời điểm build, nên link đổi thì app cũ gọi sai.

### Bảo mật

- Không commit `server/.env` và nên giữ `client/.env` ngoài git (kiểm tra `.gitignore`).
- Nếu `JWT_SECRET` từng bị lộ, đổi giá trị mới (mọi người dùng sẽ phải đăng nhập lại).
- Mọi endpoint trừ `/health` và `/auth/google` phải yêu cầu JWT.

## 7. Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `curl: Could not resolve host: xxxx...` | Dùng link mẫu `xxxx` | Dùng link thật từ `docker compose logs tunnel` |
| Log tunnel: `lookup api.trycloudflare.com ... server misbehaving` | Laptop mất mạng/DNS tạm thời | Chờ tunnel tự thử lại, rồi lấy **link mới** và cập nhật `client/.env` |
| `ConfigError: package.json path does not exist` | Chạy `npx expo` sai thư mục (đang ở `server/`) | `cd client` rồi chạy lại |
| `Failed to connect to <IP>:8081` | Điện thoại không tới được Metro | Chạy `npx expo start --dev-client --tunnel -c` |
| `Unmatched Route` ở `closy:///` | Thiếu `app/index.tsx` | Tạo file `app/index.tsx` redirect theo trạng thái đăng nhập |
| Expo Router cảnh báo thiếu default export | `app/item/[id].tsx` rỗng | Thêm `export default function ItemScreen() { return null; }` |
| Đăng nhập báo `DEVELOPER_ERROR` | Chưa tạo Android OAuth client, hoặc SHA-1/package sai | Kiểm tra mục 3.3 |
| Google báo "Access blocked" | App ở Testing và Gmail chưa nằm trong Test users | Thêm Gmail vào Test users |
| "Kiểm tra kết nối server" báo "Không kết nối được server" | `EXPO_PUBLIC_API_URL` sai/link tunnel đã chết | Lấy link mới, sửa `.env`, chạy lại Metro với `-c` |
| "Chưa cấu hình EXPO_PUBLIC_API_URL" | `.env` thiếu hoặc chưa nạp | Kiểm tra `client/.env`, chạy lại Metro với `-c` |
| App tự đăng xuất | JWT hết hạn (7 ngày) hoặc server trả 401 | Đăng nhập lại. Nếu xảy ra liên tục, kiểm tra `JWT_SECRET` server có bị đổi không |
| Đổi `.env` mà app vẫn dùng giá trị cũ | Biến được nhúng lúc bundle | Tắt Metro, chạy lại `npx expo start --dev-client -c`, rồi Reload app |

## 8. Lộ trình

| Sprint | Nội dung | Trạng thái |
|---|---|---|
| 1 | Đăng nhập Google, JWT, khung 3 tab, SQLite migration | Đang làm |
| 2 | Thêm/sửa/xóa món đồ, `/image/process` (tách nền, lấy màu) | Chưa làm |
| 3 | Engine gợi ý bộ đồ (chạy trên máy) | Chưa làm |
| 4 | Thống kê, lịch sự kiện, phân tích tủ đồ | Chưa làm |

Chi tiết thiết kế xem `Docs/README.md`, sơ đồ file xem `Docs/FileTree.md`.