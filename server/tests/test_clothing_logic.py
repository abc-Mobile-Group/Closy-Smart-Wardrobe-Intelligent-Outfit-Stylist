import numpy as np
from PIL import Image
import main

print("=== KIỂM THỬ PHÂN LOẠI TRANG PHỤC VÀ ĐỒNG NHẤT MÀU SẮC ===")


def test_gemini_removed():
    # 1. Kiểm tra không còn hàm classify_clothing_with_gemini
    assert not hasattr(main, "classify_clothing_with_gemini"), "classify_clothing_with_gemini phải được xóa bỏ hoàn toàn"


def test_color_preset_semantic_resolution():
    # 2. Kiểm tra đồng nhất màu sắc ngữ nghĩa
    fallback = {"id": "white", "name": "Trắng", "hex": "#FFFFFF"}
    c1 = main.resolve_clothing_color_preset("", "Áo sơ mi xanh ô liu", fallback)
    assert c1["id"] == "olive" and c1["name"] == "Ô liu", f"Sai màu ô liu: {c1}"

    c2 = main.resolve_clothing_color_preset("", "Váy đầm hồng pastel", fallback)
    assert c2["id"] == "dusty-pink" and c2["name"] == "Hồng phấn", f"Sai màu hồng pastel: {c2}"

    c3 = main.resolve_clothing_color_preset("", "Quần jeans xanh đậm", fallback)
    assert c3["id"] == "navy" and c3["name"] == "Xanh đậm", f"Sai màu xanh đậm: {c3}"

    c4 = main.resolve_clothing_color_preset("", "Áo thun màu kem Lovely", fallback)
    assert c4["id"] == "cream" and c4["name"] == "Kem", f"Sai màu kem: {c4}"


def test_heuristic_pants():
    # 3. Kiểm tra Heuristic hình học cho Quần (tránh bị nhận dạng nhầm thành Áo)
    img_pants = Image.new("RGBA", (200, 400), (0, 0, 0, 0))
    for y in range(50, 380):
        for x in range(40, 160):
            if y > 180 and 95 <= x <= 105:
                continue
            img_pants.putpixel((x, y), (36, 58, 99, 255))

    res_pants = main.classify_clothing_heuristic(img_pants, "Xanh đậm")
    assert res_pants["category"] == "Quần", f"Quần jeans bị phân loại sai thành {res_pants['category']}"
    assert "Quần" in res_pants["name"], f"Tên quần không chuẩn: {res_pants['name']}"


def test_heuristic_dress():
    # 4. Kiểm tra Heuristic cho Đầm (dáng dài liền thân, không xòe tách chân)
    img_dress = Image.new("RGBA", (200, 400), (0, 0, 0, 0))
    for y in range(40, 380):
        half_w = 30 + int((y - 40) * 0.15)
        for x in range(100 - half_w, 100 + half_w):
            img_dress.putpixel((x, y), (210, 155, 155, 255))

    res_dress = main.classify_clothing_heuristic(img_dress, "Hồng phấn")
    assert res_dress["category"] in ["Đầm", "Váy"], f"Đầm bị phân loại sai: {res_dress['category']}"


def test_heuristic_shirt():
    # 5. Kiểm tra Heuristic cho Áo (dáng gần vuông hoặc chữ T)
    img_shirt = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
    for y in range(40, 260):
        for x in range(60, 240):
            img_shirt.putpixel((x, y), (255, 255, 255, 255))

    res_shirt = main.classify_clothing_heuristic(img_shirt, "Trắng")
    assert res_shirt["category"] == "Áo", f"Áo bị phân loại sai thành {res_shirt['category']}"
