import { Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Body } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

export class AddWishlistDto {
  @ApiProperty()
  @IsUUID()
  productId: string;
}

@ApiTags('wishlist')
@ApiBearerAuth('access-token')
@Controller({ path: 'wishlist', version: '1' })
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'لیست علاقه‌مندی‌های من' })
  list(@CurrentUser('id') userId: string) {
    return this.wishlist.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'افزودن به علاقه‌مندی‌ها (از نو اجراشدنی)' })
  add(@CurrentUser('id') userId: string, @Body() dto: AddWishlistDto) {
    return this.wishlist.add(userId, dto.productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'حذف از علاقه‌مندی‌ها' })
  remove(@CurrentUser('id') userId: string, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.wishlist.remove(userId, productId);
  }
}
