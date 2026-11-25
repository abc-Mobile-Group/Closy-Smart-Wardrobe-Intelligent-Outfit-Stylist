# Đo thời gian tách nền (`POST /image/process`)

Cách đo:
```bash
python3 server/scripts/benchmark_process.py --url http://localhost:8000 \
  --email <email> --password <mật khẩu> --dir ./sample_photos
```
Chuẩn bị khoảng 10 ảnh đồ thật (.jpg/.png) trong `sample_photos/` (không commit). Lần đầu tải model nên **bỏ qua kết quả lần đầu** (script đã tự bỏ khỏi trung bình).

## Điều kiện đo
- Ngày đo: …
- Máy: … (CPU / RAM / có GPU không)
- Ollama: bật / tắt (model `gemma4:e4b`)
- Mạng: localhost / tunnel

## Kết quả
<!-- dán output của benchmark_process.py vào đây -->

## Kết luận
…
