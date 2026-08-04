import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RegisterSellerDto, UpdateSellerDto } from './dto/register-seller.dto';
import { SellersService } from './sellers.service';

@ApiTags('sellers')
@Controller({ path: 'sellers', version: '1' })
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Post('register')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'ثبت‌نام فروشندگی (نیازمند تأیید ادمین)' })
  register(@CurrentUser('id') userId: string, @Body() dto: RegisterSellerDto) {
    return this.sellers.register(userId, dto);
  }

  @Get('me')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[فروشنده] اطلاعات فروشگاه من' })
  me(@CurrentUser('id') userId: string) {
    return this.sellers.me(userId);
  }

  @Patch('me')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateSellerDto) {
    return this.sellers.updateMe(userId, dto);
  }

  @Get('me/dashboard')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[فروشنده] داشبورد: آمار محصولات و فروش ۳۰ روز اخیر' })
  dashboard(@CurrentUser('id') userId: string) {
    return this.sellers.dashboard(userId);
  }

  @Get('me/sales-report')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiOperation({ summary: '[فروشنده] گزارش فروش روزانه' })
  salesReport(@CurrentUser('id') userId: string, @Query('days') days?: string) {
    const parsed = Math.min(Math.max(parseInt(days ?? '30', 10) || 30, 1), 365);
    return this.sellers.salesReport(userId, parsed);
  }

  @Public()
  @Get('shops/:slug')
  @ApiOperation({ summary: 'پروفایل عمومی فروشگاه' })
  publicShop(@Param('slug') slug: string) {
    return this.sellers.publicShop(slug);
  }
}
