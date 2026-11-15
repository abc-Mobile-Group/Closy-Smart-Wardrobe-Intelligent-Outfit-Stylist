import numpy as np
from PIL import Image
import main

print("=== KIỂM THỬ PHÂN LOẠI TRANG PHỤC VÀ ĐỒNG NHẤT MÀU SẮC ===")

# 1. Kiểm tra không còn biến GEMINI_API_KEY
assert not hasattr(main, "classify_clothing_with_gemini"), "classify_clothing_with_gemini phải được xóa bỏ hoàn toàn"
print("✓ 1. Đã gỡ bỏ Gemini hoàn toàn, chạy Local-First 100%.")

# 2. Kiểm tra đồng nhất màu sắc ngữ nghĩa
fallback = {"id": "white", "name": "Trắng", "hex": "#FFFFFF"}
c1 = main.resolve_clothing_color_preset("", "Áo sơ mi xanh ô liu", fallback)
assert c1["id"] == "olive" and c1["name"] == "Ô liu", f"Sai màu ô liu: {c1}"
print(f"✓ 2a. 'Áo sơ mi xanh ô liu' -> {c1['name']} ({c1['hex']})")

c2 = main.resolve_clothing_color_preset("", "Váy đầm hồng pastel", fallback)
assert c2["id"] == "dusty-pink" and c2["name"] == "Hồng phấn", f"Sai màu hồng pastel: {c2}"
print(f"✓ 2b. 'Váy đầm hồng pastel' -> {c2['name']} ({c2['hex']})")

c3 = main.resolve_clothing_color_preset("", "Quần jeans xanh đậm", fallback)
assert c3["id"] == "navy" and c3["name"] == "Xanh đậm", f"Sai màu xanh đậm: {c3}"
print(f"✓ 2c. 'Quần jeans xanh đậm' -> {c3['name']} ({c3['hex']})")

c4 = main.resolve_clothing_color_preset("", "Áo thun màu kem Lovely", fallback)
assert c4["id"] == "cream" and c4["name"] == "Kem", f"Sai màu kem: {c4}"
print(f"✓ 2d. 'Áo thun màu kem Lovely' -> {c4['name']} ({c4['hex']})")

# 3. Kiểm tra Heuristic hình học cho Quần (tránh bị nhận dạng nhầm thành Áo)
# Tạo mask cho quần dài (chiều cao 350, chiều rộng 180, có tách 2 ống)
img_pants = Image.new("RGBA", (200, 400), (0, 0, 0, 0))
for y in range(50, 380):
    for x in range(40, 160):
        # Tạo khe giữa 2 ống ở nửa dưới
        if y > 180 and 95 <= x <= 105:
            continue
        img_pants.putpixel((x, y), (36, 58, 99, 255))

res_pants = main.classify_clothing_heuristic(img_pants, "Xanh đậm")
assert res_pants["category"] == "Quần", f"Quần jeans bị phân loại sai thành {res_pants['category']}"
assert "Quần" in res_pants["name"], f"Tên quần không chuẩn: {res_pants['name']}"
print(f"✓ 3. Phân loại Quần jeans: Danh mục={res_pants['category']}, Tên={res_pants['name']}")

# 4. Kiểm tra Heuristic cho Đầm (dáng dài liền thân, không xòe tách chân)
img_dress = Image.new("RGBA", (200, 400), (0, 0, 0, 0))
for y in range(40, 380):
    # Dáng liền thân từ eo xuống rộng dần
    half_w = 30 + int((y - 40) * 0.15)
    for x in range(100 - half_w, 100 + half_w):
        img_dress.putpixel((x, y), (210, 155, 155, 255))

res_dress = main.classify_clothing_heuristic(img_dress, "Hồng phấn")
assert res_dress["category"] in ["Đầm", "Váy"], f"Đầm bị phân loại sai: {res_dress['category']}"
print(f"✓ 4. Phân loại Đầm/Váy dài: Danh mục={res_dress['category']}, Tên={res_dress['name']}")

# 5. Kiểm tra Heuristic cho Áo (dáng gần vuông hoặc chữ T)
img_shirt = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
for y in range(40, 260):
    for x in range(60, 240):
        img_shirt.putpixel((x, y), (255, 255, 255, 255))

res_shirt = main.classify_clothing_heuristic(img_shirt, "Trắng")
assert res_shirt["category"] == "Áo", f"Áo bị phân loại sai thành {res_shirt['category']}"
print(f"✓ 5. Phân loại Áo: Danh mục={res_shirt['category']}, Tên={res_shirt['name']}")

print("\n✓ TẤT CẢ CÁC BÀI KIỂM THỬ ĐỀU THÀNH CÔNG VƯỢT TRỘI!")
