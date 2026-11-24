# 04. Sự cố thường gặp

Tìm triệu chứng ở cột trái. Phần lớn là lỗi **môi trường**, không phải lỗi code.

## Môi trường và cài đặt
| Triệu chứng | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| `python: command not found` | Ubuntu chỉ có `python3` | Dùng `python3` |
| `pytest` báo `ModuleNotFoundError: No module named 'fastapi'` | Terminal mới chưa bật venv (prompt không có `(.venv)`) | `cd server && source .venv/bin/activate` |
| `pip install -r requirements.txt: file not found` | Đang đứng sai thư mục | `cd server` trước |
| `ConfigError: package.json path does not exist` | Chạy `npx expo` ở thư mục `server/` hoặc gốc | `cd client` rồi chạy lại |
| `npm install` cảnh báo vulnerabilities / `@parcel/watcher` | Cảnh báo của npm | Bỏ qua được |

## Server
| Triệu chứng | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| `/image/process` trả 500, `Permission denied: '.../server/.models/models'` | Thư mục `server/.models` do Docker tạo, thuộc `root` | `sudo chown -R "$USER":"$USER" server/.models`, hoặc chạy với `REMBG_HOME="$HOME/.cache/rembg"` |
| `/image/process` 500 trong Docker, model không tải được | Compose mount `.models` **chỉ đọc** (`:ro`) | Tải model về `server/.models/` trước bằng cách chạy server ngoài Docker một lần |
| `onnxruntime` báo thiếu `libgomp.so` | Dockerfile chưa cài `libgomp1` | Thêm vào `server/Dockerfile` (xem file 02, mục 3) |
| Nhận diện loại đồ luôn là kết quả "đoán hình học" | Không kết nối được Ollama | Chạy Ollama, `ollama pull gemma4:e4b`; trong Docker/Linux đặt `OLLAMA_HOST=0.0.0.0` cho Ollama |
| Server lỗi khi khởi động: `KeyError: 'JWT_SECRET'` | Thiếu `server/.env` | `cp server/.env.example server/.env` và điền |
| `429 Sai quá nhiều lần` | Đăng nhập sai 5 lần trong 5 phút | Đợi 5 phút hoặc khởi động lại server |
| Sửa `main.py` trong Docker mà không thấy đổi | Container chưa nạp lại | `docker compose restart api` |
| Docker báo cổng 8000 đã dùng | Stack cũ còn chạy | `docker compose down` hoặc `docker ps` rồi tắt container cũ |

## Client / Expo
| Triệu chứng | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| App báo "Không kết nối được server" | `EXPO_PUBLIC_API_URL` sai, link tunnel đã chết, hoặc dùng `localhost` trên điện thoại | `curl <URL>/health`; lấy link mới; dùng IP LAN hoặc tunnel; chạy lại Metro với `-c` |
| "Chưa cấu hình EXPO_PUBLIC_API_URL" | `client/.env` thiếu hoặc chưa nạp | Kiểm tra `.env`, chạy lại `npx expo start -c` |
| Đổi `.env` mà app vẫn dùng giá trị cũ | Biến được nhúng lúc bundle | Tắt Metro, `npx expo start --dev-client -c`, Reload app |
| `Failed to connect to <IP>:8081` | Điện thoại không thấy Metro | `npx expo start --dev-client --tunnel -c`, hoặc phát hotspot |
| Báo thiếu native module (vd `expo-image-picker`) sau khi thêm thư viện | Bản build cũ chưa có module | `npm install`; nếu vẫn báo, **build lại development build** |
| App tự đăng xuất | JWT hết hạn (7 ngày) hoặc server trả 401 | Đăng nhập lại; nếu liên tục, kiểm tra `JWT_SECRET` server có bị đổi không |
| Chạy web: ảnh hoặc dữ liệu lạ | Web lưu ảnh dạng data URL, SQLite web chưa kiểm chứng kỹ | Dùng web để xem giao diện; thử đầy đủ trên Android |
| Expo Router cảnh báo thiếu default export | File route rỗng | Mọi file trong `app/` phải `export default` một component |

## Đăng nhập Google
| Triệu chứng | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| Báo cần "bản APK (Development Build)" | Đang chạy Expo Go hoặc web | Dùng development build, hoặc đăng nhập bằng email |
| `DEVELOPER_ERROR` | Chưa có Android client, sai package/SHA-1, hoặc mới tạo dưới ~10 phút | Xem file 05, mục Google Cloud |
| "Access blocked" | App ở chế độ Testing, Gmail chưa nằm trong **Test users** | Thêm Gmail vào Test users |

## Test và CI
| Triệu chứng | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| `tsc` báo thiếu `describe`/`expect` | Test cần import từ `@jest/globals` | Đầu file test: `import { describe, test, expect } from '@jest/globals';` |
| Jest báo "Your test suite must contain at least one test" | Jest quét nhầm file test cũ của nhóm | Giữ `jest.testMatch` trong `client/package.json` trỏ vào `__tests__/` |
| `test_outfit_suggest` báo 401 | Endpoint `/outfit/suggest` yêu cầu JWT | Test phải đăng ký/đăng nhập và gửi header `Authorization: Bearer ...` |
| `test_image_process` lỗi mạng / chậm trong CI | Tải model rembg lần đầu | Chạy lại, hoặc cache thư mục model trong workflow |
