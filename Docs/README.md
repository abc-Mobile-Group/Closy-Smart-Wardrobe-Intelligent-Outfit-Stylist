# Closy: Ứng dụng mobile tủ đồ gợi ý đồ thông minh

> **Phiên bản:** v2. Ưu tiên **Sprint 1 và Sprint 2 để giao khách trước**; Sprint 3 và 4 làm sau.

## 1. Tiêu chí dự án

| # | Tiêu chí | Ý nghĩa | Được đáp ứng bởi |
|---|---|---|---|
| 1 | **Time** | Người dùng tìm đồ nhanh | UC3, UC4 (engine chạy trên máy, dưới 3 giây) |
| 2 | **Best match** | Tìm đồ phù hợp cho lịch hẹn | UC3, UC7 (chấm điểm màu + độ trang trọng) |
| 3 | **Reuse** | Biết tủ còn thiếu gì, đồ nào ít dùng | UC6, UC8 |

---

## 2. Quyết định đã chốt

| # | Quyết định | Hệ quả |
|---|---|---|
| 1 | Không bắt buộc client-server, **nhưng bắt buộc xác thực Gmail và có tài khoản** | Server là **bắt buộc** (verify Google token, lưu `users`) |
| 2 | Tách nền ảnh **qua server** | Sprint 2 phụ thuộc server; cần fallback khi server lỗi |
| 3 | Lịch thông báo: **thiết kế để sau** | Chỉ giữ bảng `planned_events`, chưa code |
| 4 | Danh mục: **chỉ Áo và Quần/Váy** (bỏ giày, áo khoác, phụ kiện) | Một bộ đồ gồm 2 món; mở rộng danh mục sau |
| 5 | Hệ thống gợi ý chạy **trên thiết bị** (local-first) | Offline được, nhanh, giữ dữ liệu tủ ở lại máy |
| 6 | Nền tảng: **Android ưu tiên**, iOS sau | Chỉ cam kết APK; iOS cần tài khoản Apple Developer |
| 7 | **Giao khách Sprint 1 + 2 trước** | Sprint 3, 4 nằm ngoài lần giao đầu |

---

## 3. Use case theo sprint

### Sprint 1: Nền tảng và tài khoản *(giao khách)*
- **UC0: Đăng nhập bằng Gmail** → server xác thực Google token → cấp JWT → lưu trong SecureStore.
- Giữ phiên khi mở lại app, có nút Đăng xuất.
- Khung app 3 tab: Tủ đồ, Thêm món, Gợi ý (tab Gợi ý hiện trạng thái "sắp có").
- DB cục bộ có cơ chế migration theo version.

### Sprint 2: Tủ đồ, CRUD Wardrobe *(giao khách)*
- **UC1: Thêm món đồ**: chọn ảnh từ thư viện → xử lý ảnh (server tách nền + lấy màu) → xác nhận nhãn → lưu.
- **UC2: Xem và sửa kho đồ**.

### Sprint 3: MVP hệ thống gợi ý
- **UC3: Chọn bối cảnh và nhận gợi ý**: chọn bối cảnh → engine trên thiết bị tính điểm → hiển thị 2-3 bộ kèm lý do.
- **UC4: Đổi gợi ý / Khóa món**.
- **UC5: Xác nhận mặc và lưu lịch sử**.

### Sprint 4: Hệ thống phụ trợ
- **UC6: Thống kê số lần mặc** → phân tích đồ ít dùng → đề xuất tái sử dụng hoặc đem từ thiện.
- **UC7: Gợi ý đồ cho lịch hẹn / sự kiện quan trọng** (đám cưới...): chọn ngày + loại sự kiện, lưu lại, đến lúc dùng thì gọi engine với bối cảnh tương ứng.
- **UC8: Phân tích tủ còn thiếu gì** (phủ tiêu chí Reuse).
- **Thiết kế (chưa code):** lịch và thông báo nhắc sự kiện.

---

## 4. Mô hình hệ thống

**Phần lớn logic nằm ở client.** Server giữ phần nhỏ nhưng bắt buộc: tài khoản và xử lý ảnh.

