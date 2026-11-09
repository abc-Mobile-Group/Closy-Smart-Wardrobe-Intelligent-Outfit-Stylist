"""Closy server (Sprint 1): kiểm tra sống, đăng nhập Google, kiểm tra token."""
import os
import sqlite3
import time

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from google.auth.transport import requests as grequests
from google.oauth2 import id_token
from pydantic import BaseModel

JWT_SECRET = os.environ["JWT_SECRET"]
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
DB_PATH = os.environ.get("DB_PATH", "closy.db")
TOKEN_TTL = 7 * 24 * 3600  # 7 ngày

app = FastAPI(title="Closy API")


def get_db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute(
        """CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY,
            google_sub TEXT UNIQUE NOT NULL,
            email TEXT,
            created_at REAL NOT NULL)"""
    )
    return con


def current_user_id(authorization: str | None = Header(default=None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Thiếu token")
    try:
        payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=["HS256"])
        return int(payload["uid"])
    except Exception:
        raise HTTPException(401, "Token không hợp lệ hoặc đã hết hạn")


class GoogleLogin(BaseModel):
    id_token: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/google")
def auth_google(body: GoogleLogin):
    try:
        info = id_token.verify_oauth2_token(
            body.id_token, grequests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception:
        raise HTTPException(401, "Google token không hợp lệ")
    if info.get("email") and not info.get("email_verified", False):
        raise HTTPException(401, "Email Google chưa được xác minh")

    con = get_db()
    try:
        con.execute(
            "INSERT OR IGNORE INTO users(google_sub, email, created_at) VALUES(?,?,?)",
            (info["sub"], info.get("email"), time.time()),
        )
        con.commit()
        uid = con.execute(
            "SELECT id FROM users WHERE google_sub=?", (info["sub"],)
        ).fetchone()["id"]
    finally:
        con.close()

    expires_at = int(time.time()) + TOKEN_TTL
    token = jwt.encode({"uid": uid, "exp": expires_at}, JWT_SECRET, algorithm="HS256")
    return {"token": token, "expires_at": expires_at, "email": info.get("email")}


@app.get("/me")
def me(uid: int = Depends(current_user_id)):
    con = get_db()
    try:
        row = con.execute("SELECT id, email FROM users WHERE id=?", (uid,)).fetchone()
    finally:
        con.close()
    if not row:
        raise HTTPException(401, "Tài khoản không tồn tại")
    return {"id": row["id"], "email": row["email"]}
