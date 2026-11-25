# 06. Tình trạng dự án và nợ kỹ thuật

> Cập nhật: 25/11/2026. Lần kiểm gần nhất ghi lại: client `tsc` sạch + **21** test Jest (4 suite); server **31** test pytest. Con số sẽ đổi, hãy tự chạy lại.

## 1. Tình trạng theo module

| Module | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| Đăng ký / đăng nhập email, giữ phiên, đăng xuất | ✅ | Có test server |
| Đăng nhập Google | 🟡 | Có code; **chưa kiểm chứng trên máy thật**; cần development build |
| Tủ đồ: thêm / xem / sửa / xóa món | ✅ | Xóa món xóa luôn file ảnh |
| Tách nền, lấy màu, nhận diện loại đồ | ✅ | Cần model rembg; Ollama tùy chọn |
| Engine gợi ý + lý do | ✅ | Local-first, có test; trọng số chưa hiệu chỉnh bằng dữ liệu thật |
| Khóa / Đổi món | ✅ | Có test |
| Xác nhận mặc + Lịch sử | ✅ | Xem mục 2 (lỗi đếm lặp) |
| Thời tiết (GPS + Open-Meteo) | 🟡 | Có; **fallback đang hiện "Hà Nội 26°" như thật** |
| Thống kê, tủ còn thiếu gì (Phase 2) | ✅ | Có test, ngoài Figma |
| Sự kiện quan trọng (Phase 2) | ✅ | Chưa có thông báo nhắc |
| Màn Cài đặt & Minh bạch quyền riêng tư | ❌ | Chỉ có thiết kế Figma |
| Kho mẫu Capsule Basics | ❌ | (NestJS bài tập có, app thì chưa) |
| Lưu lựa chọn phong cách ở onboarding | ❌ | Giao diện có, không lưu |
| Like / Dislike học gu | ❌ | Nút có, chỉ đổi màu, không lưu |
| Thông báo nhắc sự kiện | ❌ | Chỉ có thiết kế: [Design-Notifications.md](Design-Notifications.md) |
| Đo thời gian tách nền chính thức | ❌ | [Benchmark.md](Benchmark.md) còn trống |

## 2. Lỗi / thiếu sót đã biết (nợ kỹ thuật)

Ưu tiên: **P1** sửa sớm, **P2** nên sửa, **P3** dọn dẹp.

