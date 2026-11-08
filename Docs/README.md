# Closy: Ứng dụng mobile tủ đồ gợi ý đồ thông minh

## 1. Tiêu chí dự án

| # | Tiêu chí | Ý nghĩa | Được đáp ứng bởi |
|---|---|---|---|
| 1 | **Time** | Người dùng tìm đồ nhanh | UC3, UC4 (engine chạy trên máy, dưới 3 giây) |
| 2 | **Best match** | Tìm đồ phù hợp cho lịch hẹn | UC3, UC7 (chấm điểm màu + độ trang trọng) |
| 3 | **Reuse** | Biết tủ còn thiếu gì, đồ nào ít dùng | UC6, UC8 |

---

## 2. Use case theo sprint

### Sprint 1: Nền tảng và tài khoản
- **UC0: Đăng nhập bằng Gmail** (server xác thực Google token, cấp JWT).
- Dựng khung app, điều hướng 3 màn, DB cục bộ.

> Lưu ý: đăng nhập Google trên React Native thường cần *development build*, không chạy trong Expo Go. Nếu trễ, dời Auth xuống cuối, đừng để chặn lõi sản phẩm.

### Sprint 2: Xây dựng tủ đồ (CRUD Wardrobe)
- **UC1: Thêm món đồ**: chọn nguồn (thư viện ảnh) → xử lý ảnh → xác nhận nhãn → lưu.
- **UC2: Xem và sửa kho đồ**.

### Sprint 3: MVP hệ thống gợi ý
- **UC3: Chọn bối cảnh và nhận gợi ý**: chọn bối cảnh → engine trên thiết bị tính điểm → hiển thị 2-3 bộ kèm lý do.
- **UC4: Đổi gợi ý / Khóa món**.
- **UC5: Xác nhận mặc và lưu lịch sử**.

### Sprint 4: Hệ thống phụ trợ
- **UC6: Thống kê số lần mặc** → phân tích đồ ít dùng → đề xuất tái sử dụng hoặc đem từ thiện.
- **UC7: Gợi ý đồ cho lịch hẹn / sự kiện quan trọng** (đám cưới...): chọn ngày + loại sự kiện, lưu lại, đến lúc dùng thì gọi engine với bối cảnh tương ứng.
- **UC8: Phân tích tủ còn thiếu gì** (bổ sung để phủ tiêu chí Reuse): đếm theo danh mục, mức trang trọng, bối cảnh.

---

## 3. Mô hình hệ thống

**Client gần như 100%**: dữ liệu tủ đồ, lịch sử và hệ thống gợi ý đều chạy trên điện thoại (local-first), hoạt động khi không có mạng.

**Server (laptop cá nhân) chỉ giữ phần nhỏ:**

| Endpoint | Việc | Bắt buộc? |
|---|---|---|
| `GET /health` | Kiểm tra server sống | Có |
| `POST /auth/google` | Xác thực Google ID token, cấp JWT, lưu tài khoản cơ bản | Có (nếu giữ Auth) |
| `POST /image/process` | Tách nền ảnh (rembg) | Tùy chọn (có thể thay bằng cắt tay hoặc ML Kit) |
| `POST /events` | Nhận thống kê ẩn danh khi người dùng đồng ý | Tùy chọn |

Nguyên tắc: **app vẫn dùng được khi server tắt**. Chỉ mất đăng nhập mới, tách nền và thống kê gửi lên.

```
┌─────────────── ĐIỆN THOẠI (Closy, React Native) ───────────────┐
│ UI (Tủ đồ · Thêm món · Gợi ý)                                    │
│   → ViewModel/Store (Zustand)                                    │
│   → Services (Wardrobe · Image · ColorHarmony ·                  │
│               Recommendation · History)                          │
│   → Repository → LocalDB (SQLite) + File ảnh                     │
└──────────────┬───────────────────────────────────────────────────┘
               │ HTTPS (tùy chọn, có fallback)
        ┌──────▼──────────────────────────┐
        │ LAPTOP: Docker                  │
        │  FastAPI (auth, image, events)  │
        │  Cloudflare Tunnel → Internet   │
        └─────────────────────────────────┘
```

---

## 4. Frontend (client)

| Hạng mục | Chọn |
|---|---|
| Nền tảng | Android ưu tiên, iOS sau |
| Framework | React Native + Expo + TypeScript |
| Màn hình chính | Tủ đồ, Thêm món, Gợi ý |
| State | Zustand (hoặc Context API) |
| Phần cứng | Thư viện ảnh trước; camera và GPS làm sau |
| Xin quyền | Contextual permission: chỉ xin camera khi bấm chụp |
| DB | `expo-sqlite` |
| File ảnh | `expo-file-system` |
| Chọn ảnh | `expo-image-picker` |
| Nén ảnh | `expo-image-manipulator` |
| Test | Jest |

