# 05. Đặc tả Interaction States, Error Handling và màn hình Cài đặt (cho Figma)

Cột **Code hiện tại** cho biết app đã làm đúng chưa, để Figma, Wiki và sản phẩm không lệch nhau.
Chữ trong cột *Microcopy* lấy từ app thật; đổi được, miễn là Figma và code cùng một bản.

## A. Quy tắc chung cho cả 9 màn hình
| Quy tắc | Ngưỡng | Ghi chú rút từ app hiện tại |
|---|---|---|
| Vùng chạm tối thiểu | **44 × 44 pt** (Android: 48 dp) | Avatar 38, chip lọc ~32, nút Khóa/Đổi ~26 cao: nhỏ hơn ngưỡng. Vẽ vùng chạm 44 quanh chúng |
| Cỡ chữ nhỏ nhất | **12** cho nội dung, **11** cho caption | Code đang có chữ 9–10 ở vài chỗ (mô tả mức trang trọng, tag): nên tăng |
| Tương phản chữ thường | ≥ **4.5 : 1** (WCAG AA); chữ lớn và icon ≥ 3 : 1 | Teal `#007B8F` trên trắng ≈ 5.0 : 1 (đạt). Xám `#64748B` ≈ 4.8 : 1 (đạt). **`#94A3B8` ≈ 2.6 : 1 (không đạt)**: chỉ dùng cho icon/viền, không dùng cho chữ |
| Phân cấp | 1 hành động chính (nút teal đặc) mỗi màn hình | Hành động phụ dùng nút viền hoặc nút chữ |
| Nội dung thật | Tên món, tên người, ngày thật, không "Lorem ipsum" | Dùng tên như "Áo sơ mi trắng", "Quần jeans xanh đậm" |

> Số tương phản tính tay; hãy kiểm lại bằng plugin Stark hoặc Contrast trên Figma.

## B. Danh sách trạng thái cần có frame

### B1. Loading
| ID | Màn hình | Khi nào | Vẽ gì | Microcopy | Code hiện tại |
|---|---|---|---|---|---|
| L1 | Thêm món đồ | Đang tách nền AI | Khung ảnh có spinner; nút Lưu bị làm mờ, không bấm được | "Đang tách nền AI..." | Có |
| L2 | Gợi ý phối đồ, Hôm nay | Đang tạo gợi ý | Skeleton 1 thẻ lớn + 2 thẻ nhỏ | "Closy đang phối đồ cho bạn..." | Có ở Gợi ý, nhưng chữ cũ là "Backend AI Stylist..." (nay chạy trên máy, nên đổi). Hôm nay chưa có |

### B2. Empty / Incomplete
| ID | Màn hình | Khi nào | Vẽ gì | Microcopy | CTA | Code hiện tại |
|---|---|---|---|---|---|---|
| E1 | Tủ đồ | 0 món | Icon áo + khung nét đứt | "Tủ đồ đang trống" / "Chụp hoặc chọn ảnh một món để bắt đầu." | **Thêm món đầu tiên** | Có (sau bản vá gần đây) |
| E2 | Gợi ý, Hôm nay | 0 món | Thẻ trống | "Chưa đủ trang phục để phối" / "Tủ đồ của bạn đang trống..." | **Thêm món đồ** | Có |
| E3 | Gợi ý, Hôm nay | **Thiếu danh mục**, ví dụ có 3 áo, chưa có quần | Thẻ + chip các món đang có + dòng thiếu nổi bật | "Bạn có 3 áo nhưng chưa có quần hoặc chân váy." / "Thêm một chiếc quần để Closy phối được." | **Thêm quần/váy** | Chỉ có câu chung "Bạn cần có ít nhất một chiếc đầm, hoặc một chiếc áo kèm quần/chân váy". Figma nên vẽ bản nêu rõ thiếu gì; cần code thêm |
| E4 | Lịch sử | Ngày chưa mặc gì | Icon lịch | "Chưa có lịch sử mặc đồ ngày này" | (không) | Có |

### B3. Error & Recovery
| ID | Màn hình | Khi nào | Vẽ gì | Microcopy | CTA | Code hiện tại |
|---|---|---|---|---|---|---|
| R1 | Thêm món đồ | Tách nền AI lỗi hoặc quá thời gian | Banner vàng trên khung ảnh, ảnh gốc vẫn hiện | "Chưa tách được nền." / "Bạn có thể dùng ảnh gốc, rồi tự chọn màu." | **Dùng ảnh gốc** (chính), Thử lại, Chọn ảnh khác | **Chưa có banner**: app lặng lẽ dùng ảnh gốc. Cần bổ sung code theo thiết kế |
| R2 | Thêm món đồ | Ảnh không phải trang phục | Hộp thoại | "Không nhận diện được trang phục" / "Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!" | **Chọn ảnh khác** | Có (hộp thoại hệ thống) |
| R3 | Đăng nhập | Bỏ trống ô | Viền đỏ ô lỗi + dòng lỗi dưới ô | "Vui lòng nhập email" / "Vui lòng nhập mật khẩu" | Sửa rồi gửi lại | Có (hộp lỗi đỏ phía trên form) |
| R4 | Đăng nhập | Sai thông tin / bị khóa tạm | Hộp lỗi đỏ | "Email hoặc mật khẩu không chính xác" / "Sai quá nhiều lần, vui lòng thử lại sau 5 phút" | | Có |
| R5 | Đăng ký | Dữ liệu không hợp lệ | Viền đỏ + dòng lỗi dưới ô | "Vui lòng nhập họ và tên" / "Vui lòng nhập email hợp lệ" / "Mật khẩu phải có ít nhất 8 ký tự" / "Email này đã được đăng ký" | | Có |
| R6 | Mọi màn hình | Phiên hết hạn | Hộp thoại nhẹ | "Phiên đăng nhập đã hết hạn" / "Hãy đăng nhập lại để tiếp tục." | **Đăng nhập** | Tự đăng xuất về màn đăng nhập, **chưa có thông báo** |
| R7 | Đăng nhập, Thêm món | Không kết nối server | Hộp lỗi | "Không kết nối được máy chủ" / "Bạn vẫn xem tủ đồ và phối đồ bình thường." | **Thử lại** | Có thông báo lỗi chung |

