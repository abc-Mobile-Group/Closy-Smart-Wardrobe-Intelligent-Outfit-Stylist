"""Closy server: kiểm tra sống, đăng nhập Google, đăng ký & đăng nhập email, kiểm tra token."""
import hashlib
import os
import secrets
import sqlite3
import time

from dotenv import load_dotenv
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as grequests
from google.oauth2 import id_token
from pydantic import BaseModel

# Tự động nạp cấu hình từ .env
load_dotenv()

JWT_SECRET = os.environ["JWT_SECRET"]
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
DB_PATH = os.environ.get("DB_PATH", "closy.db")
TOKEN_TTL = 7 * 24 * 3600  # 7 ngày

app = FastAPI(title="Closy API")

# Cấu hình CORS cho phép client Web gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute(
        """CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_sub TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            name TEXT,
            created_at REAL NOT NULL)"""
    )
    # Tự động thêm cột nếu bảng đã được tạo từ phiên bản cũ
    cols = [r["name"] for r in con.execute("PRAGMA table_info(users)").fetchall()]
    if "password_hash" not in cols:
        con.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    if "name" not in cols:
        con.execute("ALTER TABLE users ADD COLUMN name TEXT")
    return con


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return f"{salt}:{h}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, h = stored_hash.split(":")
        check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
        return h == check
    except Exception:
        return False


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


class RegisterBody(BaseModel):
    email: str
    password: str
    name: str | None = None


class LoginBody(BaseModel):
    email: str
    password: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/register")
def auth_register(body: RegisterBody):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Email không hợp lệ")
    if len(body.password) < 8:
        raise HTTPException(400, "Mật khẩu phải có ít nhất 8 ký tự")

    con = get_db()
    try:
        existing = con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            raise HTTPException(400, "Email này đã được đăng ký")

        p_hash = hash_password(body.password)
        now = time.time()
        cur = con.execute(
            "INSERT INTO users(email, password_hash, name, created_at) VALUES(?,?,?,?)",
            (email, p_hash, (body.name or "").strip() or None, now),
        )
        con.commit()
        uid = cur.lastrowid
    finally:
        con.close()

    expires_at = int(time.time()) + TOKEN_TTL
    token = jwt.encode({"uid": uid, "exp": expires_at}, JWT_SECRET, algorithm="HS256")
    return {"token": token, "expires_at": expires_at, "email": email, "name": body.name}


@app.post("/auth/login")
def auth_login(body: LoginBody):
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(400, "Vui lòng nhập email")

    con = get_db()
    try:
        user = con.execute(
            "SELECT id, email, password_hash, name FROM users WHERE email=?", (email,)
        ).fetchone()
    finally:
        con.close()

    if not user or not user["password_hash"] or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email hoặc mật khẩu không chính xác")

    expires_at = int(time.time()) + TOKEN_TTL
    token = jwt.encode({"uid": user["id"], "exp": expires_at}, JWT_SECRET, algorithm="HS256")
    return {"token": token, "expires_at": expires_at, "email": user["email"], "name": user["name"]}


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
            "INSERT OR IGNORE INTO users(google_sub, email, name, created_at) VALUES(?,?,?,?)",
            (info["sub"], info.get("email"), info.get("name"), time.time()),
        )
        con.commit()
        uid = con.execute(
            "SELECT id FROM users WHERE google_sub=?", (info["sub"],)
        ).fetchone()["id"]
    finally:
        con.close()

    expires_at = int(time.time()) + TOKEN_TTL
    token = jwt.encode({"uid": uid, "exp": expires_at}, JWT_SECRET, algorithm="HS256")
    return {"token": token, "expires_at": expires_at, "email": info.get("email"), "name": info.get("name")}


@app.get("/me")
def me(uid: int = Depends(current_user_id)):
    con = get_db()
    try:
        row = con.execute("SELECT id, email, name FROM users WHERE id=?", (uid,)).fetchone()
    finally:
        con.close()
    if not row:
        raise HTTPException(401, "Tài khoản không tồn tại")
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


class UpdateProfileBody(BaseModel):
    name: str


@app.patch("/me")
def update_profile(body: UpdateProfileBody, uid: int = Depends(current_user_id)):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Tên không được để trống")
    con = get_db()
    try:
        con.execute("UPDATE users SET name=? WHERE id=?", (name, uid))
        con.commit()
        row = con.execute("SELECT id, email, name FROM users WHERE id=?", (uid,)).fetchone()
    finally:
        con.close()
    return {"id": row["id"], "email": row["email"], "name": row["name"]}
