import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'تکمیل خرید و ثبت سفارش از روی سبد خرید' })
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.orders.checkout(userId, dto.addressId);
  }

  @Get()
  @ApiOperation({
    summary: 'سابقه سفارش‌های من — برای پولینگ وضعیت هر ۱۰ ثانیه از همین مسیر استفاده کنید',
  })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  myOrders(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orders.myOrders(userId, status, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات و وضعیت سفارش (مناسب پولینگ)' })
  myOrder(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.myOrder(userId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'لغو سفارش پرداخت‌نشده' })
  cancel(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.cancel(userId, id);
  }
}
