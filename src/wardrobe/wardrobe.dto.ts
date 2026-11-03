import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';
import { Category, ItemSource, Occasion } from './wardrobe.types';

export class CreateItemDto {
  @ApiPropertyOptional({ default: 'demo', description: 'Định danh người dùng (demo, không cần đăng nhập)' })
  @IsOptional() @IsString() userId?: string;

  @ApiProperty({ example: 'Áo thun trắng' }) @IsString() @MaxLength(80) name: string;
  @ApiProperty({ enum: Category, example: Category.TOP }) @IsEnum(Category) category: Category;
  @ApiProperty({ example: '#FFFFFF', description: 'Màu chủ đạo dạng hex' })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'colorHex phải có dạng #RRGGBB' }) colorHex: string;

  @ApiProperty({ enum: Occasion, isArray: true, example: [Occasion.SCHOOL, Occasion.CASUAL_DATE] })
  @IsArray() @ArrayMinSize(1) @IsEnum(Occasion, { each: true }) occasions: Occasion[];

  @ApiPropertyOptional({ enum: ItemSource, default: ItemSource.CAMERA }) @IsOptional() @IsEnum(ItemSource) source?: ItemSource;
  @ApiPropertyOptional({ example: 'https://example.com/ao-thun.png' }) @IsOptional() @IsUrl() imageUrl?: string;
}

export class CapsuleDto {
  @ApiPropertyOptional({ default: 'demo' }) @IsOptional() @IsString() userId?: string;
}
