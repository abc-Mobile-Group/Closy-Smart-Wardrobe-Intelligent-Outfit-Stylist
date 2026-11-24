# 07. Quy ước phát triển

> Phần "cách làm" bên dưới đúng với cách code đang tổ chức. Phần "đề xuất" là gợi ý, nhóm có thể đổi.

## 1. Trước khi tạo Pull Request

```bash
cd client && npx tsc --noEmit && npm test
cd ../server && source .venv/bin/activate && pytest -q
```
Cả hai phải xanh (CI cũng chạy đúng các lệnh này khi push lên `main`/`develop` và khi mở PR). Sửa code mà đổi hành vi thì **sửa tài liệu trong `Docs/` ở cùng PR**.

## 2. Việc hay làm

### Thêm một màn hình
1. Tạo file trong `client/app/` (tên file = đường dẫn). File phải `export default` một component.
2. Nếu là tab: khai báo trong `app/(tabs)/_layout.tsx`. Nếu là màn hình đẩy lên: khai báo `Stack.Screen` trong `app/_layout.tsx` (không bắt buộc nhưng nên để đặt hiệu ứng chuyển).
3. Dùng màu/khoảng cách từ `src/constants/theme.ts`, không viết cứng mã màu.
4. Màn hình chỉ gọi store hoặc service, **không** gọi SQLite/`fetch` trực tiếp.

### Thêm cột hoặc bảng SQLite
1. Thêm **một phần tử mới vào cuối** mảng `MIGRATIONS` trong `client/src/db/migrations.ts`. Không sửa phần tử cũ.
2. Cập nhật kiểu trong `src/types/item.ts` (nếu là bảng `items`) và repository tương ứng.
3. Viết SQL bằng tham số `?`, không nối chuỗi.
4. Thử trên máy đã có dữ liệu cũ để chắc migration chạy tiếp được.

### Thêm endpoint server
1. Thêm route trong `server/main.py`. Cần đăng nhập thì thêm `uid: int = Depends(current_user_id)`.
2. Thêm test trong `server/tests/` (xem `test_api.py` để lấy mẫu đăng ký + lấy token).
3. Khai báo hàm gọi trong `client/src/api/endpoints.ts`.
4. Mọi endpoint (trừ `/health`, `/auth/*`) **phải** yêu cầu JWT.

### Đổi cách chấm điểm gợi ý
1. Sửa `client/src/engine/suggest.ts` (hoặc `ColorHarmonyEngine.ts`, `swap.ts`).
2. Chạy `npm test`. Test ở `client/__tests__/suggest.test.ts` tự tính điểm bằng tay, nên khi đổi trọng số phải **đổi số mong đợi** trong test cho đúng.
3. Cập nhật bảng công thức ở `03-Kien-truc.md`.

### Viết test client
- Đặt trong `client/__tests__/*.test.ts`.
- Đầu file: `import { describe, test, expect } from '@jest/globals';`
- Engine là hàm thuần nên test không cần mock. Service dùng SQLite thì tách phần tính toán ra hàm thuần để test (xem `InsightService.analyzeUsage`).

## 3. Quy ước code đang dùng
- Ngôn ngữ giao diện và comment: **tiếng Việt**. Tên biến/hàm: tiếng Anh.
- TypeScript `strict`. Tránh `any`; chỗ đang dùng `any` (vd `image: any`) là do kiểu của `Image source`.
- State toàn cục dùng Zustand (`src/store`). State của riêng một màn hình dùng `useState`.
- Ảnh món đồ lưu trong thư mục `wardrobe/` của app; DB chỉ lưu đường dẫn. Đường dẫn tuyệt đối có thể đổi sau khi cập nhật app, nên **luôn đọc ảnh qua `FileRepository.resolveUri`** (đã làm sẵn trong `ItemRepository`).
- Màu món đồ lưu cả `color_h/s/l` (engine dùng) lẫn `color_hex/color_name` (hiển thị). Đổi màu phải cập nhật **cả hai** (`ItemRepository.update` đã làm).

## 4. Không được commit
- `server/.env`, `client/.env` (chỉ `.env.example`)
- `server/.models/` (model tách nền, nặng)
- `*.db`, `.venv/`, `node_modules/`, `*.apk`, `*.aab`
- Bất kỳ khóa, token, mật khẩu thật

Nếu lỡ commit bí mật: coi như đã lộ, **đổi giá trị mới** (vd đổi `JWT_SECRET` thì mọi người dùng phải đăng nhập lại) chứ đừng chỉ xóa khỏi lịch sử.

## 5. Đề xuất làm việc nhóm
- Nhánh: `feature/<tên-ngắn>`, `fix/<tên-ngắn>`; không đẩy thẳng lên `main`.
- Commit: một thay đổi một commit, mô tả rõ (tránh "update", "big updates").
- PR nhỏ, có mô tả "làm gì, kiểm tra thế nào". Người khác review trước khi gộp.
- Mỗi việc trong `06-Tinh-trang-va-no-ky-thuat.md` nên có một Issue trên Project Board.