| # | Ưu tiên | Vấn đề | Nơi | Hướng sửa |
| :-: | :-: | :--- | :--- | :--- |
| 1 | P1 | **Bấm "Xác nhận mặc" nhiều lần trong một ngày** cộng `wear_count` nhiều lần; Lịch sử chỉ hiện bộ mới nhất của ngày → thống kê sai | `HistoryService.confirmWear`, `history.tsx` | Mỗi ngày một bản ghi (hỏi "thay bộ hôm nay?") hoặc hiện tất cả bộ trong ngày |
| 2 | P1 | Tách nền lỗi → **im lặng** dùng ảnh gốc, không thông báo (thiết kế R1: banner "Dùng ảnh gốc / Thử lại") | `add-item.tsx` | Hiện banner khi `result.isFallback` |
| 3 | P1 | Không có GPS/mất mạng → hiện thời tiết mặc định "Hà Nội 26°" như thật (thiết kế O1: ẩn) | `WeatherService.ts`, `today.tsx` | Trả `null` khi fallback và ẩn thẻ thời tiết |
| 4 | P2 | App xin quyền vị trí **ngay khi mở** màn Hôm nay, chưa có màn giải thích trước (thiết kế P3) | `WeatherService.getCurrentWeather` | Màn giải thích rồi mới xin quyền |
| 5 | P2 | Lưu món xong chuyển thẳng về Tủ đồ, không có thông báo (thiết kế P4) | `add-item.tsx` | Toast "Đã thêm vào tủ đồ" |
| 6 | P2 | Hết phiên (401) → tự đăng xuất, không thông báo (thiết kế R6) | `api/client.ts`, `authStore` | Hiện thông báo ở màn đăng nhập |
| 7 | P2 | Tủ thiếu danh mục: chỉ có câu chung, chưa nêu rõ thiếu gì (thiết kế E3) | `today.tsx`, `suggest.tsx` | Dùng `analyzeGaps` trong `InsightService` |
| 8 | P2 | `ProfileModal` có các dòng **cố định**: "Phong cách chính: Tối giản", "Local-first trên máy", và nhãn **"Đã xác thực"** luôn hiện cạnh email (kể cả tài khoản email chưa xác minh) | `ProfileModal.tsx` | Xóa dòng hoặc nối với dữ liệu thật |
| 9 | P2 | Màn onboarding chọn phong cách nhưng **không lưu**; nút CTA chuyển sang **Hôm nay** (Flow trên Wiki vẽ là Tủ đồ) | `onboarding.tsx` | Chốt một cách, lưu vào bảng `settings` (cần migration mới) |
| 10 | P2 | Màn vào mặc định `index.tsx` đi tới **Tủ đồ**, còn đăng nhập xong đi tới **Hôm nay** (không nhất quán) | `app/index.tsx`, `login.tsx`, `_layout.tsx` | Thống nhất một màn đích |
| 11 | P2 | Nút "Quên mật khẩu?" ở màn đăng nhập **không làm gì** | `login.tsx` | Ẩn hoặc làm luồng đặt lại |
| 12 | P2 | Nút 👍/👎 ở màn Phối đồ không lưu, không ảnh hưởng gợi ý | `suggest.tsx` | Nối vào engine, hoặc bỏ |
| 13 | P2 | Chấm điểm phụ thuộc chuỗi trong tên món ("khoác", "thun"...) | `suggest.ts` | Thêm cột có cấu trúc (độ dày, tay áo...) bằng migration, đổi cả prompt AI |
| 14 | P2 | Rate-limit đăng nhập nằm trong bộ nhớ, `JWT_SECRET` yếu vẫn chạy được | `server/main.py` | Rate-limit bền vững; kiểm tra độ dài `JWT_SECRET` lúc khởi động |
| 15 | P3 | **Endpoint `/outfit/suggest` và hàm chấm điểm Python** không còn được client dùng; trùng logic với engine TS (ngưỡng đã bắt đầu lệch) | `server/main.py` | Xóa (cùng `test_outfit_suggest.py` và `outfitApi` trong `endpoints.ts`) |
| 16 | P3 | **File rỗng / giữ chỗ**: `components/{CategoryFilter,ColorPicker,EmptyState,FormalityPicker,ItemCard,OutfitCard}.tsx`, `constants/contexts.ts`, `engine/colorHarmony.ts`, `repositories/{EventRepository,OutfitRepository}.ts`, `store/suggestStore.ts`, `types/outfit.ts`, `utils/color.ts`, `app/item/[id].tsx`, `app/(tabs)/add.tsx` | `client/` | Xóa hoặc triển khai (nếu xóa `item/[id].tsx` và `(tabs)/add.tsx`, nhớ bỏ `Tabs.Screen name="add"` trong `(tabs)/_layout.tsx`) |
| 17 | P3 | Test cũ ở `client/src/engine/__tests__/` (`run-tests.js`, `swap.test.cjs`...) chạy bằng runner riêng, **chưa được kiểm tra sau khi `suggest.ts` được viết lại** | `client/src/engine/__tests__/` | Chạy thử; cái nào còn giá trị thì chuyển sang `client/__tests__/`, còn lại xóa |
| 18 | P3 | Hai file compose: `docker-compose.yml` (gốc) và `server/docker-compose.yml` (cũ, lỗi thời) | repo | Xóa bản trong `server/` |
| 19 | P3 | **NestJS ở gốc** (`src/`, `package.json`, `Dockerfile`, `nest-cli.json`, `render.yaml`, `tsconfig.json`) là API bài tập, lẫn với app | gốc | Chuyển vào `demo-nestjs/` (nhớ cập nhật `render.yaml` nếu còn deploy) |
| 20 | P3 | `skills/` là tài liệu công cụ, không thuộc app; `client/.env` có thể đang được git theo dõi | gốc, `client/.env` | `git rm -r skills/`; `git ls-files client/.env` rồi `git rm --cached client/.env` nếu có |
| 21 | P3 | Thư mục **`Update by version/`** chưa rõ nội dung | gốc | Hỏi người tạo; không xóa mù quáng |
| 22 | P3 | `@app.on_event("startup")` đã bị FastAPI đánh dấu deprecated | `server/main.py` | Chuyển sang lifespan |
| 23 | P3 | CI chạy `test_image_process` cần tải model rembg → chậm hoặc lỗi mạng | `.github/workflows/ci.yml` | Cache thư mục model |
| 24 | P2 | `server/.env.example` ghi `DB_PATH=/data/closy.db` (đường dẫn trong Docker) → chạy bằng `uvicorn` trực tiếp bị lỗi `unable to open database file` | `server/.env.example` | Đổi mặc định thành `closy.db` (compose đã tự đặt `/data/closy.db`) |
| 25 | P3 | `server/main.py` có import và khai báo **trùng** (`hmac`, `run_in_threadpool`, `ALLOWED_ORIGINS`, `Image.MAX_IMAGE_PIXELS` xuất hiện 2 lần) | `server/main.py` | Gộp lại; chạy `pytest` sau khi dọn |
| 26 | P3 | `app.json` và `eas.json` **ở gốc** lệch với `client/` (`projectId` khác) → dễ chạy `eas` nhầm thư mục | gốc | Xác nhận không dùng rồi xóa; luôn chạy `eas` trong `client/` |
| 27 | P3 | `Docs/Backlog/Backlog.md` là bản **cũ** (danh mục chỉ Áo/Quần, mô tả `/image/process` multipart, Dockerfile khác thực tế) | `Docs/Backlog/` | Chuyển sang `Docs/Archive/` kèm cảnh báo ở đầu file (đúng như `DECISIONS.md` đã nói) |
| 28 | P3 | Log debug `console.log` ở mọi request/ảnh | `api/client.ts`, `ImageService.ts` | Bọc bằng `__DEV__` hoặc gỡ |
| 29 | P3 | Chuỗi UI "Backend AI Stylist đang phối đồ..." trong `suggest.tsx` trong khi engine chạy **trên máy** | `suggest.tsx` | Sửa lại lời, ví dụ "Closy đang phối đồ..." |

