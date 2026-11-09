closy/
├── README.md
├── .gitignore                      # nhớ có .env, node_modules
├── .github/
│   └── workflows/
│       └── ci.yml                  # [S1] lint + test
│
├── client/                         # React Native + Expo + TypeScript
│   ├── app.json
│   ├── eas.json                    # [S1] cấu hình EAS Build
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                        # EXPO_PUBLIC_API_URL, KHÔNG commit
│   ├── assets/
│   │   ├── icon.png
│   │   ├── splash.png
│   │   └── seed/                   # [S4] dữ liệu mẫu demo (JSON + ảnh)
│   │
│   ├── app/                        # ĐIỀU HƯỚNG (Expo Router)
│   │   ├── _layout.tsx             # [S1] gốc: kiểm tra đăng nhập
│   │   ├── login.tsx               # [S1] màn đăng nhập Google
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx         # [S1] thanh 3 tab
│   │   │   ├── wardrobe.tsx        # [S2] tab Tủ đồ
│   │   │   ├── add.tsx             # [S2] tab Thêm món
│   │   │   └── suggest.tsx         # [S1 trống, S3 làm thật] tab Gợi ý
│   │   └── item/
│   │       └── [id].tsx            # [S2] xem/sửa một món
│   │
│   ├── src/
│   │   ├── components/             # UI dùng chung
│   │   │   ├── ItemCard.tsx        # [S2]
│   │   │   ├── CategoryFilter.tsx  # [S2]
│   │   │   ├── ColorPicker.tsx     # [S2] sửa màu HSL
│   │   │   ├── FormalityPicker.tsx # [S2] 3 nút 1/3/5
│   │   │   ├── EmptyState.tsx      # [S2]
│   │   │   └── OutfitCard.tsx      # [S3]
│   │   │
│   │   ├── store/                  # Zustand (lớp ViewModel)
│   │   │   ├── authStore.ts        # [S1]
│   │   │   ├── wardrobeStore.ts    # [S2]
│   │   │   └── suggestStore.ts     # [S3]
│   │   │
│   │   ├── services/               # Logic nghiệp vụ
│   │   │   ├── AuthService.ts      # [S1] Google Sign-In, JWT
│   │   │   ├── WardrobeService.ts  # [S2] CRUD, isReady()
│   │   │   ├── ImageService.ts     # [S2] resize, gọi /image/process, fallback
│   │   │   ├── HistoryService.ts   # [S3] confirmWear()
│   │   │   └── InsightService.ts   # [S4] thống kê, thiếu hụt tủ
│   │   │
│   │   ├── engine/                 # Thuật toán thuần, dễ unit test
│   │   │   ├── colorHarmony.ts     # [S3] hueDiff, isNeutral, colorPair
│   │   │   ├── suggest.ts          # [S3] suggest(), Lock/Swap
│   │   │   └── __tests__/
│   │   │       ├── colorHarmony.test.ts
│   │   │       └── suggest.test.ts
│   │   │
│   │   ├── repositories/           # Chỉ làm việc với DB và file
│   │   │   ├── ItemRepository.ts   # [S2]
│   │   │   ├── OutfitRepository.ts # [S3]
│   │   │   ├── EventRepository.ts  # [S4] planned_events
│   │   │   └── FileRepository.ts   # [S2] lưu/xóa file ảnh
│   │   │
│   │   ├── db/
│   │   │   ├── database.ts         # [S1] mở SQLite
│   │   │   └── migrations.ts       # [S1] migration theo version
│   │   │
│   │   ├── api/
│   │   │   ├── client.ts           # [S1] fetch + gắn JWT + xử lý 401
│   │   │   └── endpoints.ts        # [S1/S2] auth, image/process
│   │   │
│   │   ├── types/
│   │   │   ├── item.ts             # [S2] Item, Category
│   │   │   └── outfit.ts           # [S3]
│   │   │
│   │   ├── constants/
│   │   │   ├── contexts.ts         # [S3] bối cảnh + mức trang trọng mục tiêu
│   │   │   └── theme.ts            # [S1] màu, cỡ chữ, khoảng cách
│   │   │
│   │   └── utils/
│   │       ├── color.ts            # [S2] hsl <-> hex
│   │       └── date.ts             # [S3] daysSince()
│   │
│   └── __tests__/                  # test tích hợp (DB, service)
│
└── server/                         # FastAPI + Docker
    ├── Dockerfile                  # [S1]
    ├── docker-compose.yml          # [S1] api + tunnel
    ├── requirements.txt            # [S1]
    ├── .env                        # KHÔNG commit
    ├── .env.example                # [S1] mẫu, có thể commit
    ├── main.py                     # [S1 auth, S2 image/process]
    └── tests/
        └── test_api.py             # [S2] test /health, 401, /image/process