# 02. Cài đặt và chạy

> Mọi lệnh chạy ở **thư mục gốc repo** trừ khi ghi `cd ...`. Trên Ubuntu dùng `python3` (không phải `python`).

## 1. Cần cài gì

| Công cụ | Dùng để | Bắt buộc? |
| :--- | :--- | :---: |
| Git | Lấy code | ✅ |
| Node.js 20+ và npm | Chạy client | ✅ |
| Python 3.11+ (đã chạy tốt với 3.12) | Chạy server và test | ✅ (hoặc dùng Docker) |
| Docker + Docker Compose | Chạy server và tunnel | Tùy chọn |
| Điện thoại Android | Thử trên máy thật | Tùy chọn |
| Ollama + model `gemma4:e4b` | Nhận diện loại đồ bằng AI | Tùy chọn (không có thì dùng heuristic) |
| `eas-cli` + tài khoản Expo | Build APK | Chỉ khi build |

## 2. Biến môi trường

Không bao giờ commit file `.env` thật. Chỉ commit `.env.example`.

### `server/.env` (copy từ `server/.env.example`)

| Biến | Ý nghĩa | Ghi chú |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | **Web** client ID của Google Cloud | Bắt buộc. Đăng nhập email vẫn chạy được nếu bạn chỉ cần thử |
| `JWT_SECRET` | Khóa ký token | Bắt buộc. Chuỗi ngẫu nhiên **≥ 32 ký tự** |
| `DB_PATH` | Đường dẫn SQLite của server | Mặc định `closy.db`; trong Docker là `/data/closy.db` |
| `OLLAMA_HOST` | Địa chỉ Ollama | Mặc định `http://host.docker.internal:11434`; server tự thử thêm `127.0.0.1` và `localhost` |
| `OLLAMA_MODEL` | Tên model | Mặc định `gemma4:e4b` |
| `REMBG_HOME` | Thư mục lưu model tách nền | Xem mục 4 |
| `ALLOWED_ORIGINS` | Danh sách origin cho CORS, cách nhau dấu phẩy | Mặc định `*` (đủ cho dev) |

Tạo `JWT_SECRET`:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### `client/.env` (copy từ `client/.env.example`)

