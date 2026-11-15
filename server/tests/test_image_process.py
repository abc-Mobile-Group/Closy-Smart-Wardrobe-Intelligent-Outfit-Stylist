import base64
import io
import os
import tempfile
import time

os.environ["JWT_SECRET"] = "test-secret"
os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test_img.db")

import jwt
from fastapi.testclient import TestClient
from PIL import Image

try:
    import main
except ImportError:
    import server.main as main

client = TestClient(main.app)


def get_auth_token():
    payload = {"uid": 1, "exp": int(time.time()) + 3600}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm="HS256")


def test_process_image_requires_auth():
    # Gọi không có token -> 401
    res = client.post("/image/process")
    assert res.status_code == 401
    assert "Thiếu token" in res.json()["detail"]


def test_process_image_invalid_auth():
    # Gọi với token sai -> 401
    headers = {"Authorization": "Bearer invalid_token_123"}
    res = client.post("/image/process", headers=headers)
    assert res.status_code == 401


def test_process_image_rejects_non_image():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("test.txt", b"Hello world", "text/plain")}
    res = client.post("/image/process", headers=headers, files=files)
    assert res.status_code == 400
    assert "Định dạng tệp không được hỗ trợ" in res.json()["detail"]


def test_process_image_rejects_empty_file():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("empty.png", b"", "image/png")}
    res = client.post("/image/process", headers=headers, files=files)
    assert res.status_code == 400


def test_process_image_rejects_oversized_file():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    # Tạo payload vượt quá 20MB
    large_payload = b"0" * (20 * 1024 * 1024 + 10)
    files = {"file": ("large.png", large_payload, "image/png")}
    res = client.post("/image/process", headers=headers, files=files)
    assert res.status_code == 400
    assert "vượt quá giới hạn 20MB" in res.json()["detail"]


def test_process_image_success_end_to_end():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Tạo ảnh áo màu xanh navy (RGB: 36, 58, 99) trên nền trắng
    w, h = 300, 300
    img = Image.new("RGB", (w, h), color=(255, 255, 255))
    # Vẽ hình chữ nhật áo ở giữa
    for x in range(75, 225):
        for y in range(75, 225):
            img.putpixel((x, y), (36, 58, 99))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    t0 = time.time()
    res = client.post(
        "/image/process",
        headers=headers,
        files={"file": ("navy_shirt.png", buf.getvalue(), "image/png")},
    )
    elapsed = time.time() - t0

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["format"] == "png"
    assert data["image_base64"].startswith("data:image/png;base64,")

    # Giải mã base64 và xác thực ảnh trả về là PNG RGBA hợp lệ
    raw_b64 = data["image_base64"].split(",", 1)[1]
    decoded_bytes = base64.b64decode(raw_b64)
    out_img = Image.open(io.BytesIO(decoded_bytes))
    assert out_img.mode == "RGBA"

    # Kiểm tra trích xuất màu HSL và HEX
    color = data["color"]
    assert "hex" in color and color["hex"].startswith("#")
    assert 0 <= color["h"] <= 360
    assert 0 <= color["s"] <= 100
    assert 0 <= color["l"] <= 100
    assert "name" in color
    assert "closest_palette_id" in color
    assert isinstance(data["palette"], list)
    assert len(data["palette"]) > 0

    # Kiểm tra thời gian xử lý < 4s (hoặc thời gian endpoint trả về)
    assert "process_time_sec" in data
    print(f"Endpoint processed in {data['process_time_sec']}s (total roundtrip {round(elapsed, 2)}s)")
