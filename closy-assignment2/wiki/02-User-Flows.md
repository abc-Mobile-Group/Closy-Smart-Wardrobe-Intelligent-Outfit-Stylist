# 02. User Flows

Các flow dưới đây phải **khớp từng màn hình** với file Figma. Mỗi hộp là một màn hình hoặc một trạng thái; hộp có chữ "Trạng thái" cần có frame riêng trên Figma (xem `05-Edge-States-Spec.md`).

## Flow 1. Onboarding và nạp đồ
```mermaid
flowchart TD
  A([Mở app]) --> B{Đã đăng nhập?}
  B -- Rồi --> H[Hôm nay của bạn]
  B -- Chưa --> C[Đăng nhập]
  C -- Chưa có tài khoản --> D[Đăng ký]
  D --> E[Bắt đầu cùng Closy<br/>chọn phong cách]
  C -- Thành công --> H
  E --> F[Tủ đồ - Trạng thái trống]
  F --> G[Thêm món đồ]
  G --> G1[Chọn ảnh: Chụp hoặc Thư viện<br/>Trạng thái: xin quyền]
  G1 --> G2[Trạng thái: Đang tách nền AI]
  G2 -- Thành công --> G3[Xác nhận loại, màu, độ lịch sự, dịp]
  G2 -- Thất bại --> ERR[[Flow 4: Phục hồi lỗi]]
  G3 --> G4[Lưu vào tủ đồ]
  G4 --> G5[Trạng thái: Đã thêm vào tủ đồ] --> W[Tủ đồ]
```

## Flow 2. Phối đồ nhanh (mục tiêu dưới 20 giây)
```mermaid
flowchart TD
  H[Hôm nay của bạn] --> K[Chọn bối cảnh<br/>Đi học / Đi làm / Đi chơi / Hẹn hò]
  K --> L[Trạng thái: Đang tạo gợi ý]
  L --> M[Gợi ý phối đồ<br/>3 bộ kèm lý do]
  M -- Chọn bộ này --> N[Điều chỉnh bộ đồ]
  M -- Tủ thiếu đồ --> X[Trạng thái: Chưa đủ để phối<br/>nêu rõ thiếu gì]
  X --> G[Thêm món đồ]
  N --> O[Xác nhận mặc]
  O --> P[Lịch sử mặc đồ<br/>Trạng thái: Đã lưu bộ đồ hôm nay]
```

## Flow 3. Khóa / Đổi món và Xác nhận mặc
```mermaid
flowchart TD
  N[Điều chỉnh bộ đồ] --> Q[Khóa món thích]
  Q --> R{Đổi}
  R -- Đổi 1 món --> S[Bộ mới, món khóa giữ nguyên]
  R -- Đổi tất cả món chưa khóa --> S
  R -- Không còn món thay --> T[Thông báo: không có món thay thế]
  S --> N
  N --> O[Xác nhận mặc]
  O --> P[Lịch sử mặc đồ]
```

## Flow 4. Nhánh phục hồi lỗi
```mermaid
flowchart TD
  G2[Đang tách nền AI] -- Lỗi/timeout --> E1[Trạng thái: Không tách được nền]
  E1 -- Dùng ảnh gốc --> G3[Xác nhận thuộc tính<br/>tự chọn màu]
  E1 -- Thử lại --> G2
  E1 -- Chọn ảnh khác --> G
  G2 -- Không phải trang phục --> E2[Trạng thái: Không nhận diện được trang phục] --> G[Chọn ảnh khác]
  A[Đăng nhập / Đăng ký] -- Sai dữ liệu --> E3[Trạng thái: Lỗi nhập liệu / lỗi server] --> A
  Z[Mất mạng hoặc không có GPS] --> E4[Ẩn thời tiết<br/>vẫn phối đồ local]
  S1[Phiên hết hạn] --> C[Đăng nhập]
```

## Flow 5. Cài đặt và quyền riêng tư
```mermaid
flowchart TD
  H[Bất kỳ tab nào] -- Chạm avatar --> U[Hồ sơ]
  U --> ST[Cài đặt và Quyền riêng tư]
  ST --> P1[Dữ liệu được lưu ở đâu]
  ST --> P2[Quyền truy cập: Camera, Thư viện, Vị trí]
  ST --> P3[Xóa toàn bộ tủ đồ và lịch sử] --> P4[Xác nhận xóa]
  ST --> P5[Đăng xuất] --> C[Đăng nhập]
```

## Bảng đối chiếu Flow ↔ Màn hình Figma
| Màn hình | F1 | F2 | F3 | F4 | F5 |
|---|:-:|:-:|:-:|:-:|:-:|
| Đăng ký | x | | | x | |
| Đăng nhập | x | | | x | x |
| Bắt đầu cùng Closy | x | | | | |
| Hôm nay của bạn | x | x | | x | x |
| Tủ đồ | x | | | | |
| Thêm món đồ | x | | | x | |
| Gợi ý phối đồ | | x | | | |
| Điều chỉnh bộ đồ | | x | x | | |
| Lịch sử mặc đồ | | x | x | | |
| Cài đặt & Quyền riêng tư | | | | | x |

> Cách dùng: mỗi dòng của bảng phải ứng với một frame tên trùng trên Figma. Frame nào có trên Figma mà không có trong bảng, hoặc ngược lại, là chỗ lệch cần sửa.
> Lưu ý nhỏ: trong code hiện tại nút của Onboarding đưa người dùng sang "Hôm nay" chứ không sang Tủ đồ trống. Nhóm chọn một cách và để Figma, Wiki, code cùng khớp.