Kiến trúc layered: **UI → ViewModel/Store → Service → Repository → LocalDB**.

### Module (đều nằm ở client)

| Module | Việc |
|---|---|
| `WardrobeService` | Thêm, sửa, xóa món; `isReady()` |
| `ImageService` | Nén ảnh, lấy màu chủ đạo; gọi server tách nền (tùy chọn) |
| `ColorHarmonyEngine` | Chấm điểm cặp màu theo HSL |
| `RecommendationEngine` | Lọc, tạo tổ hợp, chấm điểm, `suggest()`, Lock/Swap |
| `HistoryService` | `confirmWear()`, cập nhật `last_worn` |
| `InsightService` | Thống kê số lần mặc, đồ ít dùng, phân tích thiếu hụt |

---

## 5. Thuật toán gợi ý (chạy trên máy)

Điểm của một bộ (áo + quần/váy + giày):

```
Tổng = Điểm màu + Điểm trang trọng + Điểm đồng bộ + Điểm tái sử dụng
```

| Thành phần | Cách tính | Tiêu chí |
|---|---|---|
| **Màu** | Cặp áo-quần, quần-giày: trung tính +3, tương đồng (lệch H < 30°) +3, tương phản (150-210°) +2 | Best match |
| **Trang trọng** | Trừ điểm theo độ lệch so với mức mong muốn của bối cảnh | Best match |
| **Đồng bộ** | Trừ điểm nếu 3 món chênh nhau nhiều (vest + dép) | Best match |
| **Tái sử dụng** | +1 nếu có món lâu chưa mặc (chỉ cộng khi bộ đã đạt) | Reuse |

**Nhãn độ trang trọng của món:** 1 = thoải mái, 3 = gọn gàng, 5 = trang trọng.

**Mức mong muốn theo bối cảnh:** Đi học 2, Đi làm 3, Hẹn hò 3, Sự kiện quan trọng 5.

**Màu:** HSL. Trung tính khi `S < 15` hoặc `L < 15` hoặc `L > 90`. Độ lệch H tính vòng tròn: `d = min(|h1-h2|, 360-|h1-h2|)`.

**Lock/Swap:** món khóa cố định, bấm Đổi thì loại các bộ đã hiện và tính lại. Thêm nhiễu ngẫu nhiên nhỏ để các lần Đổi ra kết quả khác nhau.

Mã tham chiếu (TypeScript) đặt tại `client/src/engine/suggest.ts`. Các ngưỡng là số khởi đầu, cần chỉnh bằng 20-30 món đồ thật.

---

## 6. Dữ liệu

### Client (SQLite + file)

| Bảng / nơi lưu | Cột / nội dung |
|---|---|
| `items` | `id`, `category` (top/bottom/shoes), `image_path`, `color_h`, `color_s`, `color_l`, `formality` (1/3/5), `contexts`, `last_worn`, `wear_count` |
| `outfits` | `id`, `top_id`, `bottom_id`, `shoes_id`, `context`, `worn_at` |
| `planned_events` | `id`, `date`, `context`, `note` (cho UC7) |
| `settings` | `style`, `allow_analytics` |
| File ảnh | Thư mục riêng của app; DB chỉ lưu đường dẫn tương đối |
| SecureStore | JWT |

### Server (SQLite trong volume Docker)

| Bảng | Cột |
|---|---|
| `users` | `id`, `google_sub`, `email`, `created_at` |
| `events` (tùy chọn) | `user_id`, `event_type`, `payload`, `ts` |

Server **không lưu ảnh lâu dài**: nhận ảnh, tách nền, trả về, bỏ.

---

## 7. Server và Docker

### Cấu trúc repo

```
closy/
├── client/                 # React Native + Expo
│   ├── src/
│   │   ├── engine/         # suggest, color harmony (có unit test)
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── store/
│   │   └── screens/
│   ├── assets/             # dữ liệu mẫu, icon
│   └── app.json
└── server/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── requirements.txt
    ├── main.py
    └── .env                # KHÔNG commit
```

### `server/requirements.txt`

```
fastapi
uvicorn[standard]
python-multipart
rembg
onnxruntime
pillow
google-auth
requests
pyjwt
```

### `server/Dockerfile`

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tải sẵn model nhẹ khi build để lần gọi đầu không chậm
RUN python -c "from rembg import new_session; new_session('u2netp')"

COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `server/docker-compose.yml`

```yaml
services:
  api:
    build: .
    env_file: .env
    volumes:
      - closy_data:/data
    restart: unless-stopped

  tunnel:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate --url http://api:8000
    depends_on:
      - api
    restart: unless-stopped

volumes:
  closy_data:
```

### `server/.env`