| Endpoint | Việc | Sprint | Bắt buộc? |
|---|---|---|---|
| `GET /health` | Kiểm tra server sống | 1 | Có |
| `POST /auth/google` | Xác thực Google ID token, cấp JWT, lưu tài khoản | 1 | Có |
| `POST /image/process` | Tách nền (rembg) + trả về màu chủ đạo HSL | 2 | Có |
| `POST /events` | Thống kê ẩn danh khi người dùng đồng ý | Sau | Không |

```
┌─────────────── ĐIỆN THOẠI (Closy, React Native) ───────────────┐
│ UI (Tủ đồ · Thêm món · Gợi ý)                                    │
│   → ViewModel/Store (Zustand)                                    │
│   → Services (Auth · Wardrobe · Image · ColorHarmony ·           │
│               Recommendation · History · Insight)                │
│   → Repository → LocalDB (SQLite) + File ảnh + SecureStore       │
└──────────────┬───────────────────────────────────────────────────┘
               │ HTTPS + JWT
        ┌──────▼──────────────────────────┐
        │ LAPTOP: Docker                  │
        │  FastAPI (auth, image)          │
        │  Cloudflare Tunnel → Internet   │
        └─────────────────────────────────┘
```

---

## 5. Frontend (client)

| Hạng mục | Chọn |
|---|---|
| Nền tảng | Android ưu tiên, iOS sau |
| Framework | React Native + Expo + TypeScript |
| Màn hình chính | Tủ đồ, Thêm món, Gợi ý (+ Đăng nhập) |
| State | Zustand (hoặc Context API) |
| Phần cứng | **Thư viện ảnh trước**; camera và GPS làm sau |
| Xin quyền | Contextual permission: chỉ xin khi cần dùng |
| DB | `expo-sqlite` |
| File ảnh | `expo-file-system` |
| Chọn ảnh | `expo-image-picker` |
| Nén ảnh | `expo-image-manipulator` |
| Lưu token | `expo-secure-store` |
| Đăng nhập Google | Thư viện Google Sign-In cho RN (xem lưu ý) |
| Test | Jest |

Kiến trúc layered: **UI → ViewModel/Store → Service → Repository → LocalDB**.

### Module

| Module | Nằm ở | Việc |
|---|---|---|
| `AuthService` | Client + Server | Đăng nhập Google, lưu/gia hạn JWT |
| `WardrobeService` | Client | Thêm, sửa, xóa món; `isReady()` |
| `ImageService` | Client gọi Server | Nén ảnh, gọi `/image/process`, nhận ảnh đã tách + màu |
| `ColorHarmonyEngine` | Client | Chấm điểm cặp màu theo HSL |
| `RecommendationEngine` | Client | Lọc, tạo tổ hợp, chấm điểm, `suggest()`, Lock/Swap |
| `HistoryService` | Client | `confirmWear()`, cập nhật `last_worn` |
| `InsightService` | Client | Thống kê, đồ ít dùng, thiếu hụt tủ |

### Lưu ý về Google Sign-In (rủi ro lớn nhất Sprint 1)

- Cần Google Cloud Console: **Web client ID** (server dùng để verify) và **Android client ID** (kèm **SHA-1** của khóa ký app).
- Trong Expo, đăng nhập Google thường **không chạy trong Expo Go**; cần **development build** (EAS Build). Nên build thử ngay đầu Sprint 1.
- SHA-1 của bản build EAS khác bản debug; đăng ký đúng SHA-1 của bản đang dùng.
- Cấu hình thay đổi theo phiên bản, kiểm tra tài liệu hiện hành của thư viện và Google.

---

## 6. Thuật toán gợi ý (Sprint 3, chạy trên máy)

Một bộ đồ gồm **1 áo + 1 quần/váy**:

```
Tổng = Điểm màu + Điểm trang trọng + Điểm đồng bộ + Điểm tái sử dụng
```

| Thành phần | Cách tính | Tiêu chí |
|---|---|---|
| **Màu** | Cặp áo-quần: trung tính +3, tương đồng (lệch H < 30°) +3, tương phản (150-210°) +2 | Best match |
| **Trang trọng** | Trừ điểm theo tổng độ lệch so với mức mong muốn của bối cảnh | Best match |
| **Đồng bộ** | Trừ điểm nếu áo và quần chênh mức trang trọng | Best match |
| **Tái sử dụng** | +1 nếu có món lâu chưa mặc (chỉ cộng khi bộ đã đạt) | Reuse |

