"""Bộ trích xuất màu sắc chủ đạo từ hình ảnh trang phục RGBA.
- Sử dụng K-Means clustering trên các pixel có alpha > 128 (loại bỏ nền trong suốt).
- Chuyển đổi mã màu sang HSL (H: 0-360, S: 0-100, L: 0-100) và HEX (#RRGGBB).
- Phân loại tên màu tiếng Việt và tìm màu gần nhất trong bảng màu ứng dụng Closy.
"""

from __future__ import annotations

import colorsys
import math
from typing import Any, Dict, List, Tuple
import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

# Bảng màu chuẩn của Closy để map tự động vào UI
APP_COLOR_PRESETS = [
    {"id": "white", "name": "Trắng", "hex": "#FFFFFF", "rgb": (255, 255, 255)},
    {"id": "cream", "name": "Kem", "hex": "#F5F2EB", "rgb": (245, 242, 235)},
    {"id": "navy", "name": "Xanh đậm", "hex": "#243A63", "rgb": (36, 58, 99)},
    {"id": "olive", "name": "Ô liu", "hex": "#636F4E", "rgb": (99, 111, 78)},
    {"id": "black", "name": "Đen", "hex": "#1E293B", "rgb": (30, 41, 59)},
    {"id": "dusty-pink", "name": "Hồng phấn", "hex": "#D29B9B", "rgb": (210, 155, 155)},
    {"id": "gray", "name": "Xám", "hex": "#808080", "rgb": (128, 128, 128)},
    {"id": "brown", "name": "Nâu", "hex": "#795548", "rgb": (121, 85, 72)},
    {"id": "blue", "name": "Xanh dương", "hex": "#2196F3", "rgb": (33, 150, 243)},
    {"id": "red", "name": "Đỏ", "hex": "#E53935", "rgb": (229, 57, 53)},
    {"id": "yellow", "name": "Vàng", "hex": "#FDD835", "rgb": (253, 216, 53)},
]


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Chuyển RGB (0-255) thành HEX #RRGGBB."""
    return f"#{int(r):02X}{int(g):02X}{int(b):02X}"


def rgb_to_hsl(r: int, g: int, b: int) -> Tuple[int, int, int]:
    """Chuyển RGB (0-255) sang HSL (H: 0-360, S: 0-100, L: 0-100)."""
    r_norm, g_norm, b_norm = r / 255.0, g / 255.0, b / 255.0
    h_norm, l_norm, s_norm = colorsys.rgb_to_hls(r_norm, g_norm, b_norm)
    h = round(h_norm * 360) % 360
    s = round(s_norm * 100)
    l = round(l_norm * 100)
    return h, s, l


def color_distance(rgb1: Tuple[int, int, int], rgb2: Tuple[int, int, int]) -> float:
    """Khoảng cách màu có trọng số theo thị giác người (Redmean metric)."""
    r1, g1, b1 = rgb1
    r2, g2, b2 = rgb2
    r_bar = (r1 + r2) / 2.0
    dr = r1 - r2
    dg = g1 - g2
    db = b1 - b2
    return math.sqrt(
        (2 + r_bar / 256.0) * (dr**2)
        + 4.0 * (dg**2)
        + (2 + (255.0 - r_bar) / 256.0) * (db**2)
    )


def match_closest_preset(r: int, g: int, b: int) -> Dict[str, Any]:
    """Tìm màu preset gần nhất và chuẩn xác nhất trong bảng màu Closy."""
    h, s, l = rgb_to_hsl(r, g, b)

    # 1. Đen (Độ sáng cực thấp)
    if l <= 18:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "black")

    # 2. Trắng (Độ sáng rất cao, độ bão hòa thấp)
    if l >= 90 and s <= 22:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "white")
    if l >= 94 and s <= 30:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "white")

    # 3. Xám (Độ bão hòa màu rất thấp)
    if s <= 12:
        if l >= 85:
            return next(p for p in APP_COLOR_PRESETS if p["id"] == "white")
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "gray")

    # 4. Màu Kem / Be (Độ sáng cao >= 65%, độ bão hòa nhẹ/vừa ở tông ấm 15-70 độ hoặc > 340 độ)
    if l >= 65 and s <= 50 and (15 <= h <= 70 or h >= 340):
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "cream")
    if l >= 78 and s <= 40:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "cream")

    # 5. Màu Hồng phấn (Độ sáng trung bình - cao trong dải đỏ-magenta, h < 25 hoặc h >= 315)
    if (h >= 315 or h <= 25) and l >= 48 and s >= 12:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "dusty-pink")

    # 6. Màu Nâu (Tông đỏ/cam/vàng ấm nhưng độ sáng tối - trung bình)
    if (15 <= h <= 45 or h >= 340) and l < 48 and s >= 15:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "brown")

    # 7. Màu Ô liu / Xanh rêu
    if (65 <= h <= 145) and l < 48:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "olive")

    # 8. Màu Xanh đậm / Xanh navy (bao gồm cả denim jeans: L <= 45 hoặc độ bão hòa vừa phải)
    if (185 <= h <= 255) and (l <= 45 or (l <= 52 and s <= 55)):
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "navy")

    # 9. Màu Xanh dương (Sắc thái xanh trời tươi sáng, độ bão hòa cao)
    if (185 <= h <= 255) and l > 45 and s > 50:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "blue")

    # 10. Màu Đỏ (Độ sáng thấp-vừa, độ bão hòa cao)
    if (h < 20 or h >= 345) and l < 50 and s >= 35:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "red")

    # 11. Màu Vàng
    if 45 <= h <= 65 and s >= 45:
        return next(p for p in APP_COLOR_PRESETS if p["id"] == "yellow")

    # Fallback: Tính khoảng cách màu có trọng số thị giác Redmean
    best_match = APP_COLOR_PRESETS[0]
    min_dist = float("inf")
    for preset in APP_COLOR_PRESETS:
        dist = color_distance((r, g, b), preset["rgb"])
        if dist < min_dist:
            min_dist = dist
            best_match = preset
    return {
        "id": best_match["id"],
        "name": best_match["name"],
        "hex": best_match["hex"],
    }


