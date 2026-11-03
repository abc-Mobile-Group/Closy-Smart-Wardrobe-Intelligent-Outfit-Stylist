import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Occasion } from '../wardrobe/wardrobe.types';

export class WeatherDto {
  @ApiProperty({ example: 33, description: 'Nhiệt độ (°C)' }) @IsNumber() @Min(-30) @Max(60) tempC: number;
  @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() rain?: boolean;
}

export class SuggestDto {
  @ApiPropertyOptional({ default: 'demo' }) @IsOptional() @IsString() userId?: string;
  @ApiProperty({ enum: Occasion, example: Occasion.SCHOOL, description: 'Bối cảnh: Đi học / Đi làm / Đi chơi-Hẹn hò' }) @IsEnum(Occasion) occasion: Occasion;
  @ApiPropertyOptional({ type: WeatherDto, description: 'Tùy chọn – thiếu dữ liệu vẫn phối được' })
  @IsOptional() @ValidateNested() @Type(() => WeatherDto) weather?: WeatherDto;
  @ApiPropertyOptional({ type: [String], description: 'Món đã Khóa (Lock) – luôn giữ nguyên trong mọi gợi ý' })
  @IsOptional() @IsArray() @IsString({ each: true }) lockedItemIds?: string[];
  @ApiPropertyOptional({ type: [String], description: 'Các `signature` bộ đã bị Dislike/đã xem – sẽ không gợi ý lại (Swap)' })
  @IsOptional() @IsArray() @IsString({ each: true }) excludeSignatures?: string[];
}

export class ConfirmWearDto {
  @ApiPropertyOptional({ default: 'demo' }) @IsOptional() @IsString() userId?: string;
  @ApiProperty({ type: [String], description: 'ID các món trong bộ được mặc' }) @IsArray() @ArrayMinSize(1) @IsString({ each: true }) itemIds: string[];
  @ApiPropertyOptional({ enum: Occasion }) @IsOptional() @IsEnum(Occasion) occasion?: Occasion;
}
