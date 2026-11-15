import base64
import io
import os
import time
import jwt
import requests
from PIL import Image

BASE_URL = os.environ.get("TEST_API_URL", "http://127.0.0.1:8000")
JWT_SECRET = os.environ.get("JWT_SECRET", "AH_WFNHG6pBbMh2kyb7Bqeb1fSepiXmjV0l1JjaRGb9mAWGG99jmtFwOCeEHbVUZ")


def get_auth_token():
    payload = {"uid": 1, "exp": int(time.time()) + 3600}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def test_process_image_requires_auth():
    print("1. Running test_process_image_requires_auth()...")
    res = requests.post(f"{BASE_URL}/image/process", json={"image_base64": "test"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("   -> PASS!")


def test_process_image_invalid_auth():
    print("2. Running test_process_image_invalid_auth()...")
    headers = {"Authorization": "Bearer invalid_token_123"}
    res = requests.post(f"{BASE_URL}/image/process", headers=headers, json={"image_base64": "test"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("   -> PASS!")


def test_process_image_rejects_empty_file():
    print("3. Running test_process_image_rejects_empty_file()...")
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("empty.png", b"", "image/png")}
    res = requests.post(f"{BASE_URL}/image/process", headers=headers, files=files)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    print("   -> PASS!")


def test_process_image_rejects_oversized_file():
    print("4. Running test_process_image_rejects_oversized_file()...")
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    large_payload = b"0" * (20 * 1024 * 1024 + 10)
    files = {"file": ("large.png", large_payload, "image/png")}
    res = requests.post(f"{BASE_URL}/image/process", headers=headers, files=files)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    print("   -> PASS!")


def test_process_image_rejects_non_clothing():
    print("5. Running test_process_image_rejects_non_clothing()...")
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Tạo ảnh hình khối đồ họa đơn thuần (không phải quần áo)
    img = Image.new("RGB", (300, 300), color=(255, 255, 255))
    for x in range(100, 200):
        for y in range(100, 200):
            img.putpixel((x, y), (36, 58, 99))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_data = base64.b64encode(buf.getvalue()).decode("utf-8")

    res = requests.post(
        f"{BASE_URL}/image/process",
        headers=headers,
        json={"image_base64": b64_data},
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["is_clothing"] is False, f"Expected is_clothing False, got {data}"
    assert "rejection_reason" in data or "message" in data
    print(f"   -> PASS! Thẩm định thành công từ chối vật phẩm không phải quần áo: '{data.get('message')}'")


def test_process_image_success_end_to_end():
    print("6. Running test_process_image_success_end_to_end()...")
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Đọc ảnh trang phục thật
    clothing_path = "/app/test_shirt.jpg"
    if not os.path.exists(clothing_path):
        clothing_path = "test_shirt.jpg"
    with open(clothing_path, "rb") as f:
        b64_data = base64.b64encode(f.read()).decode("utf-8")

    t0 = time.time()
    res = requests.post(
        f"{BASE_URL}/image/process",
        headers=headers,
        json={"image_base64": b64_data},
    )
    elapsed = time.time() - t0

    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["is_clothing"] is True
    assert data["category"] in ["Áo", "Quần", "Váy", "Đầm", "Giày"]
    assert data["format"] == "png"
    assert data["image_base64"].startswith("data:image/png;base64,")

    # Xác thực ảnh trả về
    raw_b64 = data["image_base64"].split(",", 1)[1]
    decoded_bytes = base64.b64decode(raw_b64)
    out_img = Image.open(io.BytesIO(decoded_bytes))
    assert out_img.mode == "RGBA"

    # Xác thực màu sắc
    color = data["color"]
    assert "hex" in color and color["hex"].startswith("#")
    assert "name" in color
    assert "closest_palette_id" in color

    print(f"   -> PASS! (Thời gian: {round(elapsed, 2)}s, Loại: {data['category']}, Màu: {color['name']})")


if __name__ == "__main__":
    print("=== CHẠY TOÀN BỘ KIỂM THỬ XỬ LÝ ẢNH (POST /image/process) ===\n")
    test_process_image_requires_auth()
    test_process_image_invalid_auth()
    test_process_image_rejects_empty_file()
    test_process_image_rejects_oversized_file()
    test_process_image_rejects_non_clothing()
    test_process_image_success_end_to_end()
    print("\n✓ TOÀN BỘ 6/6 TEST XỬ LÝ ẢNH VÀ THẨM ĐỊNH AI ĐỀU ĐẠT 100%!")
