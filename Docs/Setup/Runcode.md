Repo này gồm 3 phần: `server/` (FastAPI, backend chính), `client/` (Expo), và một API NestJS ở thư mục gốc (`src/`). Phần NestJS là backend riêng cho bài tập, deploy lên Render, và không liên quan tới client.

## 1. Chạy nhanh bằng Docker (web + API)

Yêu cầu: Docker Desktop.

```bash
# 1. Tạo file env cho server
cp server/.env.example server/.env
# Sửa JWT_SECRET thành chuỗi ngẫu nhiên:
python -c "import secrets; print(secrets.token_urlsafe(48))"

# 2. Chạy từ thư mục gốc
docker compose up --build -d

# 3. Kiểm tra
curl http://localhost:8000/health      # {"ok": true}
# Web: http://localhost:8081
```

Nếu muốn có link public cho điện thoại, chạy `docker compose logs tunnel | grep trycloudflare`. Link này đổi mỗi lần chạy lại.

**Lưu ý khi chạy Docker:**
- **Model rembg:** compose mount `./server/.models` ở chế độ **read-only** (`:ro`) và đặt `REMBG_HOME=/models`, nên container không tự tải được model. Hãy tải `u2net.onnx` về `server/.models/` trước, hoặc chạy server local một lần để nó tự tải vào đó (xem mục 2). Nếu không, `/image/process` sẽ lỗi.
- **Ollama (tùy chọn):** nhận diện loại đồ bằng AI cần Ollama chạy trên máy host (`ollama pull gemma4:e4b`). Không có thì server tự fallback sang heuristic hình học, vẫn chạy được.
- **Thiếu `color_extractor.py`:** `main.py` import `color_extractor`, nhưng file này không có trong những gì bạn gửi. Hãy chắc nó nằm trong `server/`.
- **Thiếu thư viện hệ thống:** `server/Dockerfile` hiện không cài `libgomp1`. Nếu `onnxruntime` báo lỗi thiếu `libgomp.so`, thêm vào Dockerfile:
  ```dockerfile
  RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
  ```
- **API URL của web:** `EXPO_PUBLIC_API_URL` được nhúng lúc **build**. Đổi URL thì phải build lại (`--build`).

## 2. Chạy server không dùng Docker (khi dev)

```bash
cd server
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env               # sửa JWT_SECRET
uvicorn main:app --reload --port 8000
pytest -q                          # chạy test
```

Lần đầu `rembg` sẽ tự tải model u2net (~170MB) vào `server/.models`, nên cần có mạng.

## 3. Chạy client (Expo)

```bash
cd client
npm install
```

Tạo `client/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>
```

- **Web:** `npm run web`
- **Android thật:** Google Sign-In là module native, **không chạy trong Expo Go**, nên phải dùng development build:
  ```bash
  npm install -g eas-cli && eas login
  eas build --profile development --platform android   # cài APK vào máy
  npx expo start --dev-client
  ```
  Điện thoại không gọi được `localhost`. Hãy dùng IP LAN của laptop (`http://192.168.x.x:8000`) hoặc link tunnel.
- **Google Cloud Console:** tạo OAuth client loại **Web** (lấy ID cho server và client) và loại **Android** (package `com.nhom.closy` + SHA-1 từ `eas credentials`).
- **Đăng nhập email:** server có `/auth/register` và `/auth/login`, dùng được mà không cần Google.

## 4. Chạy API NestJS (thư mục gốc)

```bash
npm install
npm run start:dev        # http://localhost:3000/docs (Swagger)
# hoặc: npm run build && npm start
```

Lỗi hiện tại: `app.module.ts` import `./wardrobe/wardrobe.module` và `./outfits/outfits.module`, nhưng hai thư mục này không có trong các file bạn gửi. Thiếu chúng thì build sẽ fail. Ngoài ra `Dockerfile` ở gốc là của NestJS, còn `docker-compose.yml` ở gốc lại build từ `./server`, nên hai thứ này không đi chung với nhau.

Nếu bạn gặp lỗi cụ thể (build fail, Google login lỗi, rembg không chạy...), gửi log lên mình xem giúp nhé.