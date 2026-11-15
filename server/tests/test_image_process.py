import base64
import io
import os
import tempfile
import time
from PIL import Image
import jwt
import pytest
from fastapi.testclient import TestClient

os.environ["JWT_SECRET"] = os.environ.get("JWT_SECRET", "test-secret-key-closy-backend-image")
os.environ["DB_PATH"] = os.environ.get("DB_PATH", os.path.join(tempfile.mkdtemp(), "test.db"))

import main  # noqa: E402

client = TestClient(main.app)


def get_auth_token():
    payload = {"uid": 1, "exp": int(time.time()) + 3600}
    return jwt.encode(payload, main.JWT_SECRET, algorithm="HS256")


def test_process_image_requires_auth():
    res = client.post("/image/process", json={"image_base64": "test"})
    assert res.status_code == 401


def test_process_image_invalid_auth():
    headers = {"Authorization": "Bearer invalid_token_123"}
    res = client.post("/image/process", headers=headers, json={"image_base64": "test"})
    assert res.status_code == 401


def test_process_image_rejects_empty_file():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("empty.png", b"", "image/png")}
    res = client.post("/image/process", headers=headers, files=files)
    assert res.status_code == 400


def test_process_image_rejects_oversized_file():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    large_payload = b"0" * (20 * 1024 * 1024 + 10)
    files = {"file": ("large.png", large_payload, "image/png")}
    res = client.post("/image/process", headers=headers, files=files)
    assert res.status_code == 400


def test_process_image_rejects_non_image():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("test.txt", b"Hello world non image", "text/plain")}
    res = client.post("/image/process", headers=headers, files=files)
    assert res.status_code == 400


def test_process_image_rejects_non_clothing(monkeypatch):
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Mock Ollama trả về vật thể không phải trang phục
    monkeypatch.setattr(
        main,
        "classify_clothing_with_ollama",
        lambda *_a, **_k: {
            "is_clothing": False,
            "rejection_reason": "Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!",
        },
    )

    img = Image.new("RGB", (300, 300), color=(255, 255, 255))
    for x in range(100, 200):
        for y in range(100, 200):
            img.putpixel((x, y), (36, 58, 99))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_data = base64.b64encode(buf.getvalue()).decode("utf-8")

    res = client.post(
        "/image/process",
        headers=headers,
        json={"image_base64": b64_data},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_clothing"] is False
    assert "rejection_reason" in data or "message" in data


def test_process_image_success_end_to_end(monkeypatch):
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Mock Ollama để deterministic chạy độc lập trong CI
    monkeypatch.setattr(
        main,
        "classify_clothing_with_ollama",
        lambda *_a, **_k: {
            "is_clothing": True,
            "category": "Áo",
            "name": "Áo thun xanh navy",
            "color_name": "Xanh đậm",
            "formality": 1,
            "contexts": ["Đi học", "Đi chơi"],
        },
    )

    # Tạo ảnh áo màu xanh navy (RGB: 36, 58, 99) trên nền trắng
    img = Image.new("RGB", (300, 300), color=(255, 255, 255))
    for x in range(75, 225):
        for y in range(75, 225):
            img.putpixel((x, y), (36, 58, 99))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_data = base64.b64encode(buf.getvalue()).decode("utf-8")

    t0 = time.time()
    res = client.post(
        "/image/process",
        headers=headers,
        json={"image_base64": b64_data},
    )
    elapsed = time.time() - t0

    assert res.status_code == 200
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