## 3. Việc dễ làm cho người mới (làm quen code)

1. **#16**: xóa các file rỗng, chạy `npx tsc --noEmit` xem còn ổn không.
2. **#11**: ẩn nút "Quên mật khẩu?".
3. **#24**: sửa `DB_PATH` trong `server/.env.example`.
4. **#5**: thêm toast sau khi lưu món.
5. **#2**: banner "Dùng ảnh gốc / Thử lại" khi tách nền lỗi.
6. **#3**: ẩn thẻ thời tiết khi không có GPS.
7. **#1**: chống đếm lặp "Xác nhận mặc" và viết test cho `HistoryService`.

## 4. Dọn repo (gợi ý lệnh, kiểm tra trước khi chạy)

```bash
# Tài liệu: Docs/Chi tiet/ là nguồn duy nhất
git rm Docs/README.md Docs/setup.md
# README gốc = bản đã chuyển ra từ Docs/Chi tiet/mnt_user-data_outputs_closy-handover_README.md
git rm "Docs/Chi tiet/mnt_user-data_outputs_closy-handover_README.md"
# (README.md ở gốc đã được thay bằng bản mới trong bộ zip)

# Bản trùng / lỗi thời
git rm server/docker-compose.yml
mkdir -p Docs/Archive && git mv Docs/Backlog/Backlog.md Docs/Archive/Backlog-v2.md   # rồi thêm cảnh báo "đã cũ" ở đầu file

# Chỉ chạy khi chắc chắn (xem #20, #21, #26)
git rm -r skills/
git ls-files client/.env && git rm --cached client/.env
```

## 5. Checklist nghiệm thu trên máy thật

**Gợi ý (Sprint 3)**
- [ ] Chọn bối cảnh → có 2–3 bộ trong < 3 giây, tắt mạng vẫn chạy
- [ ] Mỗi bộ hiện lý do
- [ ] Khóa 1 món → Đổi → món khóa giữ nguyên, bộ mới khác bộ đã xem
- [ ] Xác nhận mặc → hiện trong Lịch sử đúng ngày, `wear_count` tăng

**Thống kê và sự kiện (Sprint 4)**
- [ ] Tab Thống kê hiện số liệu đúng sau vài lần xác nhận mặc
- [ ] "Phối ngay" mở bộ đồ có chứa món bị bỏ quên
- [ ] Thêm sự kiện, đóng mở app vẫn còn; "Lên đồ" cho bộ trang trọng nhất
- [ ] Tủ thiếu giày/quần/đồ trang trọng thì có cảnh báo

Ngưỡng Thống kê (chỉnh ở đầu `InsightService.ts`): ít dùng khi ≥ 30 ngày chưa mặc, hoặc chưa mặc lần nào sau 14 ngày; đề xuất cho đi khi ≥ 120 ngày.

## 6. Hướng phát triển (Phase 2)
Kho mẫu Capsule Basics · lưu phong cách và học gu từ Like/Dislike · màn Cài đặt (xóa dữ liệu, trạng thái quyền) · thông báo nhắc sự kiện (xem `Design-Notifications.md`) · đồng bộ/sao lưu tủ đồ nếu cần.