def get_vietnamese_color_name(h: int, s: int, l: int, r: int, g: int, b: int) -> str:
    """Xác định tên màu tiếng Việt đồng nhất 100% với bảng màu của ứng dụng Closy."""
    # Đồng nhất tuyệt đối: Trả về tên màu tương ứng với preset được nhận diện
    preset = match_closest_preset(r, g, b)
    return preset["name"]


def extract_colors_from_rgba(
    image: Image.Image,
    max_clusters: int = 4,
    sample_size: int = 12000,
) -> Dict[str, Any]:
    """Trích xuất màu chủ đạo và bảng màu từ ảnh PIL RGBA đã tách nền.

    Args:
        image: PIL Image ở chế độ RGBA.
        max_clusters: Số cụm màu K-Means tối đa (mặc định 4).
        sample_size: Số pixel lấy mẫu ngẫu nhiên để tối ưu tốc độ (<100ms).

    Returns:
        Dict chứa color chủ đạo (HSL, HEX, tên) và palette màu phụ kèm tỷ lệ %.
    """
    if image.mode != "RGBA":
        image = image.convert("RGBA")

    arr = np.array(image)
    # Lọc lấy các pixel có alpha > 128 (phần chủ thể món đồ)
    alpha_mask = arr[:, :, 3] > 128
    opaque_pixels = arr[alpha_mask, :3]  # Lấy kênh R, G, B

    # Nếu không có hoặc có quá ít pixel chủ thể
    if len(opaque_pixels) < 50:
        # Fallback về màu trắng mặc định
        return {
            "primary": {
                "hex": "#FFFFFF",
                "h": 0,
                "s": 0,
                "l": 100,
                "name": "Trắng",
                "closest_preset": APP_COLOR_PRESETS[0],
            },
            "palette": [],
        }

    # Lấy mẫu ngẫu nhiên nếu số lượng pixel quá lớn để K-Means chạy siêu nhanh
    if len(opaque_pixels) > sample_size:
        indices = np.random.RandomState(42).choice(
            len(opaque_pixels), sample_size, replace=False
        )
        samples = opaque_pixels[indices]
    else:
        samples = opaque_pixels

    # Xác định số cụm thích hợp (tối đa bằng số pixel duy nhất)
    unique_colors = len(np.unique(samples, axis=0))
    n_clusters = min(max_clusters, max(1, unique_colors))

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
    kmeans.fit(samples)

    centers = kmeans.cluster_centers_.astype(int)
    labels = kmeans.labels_
    counts = np.bincount(labels, minlength=n_clusters)
    total_samples = len(labels)

    # Sắp xếp các cụm theo tần suất giảm dần
    sorted_indices = np.argsort(-counts)

    palette: List[Dict[str, Any]] = []
    for idx in sorted_indices:
        count = counts[idx]
        if count == 0:
            continue
        pct = float(round((count / total_samples) * 100, 1))
        r, g, b = int(centers[idx][0]), int(centers[idx][1]), int(centers[idx][2])
        # Đảm bảo giá trị nằm trong [0, 255]
        r = max(0, min(255, r))
        g = max(0, min(255, g))
        b = max(0, min(255, b))

        hex_code = rgb_to_hex(r, g, b)
        h, s, l = rgb_to_hsl(r, g, b)
        vn_name = get_vietnamese_color_name(h, s, l, r, g, b)
        closest_preset = match_closest_preset(r, g, b)

        palette.append(
            {
                "hex": hex_code,
                "h": int(h),
                "s": int(s),
                "l": int(l),
                "r": int(r),
                "g": int(g),
                "b": int(b),
                "name": vn_name,
                "percentage": pct,
                "closest_preset": closest_preset,
            }
        )

    primary = palette[0] if palette else {
        "hex": "#FFFFFF",
        "h": 0,
        "s": 0,
        "l": 100,
        "r": 255,
        "g": 255,
        "b": 255,
        "name": "Trắng",
        "percentage": 100.0,
        "closest_preset": APP_COLOR_PRESETS[0],
    }

    return {
        "primary": primary,
        "palette": palette,
    }