| Biến | Ý nghĩa |
| :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Địa chỉ server, **không có dấu `/` cuối** (vd `http://localhost:8000`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Cùng giá trị với `GOOGLE_CLIENT_ID` của server |

> Mọi biến `EXPO_PUBLIC_*` bị **nhúng vào app lúc bundle** và ai cũng đọc được. Không đặt bí mật vào đây. Đổi `.env` xong phải chạy lại Metro với `-c` (xóa cache).

## 3. Chạy server

### Cách A: Python trực tiếp (khuyên dùng khi đang sửa code)
```bash
cd server
python3 -m venv .venv
source .venv/bin/activate            # mỗi terminal mới đều phải chạy lại dòng này
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env                 # rồi sửa JWT_SECRET
uvicorn main:app --reload --port 8000
```
Muốn điện thoại cùng Wi-Fi gọi được: thêm `--host 0.0.0.0`.

Kiểm tra: `curl http://localhost:8000/health` phải ra `{"ok":true}`. Tài liệu API tự sinh ở `http://localhost:8000/docs`.

### Cách B: Docker (có tunnel HTTPS cho điện thoại)
```bash
cp server/.env.example server/.env          # sửa JWT_SECRET
docker compose down                          # tắt stack cũ nếu còn
docker compose up --build -d api tunnel      # KHÔNG bật `web`, nó chiếm cổng 8081 của Expo
docker compose ps                            # api và tunnel phải "running"
docker compose logs tunnel | grep trycloudflare    # lấy link https://xxxx.trycloudflare.com
curl https://<link>/health
```
Lưu ý khi dùng Docker:
- Link `trycloudflare` **đổi mỗi lần tunnel khởi động lại** (kể cả khi laptop mất mạng rồi nối lại). Đổi link thì phải sửa `client/.env` và chạy lại Metro `-c`.
- Compose đang **bind-mount** `server/main.py` và `server/color_extractor.py` vào container (tiện cho dev). Sửa code xong chạy `docker compose restart api`. Bản giao khách nên bỏ hai dòng mount này.
- `docker compose` ở gốc là file đúng. `server/docker-compose.yml` là bản trùng cũ (đã lỗi thời, nên xóa).
- `server/Dockerfile` chưa cài `libgomp1`. Nếu `onnxruntime` báo thiếu `libgomp.so`, thêm vào Dockerfile:
  ```dockerfile
  RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
  ```

## 4. Model tách nền (rembg) — chỗ hay lỗi nhất

`/image/process` cần model `u2net` (~170 MB). Server tự tải **lần đầu** nên cần có mạng.

- `main.py` dùng thư mục `server/.models/` làm nơi lưu **nếu thư mục này đã tồn tại**; nếu chưa, `rembg` dùng thư mục mặc định trong home của bạn.
- **Đừng để Docker tạo `server/.models`**: nó sẽ thuộc về `root` và server không ghi được → `/image/process` trả 500 với lỗi `Permission denied ... .models`.
  - Sửa: `sudo chown -R "$USER":"$USER" server/.models`, hoặc chạy với `REMBG_HOME="$HOME/.cache/rembg"`.
- Compose mount `./server/.models:/models:ro` (**chỉ đọc**) nên container **không tự tải được** model. Tải model về `server/.models/` trước bằng cách chạy server theo Cách A một lần.
- Không commit thư mục `.models/` (đã nằm trong `.gitignore`).

## 5. Ollama (tùy chọn)

Dùng để nhận diện loại đồ, tên, độ lịch sự và từ chối ảnh không phải trang phục.
```bash
ollama pull gemma4:e4b
```
- Không có Ollama: server tự dùng heuristic hình học (kém chính xác hơn), app vẫn chạy.
- Server trong Docker trên Linux gọi Ollama ở máy host: Ollama phải nghe ở `0.0.0.0`, không chỉ `127.0.0.1` (đặt `OLLAMA_HOST=0.0.0.0` khi chạy Ollama).

## 6. Chạy client

```bash
cd client
cp .env.example .env       # sửa EXPO_PUBLIC_API_URL cho đúng
npm install
```

| Cách chạy | Lệnh | Khi nào dùng | Đăng nhập Google? |
| :--- | :--- | :--- | :---: |
| **Web** | `npm run web` | Xem giao diện nhanh nhất | ❌ chỉ email |
| **Expo Go** (nếu hỗ trợ đúng SDK của dự án) | `npx expo start` | Thử trên điện thoại không cần build | ❌ chỉ email |
| **Development build** | `npx expo start --dev-client -c` | Thử đầy đủ, gồm Google Sign-In | ✅ |

Điện thoại **không gọi được `localhost`** của laptop. Dùng một trong hai:
- IP LAN của laptop, ví dụ `EXPO_PUBLIC_API_URL=http://192.168.1.10:8000` (server chạy với `--host 0.0.0.0`, cùng Wi-Fi).
- Link tunnel HTTPS (cách B ở mục 3).

Bản release của Android mặc định **chặn HTTP thường**, nên APK giao khách phải dùng link **HTTPS**.

Nếu điện thoại báo `Failed to connect to <IP>:8081` (không thấy Metro): chạy `npx expo start --dev-client --tunnel -c` (lần đầu sẽ hỏi cài `@expo/ngrok`, bấm `y`), hoặc phát hotspot từ điện thoại.

### Development build (làm một lần)
```bash
npm install -g eas-cli && eas login
cd client
eas build --profile development --platform android     # 10–20 phút, cài APK nhận được vào máy
```
**Chỉ phải build lại** khi đổi phần native: thêm thư viện native, sửa `app.json` (plugins, package, icon), nâng phiên bản Expo/React Native. Sửa `.ts/.tsx` hay đổi API URL thì **không**.
Thiết lập Google Cloud cho đăng nhập Google: xem [05-Build-APK-va-giao-khach.md](05-Build-APK-va-giao-khach.md).

## 7. Chạy test

```bash
# Client (Jest, thư mục client/__tests__)
cd client
npx tsc --noEmit
npm test

# Server (pytest)
cd server && source .venv/bin/activate
pytest -q
```
- Test cũ của nhóm ở `client/src/engine/__tests__/` chạy bằng runner riêng, **Jest không quét thư mục này** (cấu hình `testMatch` trong `client/package.json`).
- `test_image_process.py` chạy rembg thật nên cần model và mạng ở lần đầu.
- Cảnh báo `InsecureKeyLengthWarning` trong pytest là do khóa JWT của test ngắn, không ảnh hưởng.

## 8. Kịch bản kiểm tra nhanh (smoke test, ~10 phút)

1. Đăng ký tài khoản email, đăng xuất, đăng nhập lại.
2. Thêm 3 món: một áo, một quần, một đôi giày (chọn ảnh từ thư viện). Kiểm tra tên, màu, danh mục tự điền.
3. Thử một ảnh không phải trang phục → phải có thông báo từ chối.
4. Tab **Hôm nay**: đổi bối cảnh, xem bộ gợi ý và các dòng lý do.
5. Chạm **Chi tiết bộ phối** → khóa một món → **Đổi tất cả món chưa khóa** → món khóa phải giữ nguyên.
6. **Xác nhận mặc** → tab **Lịch sử** thấy chấm ở ngày hôm nay.
7. Tắt server → vẫn phối được đồ (chỉ thêm món mới là không tách nền được).
8. Tắt hẳn app, mở lại → vẫn đăng nhập, dữ liệu còn.

## 9. Mỗi buổi demo (bản gọn)

```bash
docker compose down && docker compose up -d api tunnel
docker compose logs tunnel | grep trycloudflare     # đợi ~10 giây rồi lấy link
curl https://<link>/health                          # phải ra {"ok":true}
# dán link vào client/.env (EXPO_PUBLIC_API_URL), rồi:
cd client && npx expo start --dev-client -c
```
Điều kiện: laptop bật, cắm sạc, **không sleep**; Docker (và Ollama nếu demo nhận diện) đang chạy; điện thoại cài development build và cùng Wi-Fi.
