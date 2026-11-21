"""Đo thời gian POST /image/process (nghiệm thu Sprint 2).

  python server/scripts/benchmark_process.py --url http://localhost:8000 \
      --email a@x.com --password 12345678 --dir ./sample_photos

Kết quả in dạng bảng Markdown, dán vào docs/BENCHMARK.md.
"""
import argparse, base64, statistics, sys, time
from pathlib import Path

import requests

ap = argparse.ArgumentParser()
ap.add_argument("--url", required=True)
ap.add_argument("--email", required=True)
ap.add_argument("--password", required=True)
ap.add_argument("--dir", required=True, help="Thư mục chứa ảnh .jpg/.png (nên ~10 ảnh)")
ap.add_argument("--timeout", type=int, default=60)
a = ap.parse_args()

base = a.url.rstrip("/")
r = requests.post(f"{base}/auth/login", json={"email": a.email, "password": a.password}, timeout=15)
r.raise_for_status()
headers = {"Authorization": f"Bearer {r.json()['token']}"}

files = sorted(p for p in Path(a.dir).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
if not files:
    sys.exit("Không có ảnh trong thư mục")

rows, totals = [], []
for i, p in enumerate(files):
    b64 = base64.b64encode(p.read_bytes()).decode()
    t0 = time.time()
    try:
        res = requests.post(f"{base}/image/process", json={"image_base64": b64},
                            headers=headers, timeout=a.timeout)
        total = time.time() - t0
        j = res.json()
        server = j.get("process_time_sec", "-")
        note = "OK" if j.get("success") else f"từ chối: {j.get('message', res.status_code)}"
    except Exception as e:
        total, server, note = time.time() - t0, "-", f"lỗi: {type(e).__name__}"
    if i == 0:
        note += " (lần đầu, tải model)"
    else:
        totals.append(total)
    rows.append((p.name, p.stat().st_size // 1024, server, round(total, 2), note))

print("| Ảnh | KB | Server (s) | Tổng (s) | Ghi chú |\n|---|---|---|---|---|")
for n, kb, s, t, note in rows:
    print(f"| {n} | {kb} | {s} | {t} | {note} |")
if totals:
    print(f"\nTrung bình (bỏ lần đầu): {statistics.mean(totals):.2f}s · max: {max(totals):.2f}s · n={len(totals)}")
