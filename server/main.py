"""Closy server: kiểm tra sống, đăng nhập Google, đăng ký & đăng nhập email, kiểm tra token, xử lý tách nền & màu sắc AI."""
import base64
import hashlib
import io
import json
import os
import secrets
import sqlite3
import time

from dotenv import load_dotenv
import jwt
import numpy as np
import requests
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as grequests
from google.oauth2 import id_token
from PIL import Image
from pydantic import BaseModel
import rembg

try:
    from color_extractor import extract_colors_from_rgba
except ImportError:
    from server.color_extractor import extract_colors_from_rgba

# Tự động nạp cấu hình từ .env
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)
load_dotenv()

JWT_SECRET = os.environ["JWT_SECRET"]
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
DB_PATH = os.environ.get("DB_PATH", "closy.db")
TOKEN_TTL = 7 * 24 * 3600  # 7 ngày
MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB

# Cấu hình AI Vision: Mô hình cục bộ Gemma 4 (Ollama) & Gemini Vision
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma4:e4b")

# Định vị thư mục mô hình AI rembg nội bộ nếu có
_DEFAULT_MODELS_DIR = os.path.join(os.path.dirname(__file__), ".models")
if os.path.exists(_DEFAULT_MODELS_DIR) and not os.environ.get("REMBG_HOME"):
    os.environ["REMBG_HOME"] = _DEFAULT_MODELS_DIR

# Khởi tạo hoặc tái sử dụng session của rembg trong RAM
_rembg_session = None


def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        try:
            _rembg_session = rembg.new_session("u2net")
        except Exception:
            _rembg_session = rembg.new_session()
    return _rembg_session


app = FastAPI(title="Closy API")


@app.on_event("startup")
def startup_event():
    con = get_db()
    con.close()
    try:
        get_rembg_session()
        print("✓ Model AI rembg đã sẵn sàng trong RAM!")
    except Exception as e:
        print(f"Lưu ý khi khởi tạo rembg: {e}")

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


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")


