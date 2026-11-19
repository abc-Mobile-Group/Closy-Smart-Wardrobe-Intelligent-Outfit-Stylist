#!/bin/sh
# Chạy ở thư mục GỐC repo (sau khi đã chép file + chạy apply_patches.py)
git rm -f client/src/components/CategoryFilter.tsx client/src/components/ColorPicker.tsx \
  client/src/components/EmptyState.tsx client/src/components/FormalityPicker.tsx \
  client/src/components/ItemCard.tsx client/src/components/OutfitCard.tsx \
  client/src/constants/contexts.ts client/src/engine/colorHarmony.ts \
  client/src/repositories/EventRepository.ts client/src/repositories/OutfitRepository.ts \
  client/src/services/InsightService.ts client/src/store/suggestStore.ts \
  client/src/types/outfit.ts client/src/utils/color.ts "client/app/item/[id].tsx"
git rm --cached client/.env
git rm -r skills/
git rm server/docker-compose.yml
mkdir demo-nestjs
git mv src package.json tsconfig.json nest-cli.json render.yaml Dockerfile README.md demo-nestjs/
echo "Nhớ: xóa 2 dòng mount ./server/main.py và ./server/color_extractor.py trong docker-compose.yml"
