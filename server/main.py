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

# Cấu hình AI Vision: Mô hình cục bộ Gemma 4 (Ollama) Local-First (Không cần Gemini API Key)
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
            margin = max(1, cropped.shape[1] // 10)
            bottom_half_of_bot = bot_part[len(bot_part) // 2 :, max(0, center_x - margin) : min(cropped.shape[1], center_x + margin)]
            if len(bottom_half_of_bot) > 0 and np.mean(bottom_half_of_bot) < 0.35:
                has_split_legs = True

        low_color = color_name.lower()

        if aspect_ratio < 0.65:
            # Chiều cao thấp hơn nhiều so với chiều ngang -> Giày
            cat = "Giày"
            formality = 3
            contexts = ["Đi học", "Đi chơi"]
            name = f"Giày {color_name}".strip()
        elif has_split_legs and aspect_ratio >= 0.95:
            # Có khe hở 2 ống quần rõ ràng -> Quần
            cat = "Quần"
            formality = 3
            contexts = ["Đi học", "Đi làm", "Đi chơi"]
            if "xanh" in low_color or "navy" in low_color or "đen" in low_color:
                name = f"Quần jeans {color_name}".strip()
            else:
                name = f"Quần {color_name}".strip()
        elif aspect_ratio > 1.35:
            # Trang phục dáng dài: Quần dài hoặc Đầm liền thân
            if bot_w <= 1.2 * max(top_w, 1):
                cat = "Quần"
                formality = 3
                contexts = ["Đi học", "Đi làm", "Đi chơi"]
                if "xanh" in low_color or "navy" in low_color or "đen" in low_color:
                    name = f"Quần jeans {color_name}".strip()
                else:
                    name = f"Quần {color_name}".strip()
            else:
                cat = "Đầm"
                formality = 3
                contexts = ["Đi chơi", "Hẹn hò"]
                name = f"Đầm {color_name}".strip()
        elif bot_w > 1.25 * max(top_w, 1) and aspect_ratio > 0.75:
            # Đáy xòe rộng dạng chữ A -> Chân váy
            cat = "Váy"
            formality = 3
            contexts = ["Đi chơi", "Hẹn hò"]
            name = f"Chân váy {color_name}".strip()
        else:
            # Dáng chữ T hoặc gần vuông (áo thun, sơ mi, áo khoác) -> Áo
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
    ("dusty-pink", "Hồng phấn", "#D29B9B", 0, 38, 72, ["hồng", "hong", "pink", "pastel", "phấn"]),
    ("cream", "Kem", "#F5F2EB", 42, 35, 94, ["kem", "be", "beige", "cream", "sữa", "trắng ngà", "ivory"]),
    ("navy", "Xanh đậm", "#243A63", 219, 47, 26, ["xanh đậm", "xanh đâm", "navy", "xanh đen", "denim", "jeans xanh", "xanh thẫm", "xanh indigo"]),
    ("blue", "Xanh dương", "#2196F3", 207, 90, 54, ["xanh dương", "xanh biển", "xanh da trời", "blue", "cyan", "xanh nhạt", "xanh sáng"]),
    ("black", "Đen", "#1E293B", 222, 47, 11, ["đen", "den", "black"]),
    ("white", "Trắng", "#FFFFFF", 0, 0, 100, ["trắng", "trang", "white"]),
    ("gray", "Xám", "#808080", 0, 0, 50, ["xám", "xam", "ghi", "gray", "grey", "bạc"]),
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
    'Quần jeans xanh đậm' -> màu Xanh đậm.
    """
    # 1. Tìm kiếm trong ai_color_name trước (nếu AI chỉ định trực tiếp màu trang phục)
    if ai_color_name:
        low_color = ai_color_name.lower().strip()
        for pid, name, hex_code, h, s, l, keywords in COLOR_KEYWORD_RULES:
            for kw in keywords:
                if kw in low_color:
                    return {"id": pid, "name": name, "hex": hex_code, "h": h, "s": s, "l": l}

    # 2. Tìm kiếm trong tên món đồ item_name do AI đặt (VD: "Áo sơ mi xanh ô liu", "Quần jeans xanh")
    if item_name:
        low_name = item_name.lower().strip()
        for pid, name, hex_code, h, s, l, keywords in COLOR_KEYWORD_RULES:
            for kw in keywords:
                if kw in low_name:
                    return {"id": pid, "name": name, "hex": hex_code, "h": h, "s": s, "l": l}

    # 3. Fallback theo preset màu nhận diện K-Means
    return {
        "id": fallback_preset.get("id", "white"),
        "name": fallback_preset.get("name", "Trắng"),
        "hex": fallback_preset.get("hex", "#FFFFFF"),
        "h": fallback_preset.get("h", 0),
        "s": fallback_preset.get("s", 0),
        "l": fallback_preset.get("l", 100),
    }


def classify_clothing_with_ollama(
    raw_bytes: bytes,
    color_name: str,
    transparent_image: Image.Image | None = None,
) -> dict | None:
    """Phân loại và thẩm định trang phục bằng mô hình đa phương thức cục bộ Gemma 4 (Ollama).
    - Chạy offline hoàn toàn Local-First, không cần Gemini API key.
    - Nhìn nhận chi tiết: Áo, Quần, Váy, Đầm, Giày từ đặc điểm hình ảnh.
    - Phát hiện nếu ảnh không phải quần áo để mặc (mặt người, đồ ăn, thú cưng, logo, vật dụng khác).
    """
    try:
        # Tối ưu hóa ảnh gửi vào AI: nếu đã có ảnh tách nền, dán lên nền trắng sạch để AI nhìn rõ nét
        if transparent_image:
            white_canvas = Image.new("RGB", transparent_image.size, (255, 255, 255))
            if transparent_image.mode == "RGBA":
                white_canvas.paste(transparent_image, mask=transparent_image.split()[3])
            else:
                white_canvas.paste(transparent_image)
            buf = io.BytesIO()
            white_canvas.thumbnail((640, 640), Image.Resampling.LANCZOS)
            white_canvas.save(buf, format="JPEG", quality=85)
            b64_img = base64.b64encode(buf.getvalue()).decode("utf-8")
        else:
            buf = io.BytesIO(raw_bytes)
            img = Image.open(buf)
            img.thumbnail((640, 640), Image.Resampling.LANCZOS)
            out_buf = io.BytesIO()
            img.convert("RGB").save(out_buf, format="JPEG", quality=85)
            b64_img = base64.b64encode(out_buf.getvalue()).decode("utf-8")

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
            '    "category": "Áo" hoặc "Quần" hoặc "Váy" hoặc "Đầm" hoặc "Giày",\n'
            '    "name": "Tên chi tiết món đồ tiếng Việt (VD: Áo sơ mi xanh ô liu, Đầm hồng pastel, Chân váy chữ A, Quần jeans xanh đậm...)",\n'
            '    "color_name": "Màu sắc chủ đạo của RIÊNG MÓN ĐỒ trang phục (loại trừ màu tóc, da mặt, nền). Chọn 1 trong 11 màu chuẩn: \'Trắng\', \'Kem\', \'Hồng phấn\', \'Xanh đậm\', \'Ô liu\', \'Đen\', \'Xám\', \'Nâu\', \'Xanh dương\', \'Đỏ\', \'Vàng\'",\n'
            '    "formality": 1 (thoải mái) hoặc 3 (lịch sự vừa) hoặc 5 (trang trọng),\n'
            '    "contexts": ["Đi học", "Đi làm", "Đi chơi", "Hẹn hò"] (chọn 1 đến 3 dịp phù hợp nhất)\n'
            "  }\n"
            "Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown):"
        )

        hosts_to_try = []
        if OLLAMA_HOST:
            hosts_to_try.append(OLLAMA_HOST.rstrip("/"))
        for fallback in ["http://host.docker.internal:11434", "http://127.0.0.1:11434", "http://localhost:11434"]:
            if fallback not in hosts_to_try:
                hosts_to_try.append(fallback)

        models_to_try = [OLLAMA_MODEL]
        if "gemma4" not in OLLAMA_MODEL:
            models_to_try.append("gemma4:e4b")
        if "gemma4:e4b" in models_to_try and "gemma4" not in models_to_try:
            models_to_try.append("gemma4")

        for host in hosts_to_try:
            for model_name in models_to_try:
                url = f"{host}/api/generate"
                payload = {
                    "model": model_name,
                    "prompt": prompt,
                    "images": [b64_img],
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.1},
                }
                try:
                    resp = requests.post(url, json=payload, timeout=30)
                    if resp.status_code == 200:
                        data = resp.json()
                        response_text = data.get("response", "").strip()

                        # Xử lý chuỗi JSON nếu có bao quanh bởi markdown codeblock
                        if "```" in response_text:
                            blocks = response_text.split("```")
                            for b in blocks:
                                b = b.strip()
                                if b.startswith("json"):
                                    b = b[4:].strip()
                                if b.startswith("{") and b.endswith("}"):
                                    response_text = b
                                    break
                        if "{" in response_text and "}" in response_text:
                            s_idx = response_text.find("{")
                            e_idx = response_text.rfind("}") + 1
                            response_text = response_text[s_idx:e_idx]

                        parsed = json.loads(response_text)

                        # Kiểm tra xem có phải trang phục hay không
                        if parsed.get("is_clothing") is False:
                            return {
                                "is_clothing": False,
                                "rejection_reason": parsed.get("rejection_reason")
                                or "Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!",
                            }

                        raw_cat = str(parsed.get("category", "")).strip()
                        # Chuẩn hóa danh mục
                        cat = "Áo"
                        if "quần" in raw_cat.lower() or "jean" in raw_cat.lower():
                            cat = "Quần"
                        elif "đầm" in raw_cat.lower():
                            cat = "Đầm"
                        elif "váy" in raw_cat.lower() or "skirt" in raw_cat.lower():
                            cat = "Váy"
                        elif "giày" in raw_cat.lower() or "dép" in raw_cat.lower() or "shoe" in raw_cat.lower():
                            cat = "Giày"
                        elif "áo" in raw_cat.lower():
                            cat = "Áo"
                        elif raw_cat in ["Áo", "Quần", "Váy", "Đầm", "Giày"]:
                            cat = raw_cat

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
    # Ưu tiên 1: Mô hình đa phương thức cục bộ Gemma 4 e4b (Ollama Local-First)
    classification = classify_clothing_with_ollama(raw_bytes, primary["name"], transparent_image)

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


# ==============================================================================
# OUTFIT RECOMMENDATION ENGINE (Hệ thống gợi ý phối đồ thời trang thông minh)
# ==============================================================================


class WeatherPayload(BaseModel):
    temperature: float = 26.0
    weather_code: int = 2
    is_raining: bool = False
    location_name: str = "Hà Nội"
    condition_description: str = "trời dịu mát"
    recommendation_advice: str | None = None


class WardrobeItemPayload(BaseModel):
    id: int | str
    name: str
    category: str  # Áo, Quần, Váy, Đầm, Giày
    image_path: str | None = None
    color_h: float = 0.0
    color_s: float = 0.0
    color_l: float = 100.0
    color_hex: str | None = None
    color_name: str | None = None
    formality: int = 3
    contexts: list[str] | str = []


class OutfitSuggestRequest(BaseModel):
    items: list[WardrobeItemPayload]
    context: str = "Đi học"
    weather: WeatherPayload | None = None


def is_neutral_hsl(s: float, l: float) -> bool:
    """Định nghĩa vùng màu trung tính (Neutral): Saturation < 15 hoặc Lightness < 15 hoặc Lightness > 88"""
    return s < 15 or l < 15 or l > 88


def get_hue_circle_distance(h1: float, h2: float) -> float:
    """Tính khoảng cách góc màu trên vòng tròn sắc độ H (0 - 360°): d = min(|H1 - H2|, 360 - |H1 - H2|)"""
    diff = abs(h1 - h2) % 360
    return min(diff, 360 - diff)


def score_color_harmony_hsl(c1: dict, c2: dict) -> tuple[int, str, str, str]:
    """Quy tắc chấm điểm thời trang Closy (Color Harmony HSL):
    - Cặp có ít nhất 1 màu trung tính: +3 điểm (an toàn, dễ phối).
    - Cặp màu tương đồng (Monochrome / Analogous: d < 35°): +3 điểm.
    - Cặp màu tương phản bổ sung (Complementary: 150° <= d <= 210°): +2 điểm.
    - Cặp màu xung đột chói gắt: -2 điểm.
    """
    s1 = c1.get("s", 0)
    l1 = c1.get("l", 50)
    s2 = c2.get("s", 0)
    l2 = c2.get("l", 50)

    n1 = is_neutral_hsl(s1, l1)
    n2 = is_neutral_hsl(s2, l2)
    d = get_hue_circle_distance(c1.get("h", 0), c2.get("h", 0))

    if n1 or n2:
        return 3, "neutral", "Trung tính an toàn", "+3 Trung tính"
    if d < 35:
        return 3, "analogous", "Tương đồng sắc thái (Tone sur tone)", "+3 Tone sur tone"
    if 150 <= d <= 210:
        return 2, "complementary", "Tương phản bổ sung", "+2 Tương phản"
    return -2, "clash", "Xung đột chói gắt", "-2 Khó phối"


def calculate_item_weather_score(name: str, category: str, color_name: str, weather: WeatherPayload) -> int:
    """Chấm điểm thời tiết theo DoD Sprint-3"""
    score = 0
    name_lower = (name or "").lower()
    color_lower = (color_name or "").lower()
    temp = weather.temperature
    is_raining = weather.is_raining

    is_cold_or_rain = temp < 22 or is_raining
    is_hot = temp > 32

    if is_cold_or_rain:
        if any(k in name_lower for k in ["khoác", "hoodie", "dài tay", "len", "cardigan", "vest", "nỉ"]):
            score += 35
        if category == "Quần" or any(k in name_lower for k in ["jeans", "dài", "kaki"]):
            score += 25
        if any(k in name_lower for k in ["cộc", "ngắn tay"]) or (category in ["Váy", "Đầm"] and is_raining):
            score -= 20
    elif is_hot:
        if any(k in name_lower for k in ["thun", "cộc tay", "ngắn tay", "lụa", "croptop", "phông"]):
            score += 30
        if any(k in name_lower for k in ["short", "ngắn"]) or category in ["Váy", "Đầm"]:
            score += 20
        if any(k in color_lower for k in ["trắng", "kem", "be", "hồng", "vàng"]):
            score += 15
        if any(k in name_lower for k in ["khoác", "hoodie", "len", "nỉ"]):
            score -= 40
    else:
        score += 10
    return score


def calculate_item_context_score(item: WardrobeItemPayload, context: str) -> tuple[int, str]:
    """Chấm điểm độ phù hợp của món đồ theo từng dịp cụ thể (Đi học, Đi làm, Đi chơi, Hẹn hò):
    Đảm bảo mỗi dịp có sự phân hóa rõ rệt, không bị trùng lặp cùng 1 bộ cho mọi dịp.
    """
    score = 0
    name_lower = (item.name or "").lower()
    cat = (item.category or "").strip()
    color_lower = (item.color_name or "").lower()
    formality = item.formality or 3
    ctx_str = (context or "").lower()
    reason = ""

    # 1. Kiểm tra nhãn bối cảnh người dùng/AI đã gán
    raw_ctxs = item.contexts if isinstance(item.contexts, list) else (item.contexts or "").split(",")
    clean_ctxs = [str(c).strip().lower() for c in raw_ctxs if str(c).strip()]
    has_explicit_context = any(ctx_str in c for c in clean_ctxs)

    if has_explicit_context:
        score += 45
    elif clean_ctxs and not any("mọi dịp" in c for c in clean_ctxs):
        score -= 25

    # 2. Quy tắc chuyên biệt theo từng dịp
    if "đi làm" in ctx_str or "công sở" in ctx_str:
        if formality == 3:
            score += 25
        elif formality == 5:
            score += 30
        elif formality == 1:
            score -= 35

        if any(k in name_lower for k in ["sơ mi", "polo", "tây", "kaki", "âu", "vest", "blazer", "công sở", "bút chì"]):
            score += 35
            reason = "Lịch sự, chuyên nghiệp nơi công sở"
        if any(k in name_lower for k in ["croptop", "ba lỗ", "short", "rách", "ngắn"]):
            score -= 45

    elif "hẹn hò" in ctx_str or "tiệc" in ctx_str:
        if cat == "Đầm":
            score += 45
            reason = "Đầm liền duyên dáng, nữ tính cho buổi hẹn"
        elif cat == "Váy":
            score += 30
            reason = "Chân váy nữ tính, cuốn hút"

        if formality in [3, 5]:
            score += 20
        elif formality == 1:
            score -= 25

        if any(k in color_lower for k in ["hồng", "kem", "đỏ", "trắng", "đen", "pastel"]):
            score += 20

        if any(k in name_lower for k in ["đầm", "lụa", "ren", "hoa", "xòe", "sơ mi", "chân váy"]):
            score += 25
        if any(k in name_lower for k in ["short thể thao", "ba lỗ"]):
            score -= 40

    elif "đi học" in ctx_str:
        if formality in [1, 3]:
            score += 25
        elif formality == 5:
            score -= 35

        if any(k in name_lower for k in ["thun", "phông", "sơ mi", "jeans", "kaki", "sneaker", "hoodie", "cardigan"]):
            score += 30
            reason = "Gọn gàng, trẻ trung khi lên giảng đường"
        if any(k in name_lower for k in ["dạ hội", "xẻ tà"]):
            score -= 45

    elif "đi chơi" in ctx_str or "dạo phố" in ctx_str:
        if formality in [1, 3]:
            score += 30
        elif formality == 5:
            score -= 30

        if any(k in name_lower for k in ["thun", "phông", "croptop", "short", "jeans", "khoác", "chân váy", "sneaker"]):
            score += 35
            reason = "Thoải mái, phóng khoáng cho ngày dạo phố"
        if any(k in name_lower for k in ["vest", "âu", "công sở"]):
            score -= 25

    return score, reason


def is_dress_item(item: WardrobeItemPayload) -> bool:
    cat = (item.category or "").strip()
    name_lower = (item.name or "").lower()
    return cat == "Đầm" or (cat == "Váy" and any(k in name_lower for k in ["đầm", "dress", "liền"]))


def is_top_item(item: WardrobeItemPayload) -> bool:
    cat = (item.category or "").strip()
    name_lower = (item.name or "").lower()
    return cat == "Áo" and not any(k in name_lower for k in ["khoác", "jacket", "cardigan", "blazer", "vest"])


def is_jacket_item(item: WardrobeItemPayload) -> bool:
    cat = (item.category or "").strip()
    name_lower = (item.name or "").lower()
    return cat == "Áo" and any(k in name_lower for k in ["khoác", "jacket", "cardigan", "blazer", "vest"])


def is_bottom_item(item: WardrobeItemPayload) -> bool:
    cat = (item.category or "").strip()
    return cat == "Quần" or (cat == "Váy" and not is_dress_item(item))


def is_shoe_item(item: WardrobeItemPayload) -> bool:
    return (item.category or "").strip() == "Giày"


@app.post("/outfit/suggest")
def suggest_outfits(body: OutfitSuggestRequest):
    """Bộ máy gợi ý trang phục thông minh tại Backend (Backend Stylist Engine):
    - Đảm bảo quy tắc thời trang chặt chẽ:
      + ĐẦM (Dress): Trang phục liền thân độc lập, TUYỆT ĐỐI KHÔNG mặc chung Quần hay Áo (chỉ phối Giày hoặc Áo khoác ngoài khi trời lạnh).
      + VÁY (Skirt): Chân váy (ngắn/dài), bắt buộc phối cùng Áo + Giày.
      + QUẦN: Bắt buộc phối cùng Áo + Giày.
    - Đo độ hòa hợp màu sắc ColorHarmonyEngine HSL (+3 trung tính, +3 tone-sur-tone, +2 tương phản, -2 xung đột).
    - Đo điểm thời tiết (<22°C/mưa ưu tiên đồ ấm, >32°C ưu tiên đồ thoáng mát & màu sáng).
    - Xếp hạng điểm số từ kho đồ người dùng thực tế.
    """
    raw_items = body.items
    context = body.context or "Đi học"
    weather = body.weather or WeatherPayload()

    if not raw_items:
        return {
            "success": True,
            "outfits": [],
            "message": "Tủ đồ của bạn chưa có trang phục nào. Hãy thêm đồ vào tủ để Closy phối đồ cho bạn nhé!",
        }

    # Phân loại trang phục theo vai trò
    dresses = [i for i in raw_items if is_dress_item(i)]
    tops = [i for i in raw_items if is_top_item(i)]
    jackets = [i for i in raw_items if is_jacket_item(i)]
    bottoms = [i for i in raw_items if is_bottom_item(i)]
    shoes = [i for i in raw_items if is_shoe_item(i)]

    # Nếu không có áo thường nhưng có áo khoác, áo khoác có thể dùng làm top nếu thời tiết dịu/lạnh
    if not tops and jackets:
        tops = jackets

    candidates = []

    # 1. TẠO CÁC BỘ PHỐI TỪ ĐẦM (One-Piece Dress)
    # Quy tắc: Đầm KHÔNG mặc cùng Quần và Áo!
    for d in dresses:
        d_color = {"h": d.color_h, "s": d.color_s, "l": d.color_l}
        score = 50
        weather_score = calculate_item_weather_score(d.name, "Đầm", d.color_name or "", weather)
        ctx_score, ctx_reason = calculate_item_context_score(d, context)

        score += weather_score + ctx_score

        # Phối giày (nếu có)
        outfit_items = [d]
        harmony_score = 3
        harmony_type = "neutral"
        harmony_title = "Đầm liền duyên dáng"
        harmony_badge = "+3 Đầm liền"

        best_shoe = None
        if shoes:
            best_shoe = shoes[0]
            for s in shoes:
                s_color = {"h": s.color_h, "s": s.color_s, "l": s.color_l}
                hs, ht, _, _ = score_color_harmony_hsl(d_color, s_color)
                if hs >= 2:
                    best_shoe = s
                    break
            outfit_items.append(best_shoe)

        # Nếu trời lạnh (<22°C hoặc có mưa) và có áo khoác ngoài -> Phối thêm áo khoác
        if (weather.temperature < 22 or weather.is_raining) and jackets:
            best_jacket = jackets[0]
            for j in jackets:
                j_color = {"h": j.color_h, "s": j.color_s, "l": j.color_l}
                hs, ht, _, _ = score_color_harmony_hsl(d_color, j_color)
                if hs >= 2:
                    best_jacket = j
                    harmony_score = hs
                    harmony_type = ht
                    break
            outfit_items.insert(0, best_jacket)
            score += 25

        score += harmony_score * 10

        # Tiêu đề phù hợp theo từng dịp
        if "hẹn hò" in context.lower():
            title = f"Duyên dáng hẹn hò · {d.name}"
            sub = f"Đầm liền {d.color_name or ''} nữ tính, cuốn hút"
        elif "đi làm" in context.lower():
            title = f"Thanh lịch công sở · {d.name}"
            sub = f"Đầm liền {d.color_name or ''} chỉn chu, trang nhã"
        elif "đi chơi" in context.lower():
            title = f"Thoải mái dạo phố · {d.name}"
            sub = f"Đầm liền {d.color_name or ''} nhẹ nhàng, bay bổng"
        else:
            title = f"Trẻ trung đến trường · {d.name}"
            sub = f"Đầm liền {d.color_name or ''} gọn gàng, thanh lịch"

        candidates.append({
            "type": "one_piece",
            "score": score,
            "harmony_score": harmony_score,
            "harmony_type": harmony_type,
            "harmony_title": harmony_title,
            "harmony_badge": harmony_badge,
            "occasion_reason": ctx_reason or f"Phù hợp cho dịp {context}",
            "title": title,
            "subtitle": sub,
            "items": [
                {
                    "id": it.id,
                    "name": it.name,
                    "category": it.category,
                    "color_name": it.color_name,
                    "color_hex": it.color_hex,
                    "image_path": it.image_path,
                }
                for it in outfit_items
            ],
        })

    # 2. TẠO CÁC BỘ PHỐI TỪ ÁO + QUẦN/VÁY (Two-Piece)
    # Quy tắc: Áo đi với Quần hoặc Chân váy (ngắn/dài)
    for top in tops:
        top_color = {"h": top.color_h, "s": top.color_s, "l": top.color_l}
        top_w_score = calculate_item_weather_score(top.name, top.category, top.color_name or "", weather)
        top_ctx_score, top_reason = calculate_item_context_score(top, context)

        for bot in bottoms:
            bot_color = {"h": bot.color_h, "s": bot.color_s, "l": bot.color_l}
            bot_w_score = calculate_item_weather_score(bot.name, bot.category, bot.color_name or "", weather)
            bot_ctx_score, bot_reason = calculate_item_context_score(bot, context)

            # Chấm điểm hòa hợp màu sắc ColorHarmonyEngine HSL
            hs, ht, h_title, h_badge = score_color_harmony_hsl(top_color, bot_color)

            # Điểm tổng hợp: Bối cảnh chiếm trọng số cao nhất để dịp nào ra đúng đồ dịp đó!
            score = 50 + (top_ctx_score + bot_ctx_score) + (hs * 10) + top_w_score + bot_w_score

            outfit_items = [top, bot]

            if shoes:
                outfit_items.append(shoes[0])

            # Đặt tiêu đề và lý do theo ngữ cảnh
            ctx_lower = context.lower()
            if "đi làm" in ctx_lower:
                title = f"Chỉn chu công sở · {top.name}"
                reason = "Lịch thiệp, chuẩn phong cách văn phòng"
            elif "hẹn hò" in ctx_lower:
                title = f"Cuốn hút hẹn hò · {top.name}"
                reason = "Trẻ trung, quyến rũ cho buổi gặp gỡ"
            elif "đi chơi" in ctx_lower:
                title = f"Phóng khoáng dạo phố · {top.name}"
                reason = "Năng động, thoải mái khi xuống phố"
            else:
                title = f"Năng động giảng đường · {top.name}"
                reason = "Gọn gàng, chỉn chu khi đi học"

            subtitle = f"{top.color_name or 'Áo'} + {bot.color_name or 'Đồ dưới'} · {h_badge}"

            candidates.append({
                "type": "two_piece",
                "score": score,
                "harmony_score": hs,
                "harmony_type": ht,
                "harmony_title": h_title,
                "harmony_badge": h_badge,
                "occasion_reason": reason,
                "title": title,
                "subtitle": subtitle,
                "items": [
                    {
                        "id": it.id,
                        "name": it.name,
                        "category": it.category,
                        "color_name": it.color_name,
                        "color_hex": it.color_hex,
                        "image_path": it.image_path,
                    }
                    for it in outfit_items
                ],
            })

    # Sắp xếp các bộ phối theo điểm số giảm dần
    candidates.sort(key=lambda x: x["score"], reverse=True)

    # Lấy tối đa 8 gợi ý phong phú để người dùng tha hồ lựa chọn
    top_suggestions = candidates[:8]

    return {
        "success": True,
        "outfits": top_suggestions,
        "count": len(top_suggestions),
        "context": context,
        "weather_advice": weather.recommendation_advice or weather.condition_description,
    }


