# Closy – tủ đồ thông minh

React Native (Expo) + FastAPI. Gợi ý phối đồ chạy local-first, server lo đăng nhập và xử lý ảnh.

## Chạy server (laptop)
```bash
cp server/.env.example server/.env      # điền GOOGLE_CLIENT_ID, JWT_SECRET
docker compose up --build -d
docker compose logs tunnel | grep trycloudflare   # lấy link https
curl https://<link>/health
```
Ảnh được tách nền bằng rembg trong RAM, **không lưu** trên server. Nhận diện loại đồ dùng Ollama (`gemma4:e4b`); không có Ollama thì tự rơi về heuristic hình học.

### Link cố định cho khách test
Link `trycloudflare` đổi mỗi lần chạy lại, APK đã cài sẽ gọi sai. Dùng named tunnel:
1. Cloudflare Zero Trust → Networks → Tunnels → tạo tunnel, trỏ hostname (vd `api.example.com`) tới `http://api:8000`, copy token.
2. Trong `server/.env` thêm `TUNNEL_TOKEN=...`; đổi service `tunnel` trong `docker-compose.yml`:
```yaml
  tunnel:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    depends_on: [api]
    restart: unless-stopped
```
3. Đặt `EXPO_PUBLIC_API_URL=https://api.example.com` khi build APK (xem `docs/APK.md`).

Giữ laptop cắm sạc, tắt sleep trong khung giờ khách dùng.

## Chạy client (dev)
```bash
cd client && cp .env.example .env && npm install
npx expo start         # Expo Go dùng được, trừ đăng nhập Google
```

## Test
```bash
cd client && npm test && npx tsc --noEmit
cd server && pip install -r requirements.txt -r requirements-dev.txt && pytest -q
```

## Đo thời gian tách nền
```bash
python server/scripts/benchmark_process.py --url http://localhost:8000 \
  --email <email> --password <mật khẩu> --dir ./sample_photos
```
Dán kết quả vào `docs/BENCHMARK.md`.

## Tài liệu
- `docs/Backlog.md` – backlog và quyết định
- `docs/APK.md` – build và cài APK
- `docs/BENCHMARK.md` – số liệu đo
