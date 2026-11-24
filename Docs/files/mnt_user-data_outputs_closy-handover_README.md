# 👗 Closy — Smart Wardrobe & Intelligent Outfit Stylist

> *Ít phân vân hơn. Đúng chất bạn hơn.*

Ứng dụng di động (ưu tiên Android) giúp người trẻ 18–26 tuổi **phối đồ từ chính tủ đồ của mình**:
chọn bối cảnh → nhận tối đa 3 bộ kèm lý do → khóa món thích, đổi món khác → xác nhận mặc.

Đồ án môn CO3043 – Phát triển Ứng dụng Di động (ĐH Bách Khoa – ĐHQG TP.HCM), Tổ L01 – Nhóm L01 abc.

## 🧭 Mới vào dự án? Đọc theo thứ tự

1. [`Docs/README.md`](Docs/README.md): mục lục và lộ trình ngày đầu tiên
2. [`Docs/01-Tong-quan.md`](Docs/01-Tong-quan.md): app làm gì, có những màn hình nào
3. [`Docs/02-Cai-dat-va-chay.md`](Docs/02-Cai-dat-va-chay.md): cài đặt và chạy được app
4. [`Docs/06-Tinh-trang-va-no-ky-thuat.md`](Docs/06-Tinh-trang-va-no-ky-thuat.md): cái gì xong, cái gì chưa, việc nên làm

## 🗂️ Bản đồ thư mục

| Thư mục / file | Là gì | Trạng thái |
| :--- | :--- | :---: |
| `client/` | App Expo (React Native + TypeScript) | ✅ chính |
| `server/` | FastAPI: tài khoản, tách nền, nhận diện ảnh | ✅ chính |
| `Docs/` | Tài liệu kỹ thuật | ✅ |
| `docker-compose.yml` (gốc) | Chạy `web` + `api` + `tunnel` | ✅ |
| `.github/workflows/ci.yml` | CI: pytest + tsc + Jest | ✅ |
| `src/`, `package.json`, `nest-cli.json`, `render.yaml`, `Dockerfile` (ở gốc) | API **NestJS riêng cho bài tập**, không liên quan tới app | ⚠️ legacy |
| `skills/` | Tài liệu công cụ, không thuộc app | ⚠️ nên xóa |
| `Update by version/` | Chưa rõ nội dung, **hỏi nhóm trước khi xóa** | ❓ |

> `Dockerfile` ở gốc là của NestJS, còn `docker-compose.yml` ở gốc lại build `server/` (FastAPI). Hai thứ này **không đi chung**. Dockerfile của app nằm ở `server/Dockerfile` và `client/Dockerfile`.

## ⚡ Chạy thử nhanh nhất (web + server máy bạn)

Cần: Node 20+, Python 3.11+.

```bash
# Terminal 1: server
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env            # sửa JWT_SECRET thành chuỗi ngẫu nhiên dài (xem Docs/02)
uvicorn main:app --reload --port 8000

# Terminal 2: client
cd client
cp .env.example .env            # EXPO_PUBLIC_API_URL=http://localhost:8000
npm install
npm run web                     # mở http://localhost:8081, đăng ký bằng email
```

Lần đầu thêm món đồ, server tự tải model tách nền (~170 MB), nên cần có mạng và chờ hơi lâu.
Chạy trên điện thoại, Docker, Google Sign-In: xem [`Docs/02-Cai-dat-va-chay.md`](Docs/02-Cai-dat-va-chay.md).

## ✅ Kiểm tra

```bash
cd client && npx tsc --noEmit && npm test       # 4 suite Jest
cd server && source .venv/bin/activate && pytest -q
```

## 🔗 Liên kết

- Wiki (tài liệu môn học): <https://github.com/abc-Mobile-Group/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist/wiki>
- Project Board: <https://github.com/orgs/abc-Mobile-Group/projects/1>
- Figma Prototype: <https://www.figma.com/proto/275uX1MaT8FUdPYXBMhre6/Untitled?node-id=2-5833&starting-point-node-id=2%3A5833>
- Behance: <https://www.behance.net/gallery/258882835/Closy-Smart-Wardrobe-Intelligent-Outfit-Stylist>
