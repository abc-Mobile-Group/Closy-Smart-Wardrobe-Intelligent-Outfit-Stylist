import os
import tempfile
import time

os.environ["JWT_SECRET"] = "test-secret"
os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

client = TestClient(main.app)


@pytest.fixture
def google_ok(monkeypatch):
    monkeypatch.setattr(
        main.id_token,
        "verify_oauth2_token",
        lambda *_a, **_k: {"sub": "g-123", "email": "a@gmail.com", "email_verified": True},
    )


def login():
    r = client.post("/auth/google", json={"id_token": "fake"})
    assert r.status_code == 200
    return r.json()


def test_health():
    assert client.get("/health").json() == {"ok": True}


def test_login_ok_returns_token_and_expiry(google_ok):
    data = login()
    assert data["email"] == "a@gmail.com"
    assert data["expires_at"] > time.time()


def test_login_twice_same_user(google_ok):
    t1, t2 = login()["token"], login()["token"]
    uid = lambda t: jwt.decode(t, "test-secret", algorithms=["HS256"])["uid"]
    assert uid(t1) == uid(t2)


def test_login_bad_google_token(monkeypatch):
    def boom(*_a, **_k):
        raise ValueError("bad")

    monkeypatch.setattr(main.id_token, "verify_oauth2_token", boom)
    assert client.post("/auth/google", json={"id_token": "x"}).status_code == 401


def test_login_unverified_email(monkeypatch):
    monkeypatch.setattr(
        main.id_token,
        "verify_oauth2_token",
        lambda *_a, **_k: {"sub": "g-9", "email": "b@x.com", "email_verified": False},
    )
    assert client.post("/auth/google", json={"id_token": "x"}).status_code == 401


def test_me_requires_token():
    assert client.get("/me").status_code == 401
    assert client.get("/me", headers={"Authorization": "Bearer abc"}).status_code == 401


def test_me_with_token(google_ok):
    token = login()["token"]
    r = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@gmail.com"


def test_expired_token_rejected():
    old = jwt.encode({"uid": 1, "exp": int(time.time()) - 10}, "test-secret", algorithm="HS256")
    assert client.get("/me", headers={"Authorization": f"Bearer {old}"}).status_code == 401
