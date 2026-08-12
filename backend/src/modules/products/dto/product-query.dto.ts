import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export const PRODUCT_SORTS = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'best_selling',
  'top_rated',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'جستجو در عنوان و توضیحات' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'اسلاگ دسته‌بندی (شامل زیردسته‌ها)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'اسلاگ فروشگاه' })
  @IsOptional()
  @IsString()
  shop?: string;

  @ApiPropertyOptional({ description: 'حداقل قیمت (ریال)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'حداکثر قیمت (ریال)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'فقط کالاهای موجود' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  inStock?: number;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(PRODUCT_SORTS as unknown as string[])
  sort?: ProductSort = 'newest';
}