def classify_clothing_heuristic(transparent_image: Image.Image, color_name: str) -> dict:
    """Phân loại thông minh dựa trên phân tích hình học mask alpha của trang phục."""
    try:
        alpha = np.array(transparent_image.split()[-1])
        mask = alpha > 40
        rows = np.any(mask, axis=1)
        cols = np.any(mask, axis=0)
        if not np.any(rows) or not np.any(cols):
            return {
                "category": "Áo",
                "name": f"Áo {color_name}".strip(),
                "formality": 3,
                "contexts": ["Đi học", "Đi làm"],
            }

        ymin, ymax = np.where(rows)[0][[0, -1]]
        xmin, xmax = np.where(cols)[0][[0, -1]]

        h = int(ymax - ymin + 1)
        w = int(xmax - xmin + 1)
        aspect_ratio = h / max(w, 1)

        cropped = mask[ymin : ymax + 1, xmin : xmax + 1]

        # Phân tích theo 3 phân khúc dọc: đỉnh, thân, chân
        h3 = max(1, h // 3)
        top_part = cropped[:h3, :]
        bot_part = cropped[2 * h3 :, :]

        top_w = np.sum(np.any(top_part, axis=0)) if len(top_part) > 0 else 0
        bot_w = np.sum(np.any(bot_part, axis=0)) if len(bot_part) > 0 else 0

        # Kiểm tra khe hở giữa 2 ống quần ở 1/3 dưới
        has_split_legs = False
        if len(bot_part) > 0 and bot_w > 0:
            center_x = cropped.shape[1] // 2
            margin = max(1, cropped.shape[1] // 12)
            bottom_half_of_bot = bot_part[len(bot_part) // 2 :, center_x - margin : center_x + margin]
            if len(bottom_half_of_bot) > 0 and np.mean(bottom_half_of_bot) < 0.2:
                has_split_legs = True

        if aspect_ratio < 0.65:
            # Chiều cao thấp hơn nhiều so với chiều ngang -> Giày
            cat = "Giày"
            formality = 3
            contexts = ["Đi học", "Đi chơi"]
            name = f"Giày {color_name}".strip()
        elif aspect_ratio > 1.25:
            # Trang phục dáng dài: Quần hoặc Váy dài / Đầm
            # Quần thường có ống suông/thon (bot_w <= 1.15 * top_w) hoặc có khe hở 2 ống
            if has_split_legs or bot_w <= 1.15 * max(top_w, 1):
                cat = "Quần"
                formality = 3
                contexts = ["Đi học", "Đi làm", "Đi chơi"]
                name = f"Quần {color_name}".strip()
            else:
                cat = "Váy"
                formality = 3
                contexts = ["Đi chơi", "Hẹn hò"]
                name = f"Đầm {color_name}".strip()
        elif bot_w > 1.3 * max(top_w, 1) and aspect_ratio > 0.75:
            # Đáy xòe rộng dạng chữ A -> Chân váy
            cat = "Váy"
            formality = 3
            contexts = ["Đi chơi", "Hẹn hò"]
            name = f"Chân váy {color_name}".strip()
        else:
            # Dáng chữ T hoặc vuông -> Áo
            cat = "Áo"
            formality = 3
            contexts = ["Đi học", "Đi làm"]
            name = f"Áo {color_name}".strip()

        return {
            "category": cat,
            "name": name,
            "formality": formality,
            "contexts": contexts,
        }
    except Exception as e:
        print(f"Lỗi phân loại heuristic: {e}")
        return {
            "category": "Áo",
            "name": f"Áo {color_name}".strip(),
            "formality": 3,
            "contexts": ["Đi học", "Đi làm"],
        }


# Bảng từ khóa nhận diện màu thông minh từ tên gọi ngữ nghĩa của AI Vision
COLOR_KEYWORD_RULES = [
    # id, name, hex, h, s, l, keywords
    ("olive", "Ô liu", "#636F4E", 82, 17, 37, ["ô liu", "o liu", "olive", "xanh rêu", "rêu"]),
    ("dusty-pink", "Hồng phấn", "#D29B9B", 0, 38, 72, ["hồng", "hong", "pink", "pastel"]),
    ("cream", "Kem", "#F5F2EB", 42, 35, 94, ["kem", "be", "beige", "cream", "sữa", "trắng ngà"]),
    ("navy", "Xanh đậm", "#243A63", 219, 47, 26, ["xanh đậm", "xanh đâm", "navy", "xanh đen", "denim", "jeans xanh", "xanh thẫm"]),
    ("blue", "Xanh dương", "#2196F3", 207, 90, 54, ["xanh dương", "xanh biển", "xanh da trời", "blue", "cyan"]),
    ("black", "Đen", "#1E293B", 222, 47, 11, ["đen", "den", "black"]),
    ("white", "Trắng", "#FFFFFF", 0, 0, 100, ["trắng", "trang", "white"]),
    ("gray", "Xám", "#808080", 0, 0, 50, ["xám", "xam", "ghi", "gray", "grey"]),
    ("brown", "Nâu", "#795548", 16, 25, 38, ["nâu", "nau", "brown", "caramel", "bò"]),
    ("red", "Đỏ", "#E53935", 1, 79, 56, ["đỏ", "do", "red", "mận", "bordeaux"]),
    ("yellow", "Vàng", "#FDD835", 48, 98, 59, ["vàng", "vang", "yellow", "mustard"]),
]


def resolve_clothing_color_preset(
    ai_color_name: str | None,
    item_name: str | None,
    fallback_preset: dict,
) -> dict:
    """Ưu tiên suy luận màu sắc chuẩn xác từ nhận thức ngữ nghĩa của AI Vision.
    Ví dụ: 'Áo sơ mi xanh ô liu' -> màu Ô liu (thay vì bị pixel tóc đen chiếm ưu thế).
    'Váy đầm hồng pastel' -> màu Hồng phấn (thay vì bị pixel tóc nâu chiếm ưu thế).
    """
    text_to_search = f"{ai_color_name or ''} {item_name or ''}".lower()

    for pid, name, hex_code, h, s, l, keywords in COLOR_KEYWORD_RULES:
        for kw in keywords:
            if kw in text_to_search:
                return {
                    "id": pid,
                    "name": name,
                    "hex": hex_code,
                    "h": h,
                    "s": s,
                    "l": l,
                }

    return {
        "id": fallback_preset.get("id", "white"),
        "name": fallback_preset.get("name", "Trắng"),
        "hex": fallback_preset.get("hex", "#FFFFFF"),
        "h": fallback_preset.get("h", 0),
        "s": fallback_preset.get("s", 0),
        "l": fallback_preset.get("l", 100),
    }


def classify_clothing_with_ollama(raw_bytes: bytes, color_name: str) -> dict | None:
    """Phân loại và thẩm định trang phục bằng mô hình đa phương thức cục bộ Gemma 4 (Ollama).
    - Chạy offline hoàn toàn, không cần Gemini API key.
    - Nhìn nhận chi tiết: Áo, Quần, Váy, Giày từ đặc điểm hình ảnh (cổ áo, khóa kéo, ống quần, đế giày...).
    - Phát hiện nếu ảnh không phải quần áo để mặc (mặt người, đồ ăn, thú cưng, logo, vật dụng khác).
    """
    try:
        b64_img = base64.b64encode(raw_bytes).decode("utf-8")
        prompt = (
            "Bạn là chuyên gia thẩm định và phân loại thời trang cho ứng dụng tủ đồ Closy.\n"
            "Hãy nhìn vào bức ảnh này và phân tích thật kỹ:\n\n"
            "1. KIỂM TRA CHỦ THỂ:\n"
            "- Bức ảnh có chứa trang phục, quần áo, váy đầm hoặc giày dép để mặc hay không?\n"
            "- NẾU ảnh là mặt người, đồ ăn, đồ gia dụng, logo/biểu tượng, đồ chơi, thú cưng, xe cộ, tài liệu hoặc đồ vật không phải quần áo để mặc:\n"
            '  Trả về JSON: {"is_clothing": false, "rejection_reason": "Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!"}\n\n'
            "2. NẾU ĐÚNG LÀ TRANG PHỤC ĐỂ MẶC:\n"
            "  Trả về JSON:\n"
            "  {\n"
            '    "is_clothing": true,\n'
            '    "category": "Áo" hoặc "Quần" hoặc "Váy" hoặc "Giày",\n'
            '    "name": "Tên chi tiết món đồ tiếng Việt (VD: Áo sơ mi xanh ô liu, Váy đầm hồng pastel, Quần jeans xanh đậm...)",\n'
            '    "color_name": "Màu sắc chủ đạo của RIÊNG MÓN ĐỒ trang phục (loại trừ màu tóc, da mặt, nền). Chọn 1 trong 11 màu chuẩn: \'Trắng\', \'Kem\', \'Hồng phấn\', \'Xanh đậm\', \'Ô liu\', \'Đen\', \'Xám\', \'Nâu\', \'Xanh dương\', \'Đỏ\', \'Vàng\'",\n'
            '    "formality": 1 (thoải mái) hoặc 3 (lịch sự vừa) hoặc 5 (trang trọng),\n'
            '    "contexts": ["Đi học", "Đi làm", "Đi chơi", "Hẹn hò"] (chọn 1 đến 3 dịp phù hợp nhất)\n'
            "  }\n"
            "Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown):"
        )

        hosts_to_try = []
        if OLLAMA_HOST:
            hosts_to_try.append(OLLAMA_HOST.rstrip("/"))
        for fallback in ["http://host.docker.internal:11434", "http://127.0.0.1:11434", "http://localhost:11434"]:
            if fallback not in hosts_to_try:
                hosts_to_try.append(fallback)

        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "images": [b64_img],
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.1},
        }

        for host in hosts_to_try:
            url = f"{host}/api/generate"
            try:
                resp = requests.post(url, json=payload, timeout=25)
                if resp.status_code == 200:
                    data = resp.json()
                    response_text = data.get("response", "").strip()
                    parsed = json.loads(response_text)

                    # Kiểm tra xem có phải trang phục hay không
                    if parsed.get("is_clothing") is False:
                        return {
                            "is_clothing": False,
                            "rejection_reason": parsed.get("rejection_reason")
                            or "Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!",
                        }

                    cat = parsed.get("category")
                    if cat in ["Áo", "Quần", "Váy", "Giày"]:
                        return {
                            "is_clothing": True,
                            "category": cat,
                            "name": parsed.get("name") or f"{cat} {color_name}",
                            "color_name": parsed.get("color_name") or "",
                            "formality": int(parsed.get("formality", 3)),
                            "contexts": [
                                c
                                for c in parsed.get("contexts", [])
                                if c in ["Đi học", "Đi làm", "Đi chơi", "Hẹn hò"]
                            ] or ["Đi học", "Đi làm"],
                        }
            except Exception:
                continue
    except Exception as e:
        print(f"[Ollama] Lỗi nhận diện trang phục: {e}")
    return None


def classify_clothing_with_gemini(raw_bytes: bytes, color_name: str) -> dict | None:
    """Nhận diện loại trang phục, tên gọi chi tiết, độ lịch sự và dịp mặc bằng Gemini Vision API."""
    if not GEMINI_API_KEY:
        return None
    try:
        b64_img = base64.b64encode(raw_bytes).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                "Bạn là chuyên gia thời trang stylist thông minh cho ứng dụng tủ đồ Closy. "
                                "Hãy nhìn vào bức ảnh này và phân tích thật chính xác:\n"
                                "1. KIỂM TRA: Bức ảnh có chứa trang phục để mặc (Áo, Quần, Váy, Giày) không? "
                                "Nếu không phải, trả về: {\"is_clothing\": false, \"rejection_reason\": \"Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!\"}.\n"
                                "2. Nếu đúng là đồ mặc, trả về JSON:\n"
                                "{\n"
                                '  "is_clothing": true,\n'
                                '  "category": "Áo" hoặc "Quần" hoặc "Váy" hoặc "Giày",\n'
                                '  "name": "Tên chi tiết món đồ tiếng Việt (VD: Áo sơ mi lụa trắng, Quần jeans xanh đậm...)",\n'
                                '  "formality": 1 hoặc 3 hoặc 5,\n'
                                '  "contexts": ["Đi học", "Đi làm", "Đi chơi", "Hẹn hò"]\n'
                                "}"
                            )
                        },
                        {
                            "inline_data": {
                                "mime_type": "image/png",
                                "data": b64_img,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        }
        resp = requests.post(url, json=payload, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            parsed = json.loads(text)
            if parsed.get("is_clothing") is False:
                return {
                    "is_clothing": False,
                    "rejection_reason": parsed.get("rejection_reason")
                    or "Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!",
                }
            if parsed.get("category") in ["Áo", "Quần", "Váy", "Giày"]:
                return {
                    "is_clothing": True,
                    "category": parsed["category"],
                    "name": parsed.get("name") or f"{parsed['category']} {color_name}",
                    "formality": int(parsed.get("formality", 3)),
                    "contexts": [
                        c
                        for c in parsed.get("contexts", [])
                        if c in ["Đi học", "Đi làm", "Đi chơi", "Hẹn hò"]
                    ] or ["Đi học", "Đi làm"],
                }
    except Exception as e:
        print(f"Lưu ý gọi Gemini Vision: {e}")
    return None


@app.post("/image/process")
async def process_image(
    request: Request,
    uid: int = Depends(current_user_id),
):
    """Xử lý ảnh trang phục:
    1. Hỗ trợ cả 2 chuẩn: JSON Base64 (tối ưu cho Expo / Mobile) và Multipart FormData.
    2. Xác thực JWT (yêu cầu người dùng đăng nhập).
    3. Giới hạn kích thước file tối đa 20MB.
    4. Tách nền AI (rembg U2Net) cho ra ảnh PNG trong suốt.
    5. Trích xuất màu sắc chủ đạo HSL và HEX.
    6. Cam kết bảo mật: Toàn bộ xử lý diễn ra trong RAM (io.BytesIO), KHÔNG lưu trữ file trên ổ đĩa.
    """
    start_time = time.time()
    content_type = request.headers.get("content-type", "")

    # Đọc ảnh từ JSON base64 hoặc Multipart FormData
    if "application/json" in content_type:
        body = await request.json()
        b64_data = body.get("image_base64") or body.get("image") or ""
        if not b64_data:
            raise HTTPException(400, "Thiếu dữ liệu ảnh image_base64 trong payload JSON")
        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]
        try:
            contents = base64.b64decode(b64_data)
        except Exception:
            raise HTTPException(400, "Dữ liệu base64 không hợp lệ")
    else:
        form = await request.form()
        file = form.get("file")
        if not file or not hasattr(file, "read"):
            raise HTTPException(400, "Thiếu tệp ảnh 'file' trong FormData")
        contents = await file.read()

    # Kiểm tra kích thước và tính hợp lệ của dữ liệu ảnh
    if len(contents) == 0:
        raise HTTPException(400, "Dữ liệu ảnh rỗng, vui lòng chọn lại ảnh")
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(400, "Kích thước tệp vượt quá giới hạn 20MB")

    # 3. Phân tích ảnh với Pillow
    try:
        input_image = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(400, "Dữ liệu ảnh bị lỗi hoặc không thể giải mã")

    # Tối ưu kích thước trước khi đưa vào mô hình AI để đảm bảo thời gian xử lý < 4s
    max_dim = 1000
    if max(input_image.size) > max_dim:
        input_image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    # Đưa vào buffer bộ nhớ
    raw_buffer = io.BytesIO()
    # Chuyển RGBA hoặc RGB để lưu PNG
    input_image.save(raw_buffer, format="PNG")
    raw_bytes = raw_buffer.getvalue()

    # 4. Tách bỏ phông nền bằng rembg
    try:
        session = get_rembg_session()
        transparent_bytes = rembg.remove(raw_bytes, session=session)
        transparent_image = Image.open(io.BytesIO(transparent_bytes))
    except Exception as e:
        raise HTTPException(500, f"Lỗi trong quá trình tách nền AI: {str(e)}")

    # 5. Trích xuất mã màu chủ đạo theo HSL & HEX
    color_res = extract_colors_from_rgba(transparent_image)
    primary = color_res["primary"]
    palette = color_res["palette"]

    # 6. Nhận diện danh mục, tên gợi ý, độ lịch sự và dịp mặc bằng AI
    # Ưu tiên 1: Mô hình đa phương thức cục bộ Gemma 4 e4b (Ollama)
    classification = classify_clothing_with_ollama(raw_bytes, primary["name"])

    # Ưu tiên 2: Gemini Vision API (nếu có cấu hình GEMINI_API_KEY)
    if not classification:
        classification = classify_clothing_with_gemini(raw_bytes, primary["name"])

    # Kiểm tra xem ảnh có phải trang phục để mặc hay không
    if classification and classification.get("is_clothing") is False:
        rejection_msg = (
            classification.get("rejection_reason")
            or "Hình ảnh không phải là trang phục để mặc. Vui lòng chọn hoặc chụp ảnh Áo, Quần, Váy hoặc Giày!"
        )
        return {
            "success": False,
            "is_clothing": False,
            "message": rejection_msg,
            "rejection_reason": rejection_msg,
        }

    # Ưu tiên 3: Heuristic hình học (offline fallback)
    if not classification:
        classification = classify_clothing_heuristic(transparent_image, primary["name"])

    # ĐỒNG BỘ MÀU SẮC NGỮ NGHĨA TỪ TÊN GỌI AI THAY VÌ ĐO PIXEL MÙ QUÁNG:
    # Nếu AI nhìn thấy là "Áo sơ mi xanh ô liu" hay "Váy đầm hồng pastel", màu trang phục CHẮC CHẮN là Ô liu hoặc Hồng phấn!
    ai_matched_color = resolve_clothing_color_preset(
        classification.get("color_name"),
        classification.get("name"),
        primary["closest_preset"],
    )

    # 7. Mã hóa PNG trong suốt sang Base64 Data URL để client render tức thì
    b64_str = base64.b64encode(transparent_bytes).decode("utf-8")
    data_url = f"data:image/png;base64,{b64_str}"

    elapsed_sec = round(time.time() - start_time, 2)

    return {
        "success": True,
        "is_clothing": True,
        "image_base64": data_url,
        "format": "png",
        "width": transparent_image.width,
        "height": transparent_image.height,
        "color": {
            "hex": ai_matched_color["hex"],
            "h": ai_matched_color["h"],
            "s": ai_matched_color["s"],
            "l": ai_matched_color["l"],
            "name": ai_matched_color["name"],
            "closest_palette_id": ai_matched_color["id"],
        },
        "palette": palette,
        "category": classification["category"],
        "name": classification["name"],
        "formality": classification["formality"],
        "contexts": classification["contexts"],
        "process_time_sec": elapsed_sec,
    }

