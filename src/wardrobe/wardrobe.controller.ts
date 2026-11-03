import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CapsuleDto, CreateItemDto } from './wardrobe.dto';
import { WardrobeService } from './wardrobe.service';
import { Category, Occasion } from './wardrobe.types';

@ApiTags('API 1 – Wardrobe (Onboarding nạp tủ đồ)')
@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly svc: WardrobeService) {}

  @Post('items')
  @ApiOperation({ summary: 'Thêm 1 món đồ vào tủ (US01)', description: 'Camera / thư viện ảnh / Capsule. Trả về tiến độ onboarding (cần ≥5 món, đủ danh mục).' })
  create(@Body() dto: CreateItemDto) {
    const item = this.svc.create(dto);
    return { item, ...this.svc.progress(item.userId) };
  }

  @Post('capsule-basics')
  @ApiOperation({ summary: 'Nạp nhanh kho mẫu Capsule Basics (9 món)', description: 'Dùng để test nhanh: mở khóa tính năng phối đồ chỉ với 1 lần bấm.' })
  capsule(@Body() dto: CapsuleDto) { return this.svc.addCapsule(dto.userId); }

  @Get('items')
  @ApiOperation({ summary: 'Xem tủ đồ hiện có + tiến độ onboarding' })
  @ApiQuery({ name: 'userId', required: false, example: 'demo' })
  @ApiQuery({ name: 'category', required: false, enum: Category })
  @ApiQuery({ name: 'occasion', required: false, enum: Occasion })
  list(@Query('userId') userId?: string, @Query('category') category?: Category, @Query('occasion') occasion?: Occasion) {
    return this.svc.list(userId || 'demo', category, occasion);
  }
}
