"""Test bộ máy gợi ý phối đồ thông minh tại Backend (Backend Stylist Engine)."""
import json
import requests

BASE_URL = "http://localhost:8000"


def test_outfit_suggest_empty():
    res = requests.post(f"{BASE_URL}/outfit/suggest", json={"items": [], "context": "Đi học"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["outfits"]) == 0


def test_outfit_suggest_dress_standalone_and_two_piece():
    """Kiểm chứng:
    1. Đầm (Dress) là một set độc lập (one_piece), KHÔNG bao giờ đi kèm Áo hay Quần!
    2. Váy (Skirt) hoặc Quần bắt buộc đi cùng Áo!
    3. Chấm điểm Color Harmony chuẩn HSL (+3 trung tính, +3 tone-sur-tone, +2 tương phản, -2 xung đột).
    """
    items = [
        # Áo
        {"id": 1, "name": "Áo sơ mi lụa trắng", "category": "Áo", "color_h": 0, "color_s": 0, "color_l": 100, "color_name": "Trắng"},
        # Quần
        {"id": 2, "name": "Quần jeans xanh navy", "category": "Quần", "color_h": 219, "color_s": 47, "color_l": 26, "color_name": "Xanh đậm"},
        # Chân váy
        {"id": 3, "name": "Chân váy chữ A đen", "category": "Váy", "color_h": 222, "color_s": 47, "color_l": 11, "color_name": "Đen"},
        # Đầm liền
        {"id": 4, "name": "Đầm hoa nhí hồng pastel", "category": "Đầm", "color_h": 350, "color_s": 45, "color_l": 75, "color_name": "Hồng"},
        # Giày
        {"id": 5, "name": "Giày sneaker trắng", "category": "Giày", "color_h": 0, "color_s": 0, "color_l": 100, "color_name": "Trắng"},
    ]

    res = requests.post(
        f"{BASE_URL}/outfit/suggest",
        json={
            "items": items,
            "context": "Đi học",
            "weather": {"temperature": 26, "is_raining": False, "location_name": "Hà Nội", "condition_description": "trời dịu mát"},
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    outfits = data["outfits"]
    assert len(outfits) >= 2

    # Tìm bộ phối Đầm
    dress_outfit = next((o for o in outfits if o["type"] == "one_piece"), None)
    assert dress_outfit is not None, "Phải có gợi ý bộ đầm liền"
    dress_cats = [it["category"] for it in dress_outfit["items"]]
    assert "Đầm" in dress_cats
    assert "Quần" not in dress_cats, "Đầm TUYỆT ĐỐI không đi kèm Quần!"
    assert "Áo" not in dress_cats, "Đầm TUYỆT ĐỐI không đi kèm Áo thun/sơ mi!"

    # Tìm các bộ phối two_piece (Áo + Quần hoặc Áo + Váy)
    two_piece_outfits = [o for o in outfits if o["type"] == "two_piece"]
    assert len(two_piece_outfits) >= 1
    for o in two_piece_outfits:
        cats = [it["category"] for it in o["items"]]
        assert "Áo" in cats, "Two-piece bắt buộc phải có Áo"
        assert "Quần" in cats or "Váy" in cats, "Two-piece bắt buộc phải có Quần hoặc Váy"
        assert "Đầm" not in cats, "Two-piece không được chứa Đầm"
        assert o["harmony_score"] in [3, 2, -2], "Điểm Color Harmony phải chuẩn HSL (+3, +2, -2)"


def test_weather_adaptive_recommendation():
    """Kiểm chứng thời tiết lạnh < 22 độ C ưu tiên đồ ấm"""
    items = [
        {"id": 1, "name": "Áo phông cộc tay", "category": "Áo", "color_h": 0, "color_s": 0, "color_l": 100, "color_name": "Trắng"},
        {"id": 2, "name": "Áo len dày cổ lọ", "category": "Áo", "color_h": 42, "color_s": 35, "color_l": 94, "color_name": "Kem"},
        {"id": 3, "name": "Quần jeans dài", "category": "Quần", "color_h": 219, "color_s": 47, "color_l": 26, "color_name": "Xanh đậm"},
    ]

    # Trời lạnh 16 độ C
    res_cold = requests.post(
        f"{BASE_URL}/outfit/suggest",
        json={
            "items": items,
            "context": "Đi học",
            "weather": {"temperature": 16, "is_raining": False, "location_name": "Hà Nội", "condition_description": "trời se lạnh"},
        },
    )
    data = res_cold.json()
    top_outfit = data["outfits"][0]
    top_item_name = top_outfit["items"][0]["name"]
    assert "Áo len" in top_item_name, "Khi trời rét, áo len cổ lọ phải đứng đầu gợi ý!"


if __name__ == "__main__":
    print("1. Running test_outfit_suggest_empty()...")
    test_outfit_suggest_empty()
    print("   -> PASS!")

    print("2. Running test_outfit_suggest_dress_standalone_and_two_piece()...")
    test_outfit_suggest_dress_standalone_and_two_piece()
    print("   -> PASS!")

    print("3. Running test_weather_adaptive_recommendation()...")
    test_weather_adaptive_recommendation()
    print("   -> PASS!")

    print("\n✓ TOÀN BỘ 3/3 BACKEND OUTFIT SUGGESTION TESTS ĐÃ ĐẠT!")

