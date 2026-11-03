import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ConfirmWearDto, SuggestDto } from './outfits.dto';
import { OutfitsService } from './outfits.service';

@ApiTags('API 2 – Outfits (Color Harmony Engine)')
@Controller('outfits')
export class OutfitsController {
  constructor(private readonly svc: OutfitsService) {}

  @Post('suggest') @HttpCode(200)
  @ApiOperation({
    summary: 'Gợi ý 2–3 bộ đồ theo bối cảnh (US02, US03)',
    description: 'Rule-based Color Harmony (đơn sắc / tương đồng / tương phản / trung tính) + lọc bối cảnh + thời tiết (tùy chọn). ' +
      'Truyền `lockedItemIds` để Khóa món, truyền `excludeSignatures` để Đổi (Swap)/Dislike. Món lâu chưa mặc được cộng điểm nhẹ (US04).',
  })
  suggest(@Body() dto: SuggestDto) { return this.svc.suggest(dto); }

  @Post('confirm-wear')
  @ApiOperation({ summary: 'Xác nhận mặc – lưu lịch sử & cập nhật lastWornAt (US03, US04)' })
  confirm(@Body() dto: ConfirmWearDto) { return this.svc.confirmWear(dto); }

  @Get('history')
  @ApiOperation({ summary: 'Xem lịch sử các bộ đã xác nhận mặc' })
  @ApiQuery({ name: 'userId', required: false, example: 'demo' })
  history(@Query('userId') userId?: string) { return this.svc.getHistory(userId); }
}