### B4. Offline / No GPS
| ID | Màn hình | Khi nào | Vẽ gì | Microcopy | Code hiện tại |
|---|---|---|---|---|---|
| O1 | Hôm nay | Từ chối GPS hoặc mất mạng | **Ẩn thẻ thời tiết**, thay bằng 1 chip nhỏ; gợi ý phối vẫn hiện bình thường | "Chưa có thời tiết" · chạm để bật vị trí | **Lệch**: app hiện thời tiết mặc định "Hà Nội 26°" như thể là thật. Cần đổi theo thiết kế |
| O2 | Gợi ý | Offline | Không có cảnh báo chặn; gợi ý vẫn chạy | (không cần chữ) | Đúng: engine chạy trên máy |

### B5. Permission & Success
| ID | Màn hình | Khi nào | Vẽ gì | Microcopy | Code hiện tại |
|---|---|---|---|---|---|
| P1 | Thêm món đồ | Chạm "Chụp ảnh" lần đầu | Màn giải thích trước hộp thoại hệ thống | "Closy cần máy ảnh để chụp trang phục của bạn. Ảnh chỉ được dùng để thêm vào tủ đồ." | Xin đúng lúc chạm nút (đạt), có câu giải thích |
| P2 | Thêm món đồ | Chạm "Thư viện" lần đầu | Như trên | "Closy cần truy cập thư viện để bạn chọn ảnh trang phục." | Có |
| P3 | Hôm nay | Lần đầu vào, cần vị trí | Màn giải thích **trước** hộp thoại | "Closy dùng vị trí để xem thời tiết. Vị trí không được lưu." / [Cho phép] [Để sau] | **Lệch**: app xin vị trí ngay khi mở màn Hôm nay, chưa có màn giải thích |
| P4 | Tủ đồ | Sau khi lưu món | Toast dưới màn hình 2 giây | "Đã thêm vào tủ đồ" | Chưa có toast: app chuyển thẳng về Tủ đồ |
| P5 | Lịch sử | Sau "Xác nhận mặc" | Banner viền nét đứt, nút đóng | "Đã lưu bộ đồ hôm nay" / "Chúc bạn một ngày thật vui!" | Có |

## C. Màn hình Cài đặt & Minh bạch quyền riêng tư (màn hình mới)
Vào từ: chạm avatar (góc phải trên) → Hồ sơ → Cài đặt.

**Bố cục** (cuộn dọc, các nhóm là thẻ):

1. **Tài khoản**: tên, email, [Sửa tên], [Đăng xuất].
2. **Dữ liệu của bạn nằm ở đâu** (thẻ giải thích, chữ ngắn, có icon):
   - "Tủ đồ, ảnh và lịch sử mặc đồ **chỉ lưu trên điện thoại của bạn**."
   - "Gợi ý phối đồ được tính **ngay trên máy**, nên dùng được khi mất mạng."
   - "Ảnh được **nén còn tối đa 800 px** trước khi xử lý."
   - "Khi thêm món, ảnh được gửi **một lần** lên máy chủ của Closy để tách nền và **không được lưu lại**."
   - "Máy chủ chỉ lưu **email và tên** của bạn để đăng nhập."
   - "Vị trí chỉ dùng để xem thời tiết và **không được lưu**."
3. **Quyền truy cập**: 3 dòng Máy ảnh / Thư viện ảnh / Vị trí, mỗi dòng có trạng thái (Đã cho phép / Chưa) và nút **Mở cài đặt hệ thống**.
4. **Quản lý dữ liệu**: [Xóa toàn bộ tủ đồ và lịch sử] (nút đỏ viền) → hộp xác nhận: "Xóa vĩnh viễn X món đồ và toàn bộ lịch sử? Hành động này không hoàn tác." [Hủy] [Xóa].
5. **Về Closy**: phiên bản, Điều khoản, Chính sách bảo mật.

**Lưu ý trung thực:** màn hình này hiện **chưa có trong code** (chỉ có hộp Hồ sơ nhỏ). Hãy ghi trong Wiki là "Thiết kế, sẽ phát triển ở bước sau" nếu nhóm chưa kịp làm.

## D. Cách tổ chức trên Figma
- Trang `02. Final UI & Flows`: mỗi màn hình một Section; bên cạnh là các frame trạng thái đặt tên `Màn hình / Trạng thái` (ví dụ `Thêm món đồ / R1 Tách nền lỗi`).
- Trạng thái có tương tác: dùng **Variant** của component (Button: default, pressed, disabled, loading; Input: default, focus, error).
- Banner, Toast, Dialog, Skeleton làm thành **component dùng chung** ở trang `01. Design System` để người phụ trách Prototype nối vào flow.
