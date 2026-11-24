# Closy: Hướng dẫn cài đặt, chạy, build và bảo trì

Tài liệu hợp nhất từ 4 file: `file cũ.md`, `hướng dẫn.md`, `Runcode.md`, `APK.md`. Dành cho người mới vào dự án: đọc xong có thể tự chạy server, build app, chạy demo, giao APK và sửa lỗi thường gặp.

## Mục lục

1. Tổng quan
2. Yêu cầu cài đặt
3. Cấu hình lần đầu
4. Chạy server
5. Chạy client và demo hằng ngày
6. Build APK và giao khách
7. Cấu trúc code cần biết
8. Bảo trì
9. Xử lý lỗi thường gặp
10. Lộ trình

---

## 1. Tổng quan

Repo gồm 3 phần:

```
closy/
├── client/   React Native + Expo + TypeScript (app Android, có thể chạy web)
├── server/   FastAPI + Docker (backend chính: đăng nhập, xử lý ảnh)
└── src/      API NestJS ở thư mục gốc (backend riêng cho bài tập, deploy Render, không liên quan tới client)
```

Luồng đăng nhập Google:

```
Điện thoại: Google Sign-In -> id_token
   -> POST /auth/google (server verify token với Google)
   -> server trả JWT (hạn 7 ngày)
   -> app lưu JWT trong SecureStore, các request sau gắn "Authorization: Bearer <JWT>"
```

Endpoint của server FastAPI (theo các file mới nhất):

- `GET /health`: kiểm tra sống.
- `POST /auth/google`: đăng nhập Google.
- `POST /auth/register`, `POST /auth/login`: đăng nhập bằng email, dùng được mà không cần Google.
- `GET /me`: thông tin tài khoản (cần JWT).
- `POST /image/process`: tách nền ảnh, lấy màu, nhận diện loại đồ.

Dữ liệu tủ đồ nằm trên điện thoại (SQLite `closy.db`). Server chỉ lưu bảng `users`.

> Lưu ý: `file cũ.md` được viết ở thời điểm Sprint 1 và ghi `/image/process` chưa có. `Runcode.md` và `hướng dẫn.md` cho thấy endpoint này đã có, nên bản hợp nhất này theo các file mới hơn. Hãy đối chiếu với `server/main.py` để chắc chắn.

## 2. Yêu cầu cài đặt

