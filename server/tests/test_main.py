import hashlib

from fastapi.testclient import TestClient

import main

c = TestClient(main.app)  # không dùng `with` để khỏi tải model rembg lúc startup


def test_health():
    assert c.get("/health").json() == {"ok": True}


def test_register_then_login():
    r = c.post("/auth/register", json={"email": "A@x.com", "password": "12345678", "name": "A"})
    assert r.status_code == 200
    assert c.post("/auth/login", json={"email": "a@x.com", "password": "12345678"}).status_code == 200
    assert c.post("/auth/login", json={"email": "a@x.com", "password": "sai-sai-sai"}).status_code == 401


def test_google_links_existing_email(monkeypatch):
    c.post("/auth/register", json={"email": "link@x.com", "password": "12345678"})
    monkeypatch.setattr(
        main.id_token,
        "verify_oauth2_token",
        lambda *a, **k: {"sub": "g1", "email": "link@x.com", "email_verified": True, "name": "L"},
    )
    assert c.post("/auth/google", json={"id_token": "x"}).status_code == 200


def test_suggest_requires_auth():
    assert c.post("/outfit/suggest", json={"items": [], "context": "Đi học"}).status_code == 401


def test_legacy_password_hash_still_verifies():
    salt = "abc"
    h = hashlib.pbkdf2_hmac("sha256", b"12345678", salt.encode(), 100000).hex()
    assert main.verify_password("12345678", f"{salt}:{h}")


def test_color_harmony():
    f = main.score_color_harmony_hsl
    assert f({"h": 0, "s": 0, "l": 100}, {"h": 200, "s": 80, "l": 50})[0] == 3
    assert f({"h": 0, "s": 80, "l": 50}, {"h": 20, "s": 80, "l": 50})[0] == 3
    assert f({"h": 0, "s": 80, "l": 50}, {"h": 180, "s": 80, "l": 50})[0] == 2
    assert f({"h": 0, "s": 80, "l": 50}, {"h": 100, "s": 80, "l": 50})[0] == -2
