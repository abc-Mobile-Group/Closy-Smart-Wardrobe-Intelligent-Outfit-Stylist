1) Chép thư mục client/ và server/ trong gói này đè vào repo (ghi đè đúng đường dẫn):
   client/src/db/migrations.ts
   client/src/utils/date.ts
   client/src/services/HistoryService.ts
   client/src/services/OutfitService.ts
   client/src/repositories/FileRepository.ts
   client/src/repositories/ItemRepository.ts
   client/app/(tabs)/history.tsx
   server/tests/conftest.py, server/tests/test_main.py   (file mới)
2) python apply_patches.py          (vá main.py, today, suggest, outfit-detail, login, ProfileModal, ItemDetailModal, WeatherService, WardrobeService, wardrobeStore)
3) sh cleanup.sh                    (dọn file rỗng, .env, skills/, compose trùng, tách NestJS)  -- chạy SAU bước 2
4) Thêm vào server/.env.example:  ALLOWED_ORIGINS=*
5) cd client && npx tsc --noEmit ;  cd server && pip install -r requirements-dev.txt && pytest -q