| Công cụ | Dùng để |
|---|---|
| Docker + Docker Compose (Docker Desktop) | Chạy server và tunnel |
| Node.js 20+ và npm | Chạy client, API NestJS |
| `eas-cli` (`npm i -g eas-cli`) | Build APK |
| Tài khoản Expo (https://expo.dev) | Đăng nhập `eas login` |
| Điện thoại Android | Chạy app (Google Sign-In không chạy trong Expo Go) |
| Python 3.11 (tùy chọn) | Chạy server và test ngoài Docker |
| Ollama + model `gemma4:e4b` (tùy chọn) | Nhận diện loại đồ bằng AI. Không có thì server tự fallback sang heuristic hình học |
| Model rembg `u2net.onnx` trong `server/.models/` | Tách nền ảnh. Thư mục nặng (~170MB), **đừng commit** |

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

Tạo `JWT_SECRET`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

**Không commit `server/.env`.**

### 3.2 Biến môi trường client

```bash
cd client
cp .env.example .env
```

Sửa `client/.env`:

```
EXPO_PUBLIC_API_URL=<link tunnel hiện tại, hoặc http://localhost:8000, hoặc http://192.168.x.x:8000>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<cùng giá trị GOOGLE_CLIENT_ID của server>
```

- `EXPO_PUBLIC_API_URL` không có dấu `/` ở cuối.
- Mọi biến `EXPO_PUBLIC_*` bị nhúng vào app và ai cũng đọc được. **Không đặt bí mật** (JWT_SECRET, API key) vào đây. Web client ID vốn không phải bí mật.
- Điện thoại không gọi được `localhost`. Dùng IP LAN của laptop hoặc link tunnel.

### 3.3 Google Cloud Console (làm 1 lần)

1. Tạo project, cấu hình OAuth consent screen.
2. Tạo **OAuth client ID loại Web application**. Đây là `GOOGLE_CLIENT_ID`.
3. Tạo **OAuth client ID loại Android**:
   - Package name: `com.nhom.closy` (khớp `android.package` trong `client/app.json`).
   - SHA-1: lấy bằng `eas credentials -p android` → chọn Keystore → xem SHA-1. **Chỉ xem, đừng chọn "Set up a new keystore" hay "Delete" vì sẽ đổi mất SHA-1.**
4. Kiểm tra mục Clients phải có đủ 2 dòng (Web và Android).
5. Nếu app ở trạng thái **Testing**: thêm Gmail của mọi người cần đăng nhập vào **Test users** (Audience, hoặc OAuth consent screen ở giao diện cũ). Hoặc chuyển sang **In production** nếu muốn ai cũng đăng nhập được.

Mỗi build profile (`development`, `preview`, `production`) có thể dùng keystore khác, và bản debug với bản EAS cũng có SHA-1 khác nhau. Build profile mới thì phải đăng ký thêm SHA-1 của nó. Android client mới tạo có thể mất tới 10 phút mới có hiệu lực.

### 3.4 Build APK development (làm 1 lần)

```bash
cd client
npm install
eas login
eas build --profile development --platform android
```

Mất khoảng 10-20 phút. Xong tải APK từ link EAS và cài vào điện thoại.

**Chỉ phải build lại khi đổi phần native**: cài thư viện native mới (ví dụ `expo-image-picker`), sửa `app.json` (plugins, package, icon), nâng phiên bản Expo/React Native. Sửa code `.ts/.tsx` hoặc đổi API URL thì **không** cần build lại.

### 3.5 Ollama (nếu demo tính năng nhận diện)

```bash
ollama pull gemma4:e4b
```

Server chạy trong Docker gọi Ollama ở máy host. Trên Linux, Ollama thường chỉ nghe ở `127.0.0.1` nên container không gọi tới được. Nếu tính năng nhận diện báo lỗi kết nối, đặt `OLLAMA_HOST=0.0.0.0` khi chạy Ollama (cách làm chính xác phụ thuộc cách cài, xem tài liệu Ollama hiện hành).

## 4. Chạy server

### 4.1 Bằng Docker (khuyến nghị)

Chạy từ **thư mục gốc** (docker-compose.yml ở gốc build từ `./server`):

```bash
# Tắt stack cũ nếu còn (tránh lỗi "port 8000 already allocated")
docker compose down

# Chạy đầy đủ (web + API + tunnel)
docker compose up --build -d

# Hoặc chỉ chạy API + tunnel khi demo bằng dev build (không bật web, vì nó chiếm cổng 8081 của Expo)
docker compose up -d api tunnel
docker compose ps                      # api và tunnel phải "running"
```

Kiểm tra:

```bash
curl http://localhost:8000/health      # {"ok": true}
# Web (nếu bật): http://localhost:8081
```

Lấy link public cho điện thoại (đợi ~10 giây sau khi bật):

```bash
docker compose logs tunnel | grep trycloudflare | tail -1
curl https://<link>/health             # phải ra {"ok":true}
```

Link tunnel miễn phí **đổi mỗi lần tunnel khởi động lại** (kể cả khi laptop mất mạng rồi tự kết nối lại).

Lưu ý khi chạy Docker:

- **Model rembg:** compose mount `./server/.models` ở chế độ **read-only** (`:ro`) và đặt `REMBG_HOME=/models`, nên container không tự tải được model. Tải `u2net.onnx` vào `server/.models/` trước, hoặc chạy server local một lần để nó tự tải (mục 4.2). Nếu không, `/image/process` sẽ lỗi.
- **Ollama:** xem mục 3.5. Không có Ollama thì server dùng heuristic hình học.
- **`color_extractor.py`:** `main.py` import `color_extractor`, hãy chắc file này nằm trong `server/`.
- **Thiếu `libgomp`:** nếu `onnxruntime` báo thiếu `libgomp.so`, thêm vào `server/Dockerfile`:
  ```dockerfile
  RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
  ```
- **API URL của web:** `EXPO_PUBLIC_API_URL` được nhúng lúc **build**. Đổi URL thì phải build lại (`--build`).

### 4.2 Không dùng Docker (khi dev)

```bash
cd server
python -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env                   # sửa JWT_SECRET
uvicorn main:app --reload --port 8000
pytest -q                              # chạy test
```

Lần đầu `rembg` sẽ tự tải model u2net (~170MB) vào `server/.models`, nên cần có mạng.

### 4.3 API NestJS (thư mục gốc, riêng cho bài tập)

```bash
npm install
npm run start:dev        # http://localhost:3000/docs (Swagger)
# hoặc: npm run build && npm start
```

Vấn đề đã biết:

- `app.module.ts` import `./wardrobe/wardrobe.module` và `./outfits/outfits.module`, nhưng hai thư mục này chưa có trong các file đã gửi. Thiếu chúng thì build sẽ fail.
- `Dockerfile` ở gốc là của NestJS, còn `docker-compose.yml` ở gốc lại build từ `./server`, nên hai thứ này không đi chung với nhau.

## 5. Chạy client và demo hằng ngày

### 5.1 Quy trình mỗi buổi (dev build)

1. Bật server + tunnel (mục 4.1), lấy link tunnel và kiểm tra `/health`.
2. Dán link vào `client/.env` (`EXPO_PUBLIC_API_URL`).
3. Bật Metro, **trong thư mục `client/`**:
   ```bash
   cd client
   npm install
   npx expo start --dev-client -c
   ```
   `-c` xóa cache, bắt buộc khi vừa đổi `.env`.
4. Điện thoại **cùng Wi-Fi** với laptop → mở app **Closy (Development Build)** → bấm **Scan QR Code** (hoặc chọn máy chủ dev) → đăng nhập Google.

Nếu báo `Failed to connect to <IP>:8081`: điện thoại không thấy laptop trong mạng (Wi-Fi chặn, firewall, khác mạng). Chạy bằng tunnel:

```bash
npx expo start --dev-client --tunnel -c
```

(lần đầu sẽ hỏi cài `@expo/ngrok`, bấm `y`). Nếu cùng Wi-Fi mà vẫn lỗi, thử `sudo ufw allow 8081` hoặc phát hotspot từ điện thoại.

### 5.2 Chạy trên web

```bash
cd client
npm run web
```

### 5.3 Điều kiện bắt buộc khi demo

- Laptop **bật, cắm sạc, không sleep**; Docker đang chạy; Ollama đang chạy (nếu demo nhận diện).
- Điện thoại cài **bản development build** (không phải Expo Go).
- Link tunnel **mới** trong `client/.env`.

### 5.4 Kịch bản demo

1. Bấm **Đăng nhập bằng Google** → vào tab Tủ đồ.
2. Bấm **Kiểm tra kết nối server** → hiện "Server OK. Tài khoản #<số>".
3. Tắt hẳn app, mở lại → vẫn đăng nhập.
4. Bấm **Đăng xuất** → về màn đăng nhập.

## 6. Build APK và giao khách

### 6.1 Hai kiểu "demo"

| Kiểu | Cần laptop? | Dùng khi |
|---|---|---|
| **Dev build** (mục 5) | Có, cả `expo start` lẫn Docker | Đang phát triển, demo nội bộ |
| **APK preview** (`eas build --profile preview`) | Chỉ cần Docker + tunnel, không cần `expo start` | Giao khách, demo độc lập |

APK preview **nhúng cứng link server lúc build**. Link tunnel miễn phí đổi liên tục nên app giao khách sẽ hỏng. Trước khi giao cần **link cố định** (Tailscale Funnel, hoặc Cloudflare Tunnel có tên với domain riêng, hoặc đưa server lên host), rồi mới build preview.

### 6.2 Chuẩn bị build preview (một lần)

1. `npm i -g eas-cli && eas login`
2. Google Cloud Console: có **Web client ID** (server verify) và **Android client ID** với **SHA-1 của khóa ký bản build** đang dùng. Lấy SHA-1: `eas credentials -p android` → Keystore → SHA-1.
3. Đặt biến môi trường cho build (không commit `.env`):
   ```bash
   eas env:create --name EXPO_PUBLIC_API_URL --value https://api.example.com --environment preview
   eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <web-client-id> --environment preview
   ```

### 6.3 Build

```bash
cd client
eas build -p android --profile preview    # ra file .apk, tải về từ link EAS
```

Đăng nhập Google chỉ chạy trên bản build (preview/development), **không chạy trong Expo Go**.

### 6.4 Cài lên điện thoại

1. Chép file `.apk` vào máy (hoặc mở link EAS trên điện thoại).
2. Cho phép "Cài ứng dụng từ nguồn không xác định" cho trình duyệt/trình quản lý tệp.
3. Mở file → Cài đặt → Mở Closy.

### 6.5 Checklist trước khi giao (máy sạch)

- [ ] Cài APK thành công
- [ ] Đăng nhập Gmail được; tắt mở app vẫn còn phiên; Đăng xuất hoạt động
- [ ] Thêm 1 món (chọn ảnh → Lưu) trong ≤ 4 chạm
- [ ] Xem, sửa, xóa món; tắt mở app dữ liệu còn
- [ ] Tắt server: thêm món vẫn lưu được ảnh gốc
- [ ] Server online đúng khung giờ đã báo khách

## 7. Cấu trúc code cần biết

### Client (`client/`)

| Đường dẫn | Việc |
|---|---|
| `app/_layout.tsx` | Gốc: mở DB, đọc phiên đăng nhập, điều hướng theo trạng thái đăng nhập |
| `app/index.tsx` | Trang `/`, chuyển hướng sang `/login` hoặc `/(tabs)/wardrobe` |
| `app/login.tsx` | Màn đăng nhập |
| `app/(tabs)/` | 3 tab: `wardrobe`, `add`, `suggest` |
| `app/item/[id].tsx` | Màn một món đồ |
| `src/api/client.ts` | `apiFetch`: gắn JWT, timeout 15s, tự đăng xuất khi server trả 401 |
| `src/api/endpoints.ts` | Khai báo các endpoint (`authApi.google/me/health`...) |
| `src/api/session.ts` | Lưu JWT trong SecureStore |
| `src/services/AuthService.ts` | Google Sign-In, đổi `id_token` lấy JWT |
| `src/store/authStore.ts` | Zustand: trạng thái đăng nhập (`loading`/`signedOut`/`signedIn`) |
| `src/db/` | Mở SQLite và migration |
| `src/constants/theme.ts` | Màu, khoảng cách, bo góc |

Các file trống trong `components/`, `repositories/`, `engine/`, `store/wardrobeStore.ts`... là chỗ dành cho các sprint sau.

Kiến trúc phân lớp: **UI -> Store -> Service -> Repository -> DB**. Giữ đúng hướng gọi này khi thêm tính năng.

### Server (`server/main.py`)

- `/health`: kiểm tra sống.
- `/auth/google`: verify Google ID token (kiểm tra email đã xác minh), tạo user nếu chưa có, trả `{token, expires_at, email}`.
- `/me`: cần JWT, trả thông tin tài khoản. Không token hoặc token hết hạn trả 401.
- `/image/process`: xử lý ảnh (rembg, `color_extractor`, nhận diện qua Ollama hoặc heuristic).
- Hạn JWT: 7 ngày (`TOKEN_TTL`).

## 8. Bảo trì

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

CI (`ci.yml`) chạy cả hai khi push lên `main`/`develop` và khi mở pull request. File workflow phải nằm ở `.github/workflows/ci.yml` thì GitHub mới chạy.

### Đổi package name, icon hoặc thêm thư viện native

Phải build lại APK (mục 3.4). Đổi package name còn phải cập nhật Android OAuth client trong Google Cloud.

### Link server cố định

Tunnel miễn phí đổi link liên tục và phụ thuộc laptop bật. Với bản giao khách nên dùng Cloudflare Tunnel có tên + domain riêng hoặc đưa server lên host. Link nhúng trong APK `preview`/`production` là link tại thời điểm build, nên link đổi thì app cũ gọi sai.

### Bảo mật

- Không commit `server/.env`, nên giữ `client/.env` ngoài git (kiểm tra `.gitignore`), không commit `server/.models`.
- Nếu `JWT_SECRET` từng bị lộ, đổi giá trị mới (mọi người dùng sẽ phải đăng nhập lại).
- Mọi endpoint trừ `/health` và `/auth/*` phải yêu cầu JWT.

## 9. Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `curl: Could not resolve host: xxxx...` | Dùng link mẫu `xxxx` | Dùng link thật từ `docker compose logs tunnel` |
| Log tunnel: `lookup api.trycloudflare.com ... server misbehaving` | Laptop mất mạng/DNS tạm thời | Chờ tunnel tự thử lại, rồi lấy **link mới** và cập nhật `client/.env` |
| Docker báo cổng 8000 bận (`port 8000 already allocated`) | Stack cũ còn chạy | `docker ps`, `docker compose down` rồi bật lại |
| `ConfigError: package.json path does not exist` | Chạy `npx expo` sai thư mục (đang ở `server/`) | `cd client` rồi chạy lại |
| `Failed to connect to <IP>:8081` | Điện thoại không tới được Metro | Chạy `npx expo start --dev-client --tunnel -c` |
| `Unmatched Route` ở `closy:///` | Thiếu `app/index.tsx` | Tạo file `app/index.tsx` redirect theo trạng thái đăng nhập |
| Expo Router cảnh báo thiếu default export | `app/item/[id].tsx` rỗng | Thêm `export default function ItemScreen() { return null; }` |
| Đăng nhập báo `DEVELOPER_ERROR` | Chưa tạo Android OAuth client, SHA-1/package sai, hoặc mới tạo dưới 10 phút | Kiểm tra mục 3.3, chờ vài phút |
| Google báo "Access blocked" | App ở Testing và Gmail chưa nằm trong Test users | Thêm Gmail vào Test users |
| "Kiểm tra kết nối server" báo "Không kết nối được server" | `EXPO_PUBLIC_API_URL` sai/link tunnel đã chết | Lấy link mới, sửa `.env`, chạy lại Metro với `-c`; thử `curl .../health` |
| "Chưa cấu hình EXPO_PUBLIC_API_URL" | `.env` thiếu hoặc chưa nạp | Kiểm tra `client/.env`, chạy lại Metro với `-c` |
| App tự đăng xuất | JWT hết hạn (7 ngày) hoặc server trả 401 | Đăng nhập lại. Nếu liên tục, kiểm tra `JWT_SECRET` server có bị đổi không |
| Đổi `.env` mà app vẫn dùng giá trị cũ | Biến được nhúng lúc bundle | Tắt Metro, chạy lại `npx expo start --dev-client -c`, rồi Reload app |
| Expo báo thiếu `expo-image-picker` | Chưa cài thư viện | `npm install`; nếu app báo thiếu native module thì build lại APK |
| Tính năng ảnh/màu lỗi, `/image/process` lỗi | Thiếu model rembg, thiếu `libgomp`, thiếu `color_extractor.py`, Ollama không chạy | `docker compose logs api`, kiểm tra `server/.models`, Ollama (mục 3.5, 4.1) |
| Build NestJS fail | Thiếu module `wardrobe`, `outfits` | Xem mục 4.3 |

## 10. Lộ trình

| Sprint | Nội dung | Trạng thái |
|---|---|---|
| 1 | Đăng nhập Google, JWT, khung 3 tab, SQLite migration | Xong |
| 2 | Thêm/sửa/xóa món đồ, `/image/process` (tách nền, lấy màu) | Đang làm / đã có phần code (cần xác nhận) |
| 3 | Engine gợi ý bộ đồ (chạy trên máy) | Chưa làm |
| 4 | Thống kê, lịch sự kiện, phân tích tủ đồ | Chưa làm |

Chi tiết thiết kế xem `Docs/README.md`, sơ đồ file xem `Docs/FileTree.md`.