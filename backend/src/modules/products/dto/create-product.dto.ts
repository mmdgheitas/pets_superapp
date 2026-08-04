import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'غذای خشک سگ رویال کنین مدل مکسی ادالت ۱۵ کیلویی' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'شناسه دسته‌بندی' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'غذای کامل مخصوص سگ‌های نژاد بزرگ بالای ۱۵ ماه...' })
  @IsString()
  description: string;

  @ApiProperty({ example: 2850000, description: 'قیمت به ریال' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1000, { message: 'قیمت باید حداقل ۱۰۰۰ ریال باشد' })
  price: number;

  @ApiPropertyOptional({ example: 3400000, description: 'قیمت قبل از تخفیف (ریال)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  compareAtPrice?: number;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/p/royal-1.webp,https://cdn.example.com/p/royal-2.webp',
    description: 'آرایه‌ای از نشانی تصاویر (از /upload/images دریافت می‌شود)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    example: { brand: 'Royal Canin', weightKg: 15 },
    description: 'ویژگی‌های ساختاری محصول (JSON)',
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1000)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  compareAtPrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