**Nhãn độ trang trọng của món:** 1 = thoải mái, 3 = gọn gàng, 5 = trang trọng.

**Mức mong muốn theo bối cảnh:** Đi học 2, Đi làm 3, Hẹn hò 3, Sự kiện quan trọng 5.

**Màu:** HSL. Trung tính khi `S < 15` hoặc `L < 15` hoặc `L > 90`. Độ lệch H tính vòng tròn: `d = min(|h1-h2|, 360-|h1-h2|)`.

**Lock/Swap:** món khóa cố định, bấm Đổi thì loại các bộ đã hiện rồi tính lại; thêm nhiễu ngẫu nhiên nhỏ để mỗi lần Đổi ra kết quả khác.

Mã tham chiếu đặt tại `client/src/engine/suggest.ts`. Các ngưỡng là số khởi đầu, chỉnh bằng 20-30 món đồ thật.

---

## 7. Dữ liệu

### Client (SQLite + file)

| Bảng / nơi lưu | Cột / nội dung |
|---|---|
| `items` | `id`, `category` (`top`/`bottom`), `image_path`, `color_h`, `color_s`, `color_l`, `formality` (1/3/5), `contexts`, `last_worn`, `wear_count` |
| `outfits` *(Sprint 3)* | `id`, `top_id`, `bottom_id`, `context`, `worn_at` |
| `planned_events` *(thiết kế, chưa code)* | `id`, `date`, `context`, `note`, `remind_at` |
| `settings` | `style`, `allow_analytics` |
| File ảnh | Thư mục riêng của app; DB chỉ lưu đường dẫn tương đối |
| SecureStore | JWT |

`category` dùng enum để mở rộng giày, áo khoác, phụ kiện sau mà không đổi cấu trúc.

### Server (SQLite trong volume Docker)

| Bảng | Cột |
|---|---|
| `users` | `id`, `google_sub`, `email`, `created_at` |
| `events` *(sau)* | `user_id`, `event_type`, `payload`, `ts` |

Server **không lưu ảnh lâu dài**: nhận ảnh, tách nền, trả về, bỏ.

---

## 8. Chi tiết Sprint 1 và 2 (giao khách)

### Sprint 1: Nền tảng và Auth

| Việc | Chi tiết |
|---|---|
| Server | Docker chạy `/health`, `/auth/google`; bảng `users` |
| Client đăng nhập | Google Sign-In → `id_token` → `/auth/google` → JWT → SecureStore |
| Phiên | Mở lại app vẫn đăng nhập; JWT hết hạn thì về màn đăng nhập; có Đăng xuất |
| Khung app | 3 tab điều hướng |
| DB | Bảng `items` + migration có version |
| Hạ tầng | Tunnel ổn định, README chạy server |

**Nghiệm thu:**
- Đăng nhập Gmail thành công trên điện thoại thật.
- Endpoint có JWT gọi được, không token thì 401.
- Tắt app mở lại vẫn còn phiên.

### Sprint 2: Tủ đồ

**UC1: Thêm món**

```
Chọn ảnh từ thư viện
 → Client resize (cạnh dài ~800px)
 → POST /image/process (kèm JWT)
 → Server tách nền + tính màu chủ đạo → trả về
 → Màn hình xác nhận: ảnh đã tách, màu tự điền, chọn Áo/Quần,
   mức trang trọng, bối cảnh
 → Lưu file ảnh + ghi DB
```

Fallback khi server lỗi hoặc timeout: lưu **ảnh gốc**, cho người dùng tự chọn màu, không chặn luồng.

**UC2: Xem và sửa kho đồ**
- Lưới ảnh, lọc theo Áo/Quần.
- Mở một món để sửa danh mục, màu, mức trang trọng, bối cảnh; xóa món (xóa luôn file ảnh).
- Trạng thái trống có nút "Thêm món đầu tiên".

**Nghiệm thu:**
- Thêm 1 món trong tối đa 4 chạm sau khi chọn ảnh.
- Xem, sửa, xóa hoạt động; đóng mở app dữ liệu vẫn còn.
- Thời gian tách nền trên laptop của nhóm đã đo thật và ghi lại.

---

## 9. Server và Docker

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
│   ├── assets/
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

### `server/main.py`

