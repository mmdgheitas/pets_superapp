import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:orderId/request')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'ایجاد درخواست پرداخت برای سفارش و دریافت لینک درگاه (زرین‌پال)',
  })
  request(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.payments.requestPayment(userId, orderId);
  }

  @Public()
  @Get('callback')
  @ApiOperation({
    summary: 'کال‌بک درگاه پرداخت — کاربر بعد از پرداخت به وب‌اپ هدایت می‌شود',
  })
  @ApiQuery({ name: 'Authority', required: true })
  @ApiQuery({ name: 'Status', required: true })
  async callback(
    @Query('Authority') authority: string,
    @Query('Status') status: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.payments.handleCallback(authority, status);
    return res.redirect(302, redirectUrl);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'تاریخچه پرداخت‌های من' })
  myPayments(@CurrentUser('id') userId: string, @Query() query: PaginationQueryDto) {
    return this.payments.myPayments(userId, query);
  }
}
