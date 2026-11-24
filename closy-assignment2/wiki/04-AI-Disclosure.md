# 04. Công bố sử dụng AI tạo sinh (AI Disclosure)

> Bản nháp. **Mỗi thành viên phải tự điền đúng thực tế của mình** và đối chiếu với mẫu/quy định AI Disclosure của môn học (người soạn chưa có tài liệu đó). Không khai thiếu, không khai thừa.

## 1. AI dùng làm công cụ trong quá trình làm bài
| Công cụ | Ai dùng | Dùng cho việc gì | Phần nào của bài |
|---|---|---|---|
| Claude (Anthropic) | **[ĐIỀN tên]** | Hỗ trợ viết, rà soát và sửa mã nguồn; viết test tự động; viết tài liệu kỹ thuật | Mã nguồn client/server, test, một số tài liệu trong `Docs/` |
| **[ĐIỀN: công cụ khác, ví dụ ChatGPT, Gemini, Figma AI, Copilot]** | **[ĐIỀN]** | **[ĐIỀN]** | **[ĐIỀN]** |

## 2. Cách nhóm kiểm chứng đầu ra của AI
- Chạy kiểm tra tự động: client `tsc` + Jest, server pytest.
- Thành viên đọc lại và chạy thử trên thiết bị trước khi đưa vào sản phẩm. **[ĐIỀN: ai kiểm, kiểm thế nào]**
- Chỗ AI sai hoặc phải sửa lại: **[ĐIỀN ví dụ thật nếu có]**

## 3. Phần do thành viên tự làm, không dùng AI
**[ĐIỀN: ví dụ thiết kế Figma, khảo sát, kiểm thử người dùng, viết Behance...]**

## 4. AI nằm bên trong sản phẩm (không phải công cụ làm bài)
| Thành phần | Mục đích | Chạy ở đâu |
|---|---|---|
| rembg (U2Net) | Tách nền ảnh trang phục | Server của nhóm |
| K-Means | Trích màu chủ đạo | Server của nhóm |
| Gemma (qua Ollama) | Nhận diện loại đồ, tên gợi ý, từ chối ảnh không phải trang phục | Máy chủ của nhóm, không dùng API bên thứ ba |
| Engine gợi ý phối đồ | Chấm điểm bằng luật (HSL, độ trang trọng, thời tiết). **Không phải mô hình học máy** | Trên thiết bị |

## 5. Cam kết
Nhóm chịu trách nhiệm về toàn bộ nội dung nộp. Đầu ra của AI đã được thành viên đọc, kiểm tra và chỉnh sửa trước khi sử dụng.

Xác nhận từng thành viên: **[ĐIỀN: 4 tên + ngày]**