```python
import io, os, time, base64, sqlite3, colorsys
from collections import Counter

import jwt
from fastapi import FastAPI, UploadFile, File, Header, HTTPException
from fastapi.responses import JSONResponse
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


def dominant_hsl(img: Image.Image):
    """Màu chủ đạo của các pixel không trong suốt, trả về (H 0-360, S 0-100, L 0-100)."""
    small = img.copy()
    small.thumbnail((64, 64))
    px = [p for p in small.getdata() if p[3] > 128]
    if not px:
        return 0, 0, 50
    bucket = lambda p: (p[0] // 32, p[1] // 32, p[2] // 32)
    top_bucket = Counter(bucket(p) for p in px).most_common(1)[0][0]
    pts = [p for p in px if bucket(p) == top_bucket]
    r = sum(p[0] for p in pts) / len(pts) / 255
    g = sum(p[1] for p in pts) / len(pts) / 255
    b = sum(p[2] for p in pts) / len(pts) / 255
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return round(h * 360), round(s * 100), round(l * 100)


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
    h, s, l = dominant_hsl(out)
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return JSONResponse({
        "image_base64": base64.b64encode(buf.getvalue()).decode(),
        "h": h, "s": s, "l": l,
    })
```

### Chạy

```bash
cd server
docker compose up --build -d
docker compose logs tunnel | grep trycloudflare   # lấy link https://xxxx.trycloudflare.com
curl https://xxxx.trycloudflare.com/health
```

Dán link vào `EXPO_PUBLIC_API_URL` của client. Link có HTTPS sẵn, điện thoại khác mạng vẫn gọi được.

### Rủi ro khi dùng laptop làm server

| Rủi ro | Cách giảm |
|---|---|
| Link tunnel miễn phí **đổi mỗi lần chạy lại**, app đã cài sẽ gọi sai | Dùng link cố định (Cloudflare Tunnel có tên + domain, hoặc Tailscale Funnel) |
| Laptop tắt, sleep hoặc mất mạng khi khách dùng | Tắt sleep, cắm sạc, báo khung giờ server online |
| Server lỗi thì không tách nền được | Fallback lưu ảnh gốc; app vẫn dùng được |
| Đăng nhập cần server | Cho dùng tiếp khi JWT còn hạn |
| Khách test kéo dài nhiều ngày | Cân nhắc đưa Docker lên host miễn phí/rẻ; xem lại hạn mức từng nhà cung cấp |

Bảo mật: mọi endpoint (trừ `/health`, `/auth/google`) bắt buộc JWT; **không commit** `.env`; **không để API key trong client** (mọi biến `EXPO_PUBLIC_*` đều lộ trong app).

---

## 10. Quyền riêng tư

- Dữ liệu tủ đồ và lịch sử **ở lại trên máy**.
- Server lưu tài khoản (Google ID, email). Ảnh chỉ gửi lên để tách nền và không được lưu lại.
- Thống kê (nếu làm sau) chỉ là metadata ẩn danh, **chỉ khi người dùng bật đồng ý**.
- Có màn hình giải thích rõ gửi gì, cho đăng xuất và cho xóa dữ liệu.

---

## 11. Build và giao khách

| Giai đoạn | Cách chạy |
|---|---|
| Dev | `npx expo start` (Expo Go cho phần không cần Google Sign-In) |
| Từ Sprint 1 | **Development build** qua EAS để thử Google Sign-In |
| Giao khách | **APK** build bằng EAS Build (hoặc `expo prebuild` + Gradle) |
| iOS | Chỉ khi có tài khoản Apple Developer; không cam kết ở giai đoạn này |

Trước khi giao: cài thử APK trên máy sạch, thử đăng nhập, thêm món, tắt/mở app; kèm README cách chạy server và bản hướng dẫn cài APK.

---

## 12. Việc còn mở

1. Link server cố định cho khách test: dùng domain riêng hay đưa lên host?
2. Xác nhận bỏ giày khỏi bộ đồ (hiện tài liệu đang để bộ gồm áo + quần/váy). Nếu cần giữ giày, chỉ cần thêm `shoes` vào enum `category` và vòng lặp tổ hợp.
3. Chốt cách thông báo (local notification hay server push) khi thiết kế lịch ở Sprint 4.
4. Dữ liệu mẫu 15-20 món để test và demo.
