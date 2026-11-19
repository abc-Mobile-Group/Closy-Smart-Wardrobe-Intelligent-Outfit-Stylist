# Chạy demo cần gì: bản tóm tắt

Phần Sprint 1 (đăng nhập) mình đã chạy thử, còn phần Gemma, tách màu và màn Thêm món là code của bạn trong nhóm, **mình chưa xem**. Danh sách dưới đây gồm cả hai.

## A. Cài một lần (đã xong thì bỏ qua)

| Việc | Trạng thái |
|---|---|
| Google Cloud: Web client + Android client (`com.nhom.closy` + SHA-1) | Android client làm chưa? Kiểm tra mục Clients phải có đủ 2 dòng |
| Gmail dùng demo nằm trong **Test users** | Kiểm tra ở Audience |
| `server/.env`: `GOOGLE_CLIENT_ID`, `JWT_SECRET` (chuỗi ngẫu nhiên dài) | Đã có |
| `client/.env`: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Đã có, link phải cập nhật mỗi buổi |
| APK **development build** cài trên điện thoại | Đã có, **nhưng build lại một lần** nếu có thư viện native mới (như `expo-image-picker`) |
| **Ollama** cài trên laptop và đã tải model `gemma4:e4b` | Hỏi bạn làm tính năng này |
| Model rembg trong `server/.models/` | Hỏi bạn đó cách tải; thư mục nặng, đừng commit |

Về Ollama: server chạy trong Docker gọi Ollama ở laptop. Trên Linux, Ollama thường chỉ nghe ở `127.0.0.1`, container không gọi tới được. Nếu tính năng nhận diện báo lỗi kết nối, đặt `OLLAMA_HOST=0.0.0.0` khi chạy Ollama. Cách làm chính xác phụ thuộc cách bạn cài, xem tài liệu Ollama hiện hành.

## B. Mỗi buổi chạy demo (theo thứ tự)

```bash
# 1. Tắt stack cũ nếu còn (tránh lỗi "port 8000 already allocated")
cd server && docker compose down; cd ..

# 2. Bật server + tunnel từ THƯ MỤC GỐC (không bật web, vì nó chiếm cổng 8081 của Expo)
docker compose up -d api tunnel
docker compose ps                         # api và tunnel phải "running"

# 3. Lấy link và kiểm tra (đợi ~10 giây)
docker compose logs tunnel | grep trycloudflare
curl https://<link>/health                # phải ra {"ok":true}

# 4. Dán link vào client/.env (EXPO_PUBLIC_API_URL), không có dấu / cuối

# 5. Bật máy chủ dev
cd client
npm install
npx expo start --dev-client -c
```

6. Điện thoại **cùng Wi-Fi** với laptop → mở app **Closy** → quét QR hoặc chọn máy chủ dev → đăng nhập Google.

## C. Điều kiện bắt buộc khi demo

- Laptop **bật, cắm sạc, không sleep**, Docker đang chạy, Ollama đang chạy (nếu demo tính năng nhận diện).
- Điện thoại cài **bản development build** (không phải Expo Go).
- Link tunnel **mới** trong `client/.env`, vì link đổi mỗi lần chạy lại.
- Nếu Wi-Fi nơi demo chặn kết nối giữa các máy: dùng `npx expo start --dev-client --tunnel` hoặc phát hotspot từ điện thoại.

## D. Hai kiểu "demo" khác nhau

| Kiểu | Cần laptop? | Dùng khi |
|---|---|---|
| **Dev build** (hướng dẫn trên) | Có, cả `expo start` lẫn Docker | Đang phát triển, demo nội bộ |
| **APK preview** (`eas build --profile preview`) | Chỉ cần Docker + tunnel, không cần `expo start` | Giao khách, demo độc lập |

APK preview **nhúng cứng link server lúc build**. Link tunnel miễn phí đổi liên tục nên app giao khách sẽ hỏng. Trước khi giao cần **link cố định** (Tailscale Funnel, hoặc Cloudflare Tunnel có tên với domain riêng) rồi mới build preview.

## E. Kiểm tra nhanh khi có lỗi

| Triệu chứng | Xem ở đâu |
|---|---|
| Docker báo cổng 8000 bận | `docker ps`, tắt container cũ |
| App báo "Không kết nối được server" | Link trong `.env` cũ, hoặc `curl .../health` không ra `{"ok":true}` |
| Đăng nhập báo `DEVELOPER_ERROR` | Android client sai package/SHA-1, hoặc mới tạo dưới 10 phút |
| "access blocked" khi đăng nhập | Gmail chưa nằm trong Test users |
| Expo báo thiếu `expo-image-picker` | `npm install`; nếu app báo thiếu native module thì build lại APK |
| Tính năng ảnh/màu lỗi | `docker compose logs api`, kiểm tra Ollama và `server/.models` |

Chạy theo mục B rồi báo mình chỗ nào dừng lại. Nếu bạn dán `docker compose ps` và dòng lỗi (nếu có), mình chỉ ra chỗ sửa cụ thể.