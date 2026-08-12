import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({ description: 'شناسه فروشنده (Seller.id)' })
  @IsUUID()
  sellerId: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 'سلام، این کالا موجود است؟' })
  @IsString()
  @MaxLength(2000)
  body: string;
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional({
    description: 'فقط پیام‌های بعد از این زمان (ISO8601) — برای پولینگ ۱۰ ثانیه‌ای',
  })
  @IsOptional()
  @IsISO8601()
  after?: string;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;
}
