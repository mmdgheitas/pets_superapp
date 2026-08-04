import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, TicketStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'جستجو در موبایل/نام/ایمیل' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['CUSTOMER', 'SELLER', 'ADMIN'] })
  @IsOptional()
  @IsIn(['CUSTOMER', 'SELLER', 'ADMIN'])
  role?: 'CUSTOMER' | 'SELLER' | 'ADMIN';
}

export class SetUserActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class RejectSellerDto {
  @ApiProperty({ example: 'مدارک ناقص است' })
  @IsString()
  @MaxLength(300)
  reason: string;
}

export class ApproveSellerDto {
  @ApiPropertyOptional({ example: 5, description: 'درصد کمیسیون اختصاصی فروشنده' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(50)
  commissionRate?: number;
}

export class ModerateProductDto {
  @ApiProperty({ enum: ['ACTIVE', 'REJECTED', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'REJECTED', 'INACTIVE'])
  status: 'ACTIVE' | 'REJECTED' | 'INACTIVE';
}

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ description: 'نشانی تصویر (از /upload/image)' })
  @IsString()
  @MaxLength(500)
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @ApiPropertyOptional({ default: 'home_top' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  position?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBannerDto extends CreateBannerDto {}

export class ReplyTicketDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  reply: string;
}

export class AdminPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class TicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
