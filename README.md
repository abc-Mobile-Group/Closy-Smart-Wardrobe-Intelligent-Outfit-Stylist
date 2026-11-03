# Closy API (NestJS)
Backend demo cho Closy – Smart Wardrobe & Intelligent Outfit Stylist (CO3043).

| API | Endpoint | User Story |
|---|---|---|
| **1 – Wardrobe** | `POST /wardrobe/items`, `POST /wardrobe/capsule-basics`, `GET /wardrobe/items` | US01 |
| **2 – Outfits** | `POST /outfits/suggest`, `POST /outfits/confirm-wear`, `GET /outfits/history` | US02–US04 |

## Chạy local
    npm install && npm run build && npm start   # http://localhost:3000/docs

## Test nhanh trên Swagger (/docs)
1. `POST /wardrobe/capsule-basics` (body `{}`) -> nạp 9 món mẫu
2. `POST /outfits/suggest` -> `{"occasion":"work","weather":{"tempC":33}}`
3. Copy `id` 1 món -> `lockedItemIds`, copy `signature` -> `excludeSignatures` để thử Lock/Swap
4. `POST /outfits/confirm-wear` với `itemIds` của bộ đã chọn

Dữ liệu lưu in-memory (reset khi server restart) – đủ cho demo.