```
GOOGLE_CLIENT_ID=điền_client_id_web
JWT_SECRET=chuoi_ngau_nhien_dai
DB_PATH=/data/closy.db
```

### `server/main.py` (khung chạy thử)

```python
import io, os, time, sqlite3
import jwt
from fastapi import FastAPI, UploadFile, File, Header, HTTPException
from fastapi.responses import Response
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from rembg import remove, new_session
from PIL import Image

app = FastAPI()
session = new_session("u2netp")
JWT_SECRET = os.environ["JWT_SECRET"]
CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
DB = os.environ.get("DB_PATH", "closy.db")
MAX_UPLOAD = 8 * 1024 * 1024  # 8 MB


def db():
    con = sqlite3.connect(DB)
    con.execute("""CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY, google_sub TEXT UNIQUE,
        email TEXT, created_at REAL)""")
    return con


def current_user(authorization: str) -> int:
    try:
        token = authorization.removeprefix("Bearer ")
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])["uid"]
    except Exception:
        raise HTTPException(401, "Token không hợp lệ")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/google")
def auth_google(body: dict):
    try:
        info = id_token.verify_oauth2_token(
            body["id_token"], grequests.Request(), CLIENT_ID)
    except Exception:
        raise HTTPException(401, "Google token sai")
    con = db()
    con.execute(
        "INSERT OR IGNORE INTO users(google_sub,email,created_at) VALUES(?,?,?)",
        (info["sub"], info.get("email"), time.time()))
    con.commit()
    uid = con.execute("SELECT id FROM users WHERE google_sub=?",
                      (info["sub"],)).fetchone()[0]
    token = jwt.encode({"uid": uid, "exp": time.time() + 7 * 86400},
                       JWT_SECRET, algorithm="HS256")
    return {"token": token}


@app.post("/image/process")
async def process(file: UploadFile = File(...), authorization: str = Header(...)):
    current_user(authorization)
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "Ảnh quá lớn")
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    img.thumbnail((800, 800))
    out = remove(img, session=session)
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return Response(buf.getvalue(), media_type="image/png")
```

### Chạy

```bash
cd server
docker compose up --build -d
docker compose logs tunnel | grep trycloudflare   # lấy link https://xxxx.trycloudflare.com
curl https://xxxx.trycloudflare.com/health
```

Dán link vào biến `EXPO_PUBLIC_API_URL` của client. Link có HTTPS sẵn nên Android và iOS đều không chặn, điện thoại khác mạng vẫn gọi được.

### Lưu ý khi đẩy laptop ra mạng

- Link tunnel miễn phí **đổi mỗi lần chạy lại**; cần domain riêng nếu muốn link cố định.
- Laptop phải bật, không sleep, có mạng. Windows cần Docker Desktop.
- Mọi endpoint (trừ `/health`, `/auth/google`) bắt buộc có JWT.
- **Không commit** `.env`; thêm vào `.gitignore`.
- **Không để API key trong client.** Mọi biến `EXPO_PUBLIC_*` đều lộ trong app.

---

## 8. Quyền riêng tư

- Dữ liệu tủ đồ và lịch sử **ở lại trên máy**.
- Ảnh chỉ rời máy khi người dùng chủ động dùng tính năng tách nền, và được xóa sau khi xử lý.
- Thống kê gửi server (nếu có) chỉ là metadata ẩn danh, **chỉ khi người dùng bật đồng ý**.
- Có màn hình giải thích rõ gửi gì, cho tắt và cho xóa dữ liệu.

---

## 9. Build và demo

| Giai đoạn | Cách chạy |
|---|---|
| Dev | `npx expo start` + Expo Go |
| Demo | APK build bằng EAS Build (hoặc `expo prebuild` + Gradle) |
| iOS | Chỉ khi có tài khoản Apple Developer; không cam kết trong MVP |

Chuẩn bị demo:
- Dữ liệu mẫu 15-20 món (đủ màu, đủ mức trang trọng) và nút nạp lại dữ liệu mẫu.
- Kịch bản: xem tủ → thêm món → gợi ý Hẹn hò → đổi sang Đám cưới → khóa món/Đổi → xác nhận mặc → thống kê → tủ còn thiếu gì → **bật chế độ máy bay chạy lại gợi ý**.
- Quay video dự phòng; dùng `scrcpy` để chiếu màn hình điện thoại.

---

## 10. Điểm còn cần nhóm chốt

1. Đề môn có bắt buộc client-server không? Nếu không, có thể bỏ Auth và server hoàn toàn.
2. Tách nền: server (rembg), ML Kit (cần development build) hay cắt ảnh tay.
3. UC7: lưu lịch hẹn ở client (`planned_events`), có cần nhắc lịch bằng thông báo không.
4. Thêm danh mục áo khoác/phụ kiện hay giữ 3 loại (áo, quần/váy, giày) cho MVP.
