import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ProductsService } from '../products/products.service';
import { PaymentsService } from '../payments/payments.service';
import { AdminService } from './admin.service';
import {
  AdminPaymentsQueryDto,
  AdminUsersQueryDto,
  ApproveSellerDto,
  CreateBannerDto,
  ModerateProductDto,
  RejectSellerDto,
  ReplyTicketDto,
  SetUserActiveDto,
  TicketsQueryDto,
  UpdateBannerDto,
} from './dto/admin.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly products: ProductsService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'شاخص‌های کلیدی امروز' })
  dashboard() {
    return this.admin.dashboard();
  }

  // ------------------------------------------------------------------ users

  @Get('users')
  @ApiOperation({ summary: 'مدیریت کاربران' })
  users(@Query() query: AdminUsersQueryDto) {
    return this.admin.users(query);
  }

  @Patch('users/:id/active')
  @ApiOperation({ summary: 'فعال/غیرفعال کردن کاربر' })
  setUserActive(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserActiveDto,
  ) {
    return this.admin.setUserActive(id, dto.isActive, adminId);
  }

  // ------------------------------------------------------------------ sellers

  @Get('sellers')
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] })
  @ApiOperation({ summary: 'لیست فروشندگان (فیلتر وضعیت)' })
  sellers(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    return this.admin.sellers(status);
  }

  @Post('sellers/:id/approve')
  @ApiOperation({ summary: 'تأیید فروشنده (+ تعیین نرخ کمیسیون اختصاصی)' })
  approveSeller(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveSellerDto) {
    return this.admin.approveSeller(id, dto.commissionRate);
  }

  @Post('sellers/:id/reject')
  @ApiOperation({ summary: 'رد فروشنده' })
  rejectSeller(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectSellerDto) {
    return this.admin.rejectSeller(id, dto.reason);
  }

  @Post('sellers/:id/suspend')
  @ApiOperation({ summary: 'تعلیق فروشنده (محصولاتش غیرفعال می‌شود)' })
  suspendSeller(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.suspendSeller(id);
  }

  // ----------------------------------------------------------------- products

  @Get('products')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'نظارت بر محصولات' })
  listProducts(
    @Query('status') status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'REJECTED',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.products.adminList(status, parseInt(page, 10) || 1, parseInt(limit, 10) || 20);
  }

  @Patch('products/:id/moderate')
  @ApiOperation({ summary: 'تأیید/رد/غیرفعال‌سازی محصول' })
  moderateProduct(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ModerateProductDto) {
    return this.products.moderate(id, dto.status);
  }

  // ------------------------------------------------------------------ banners

  @Get('banners')
  @ApiOperation({ summary: 'مدیریت بنرها' })
  banners() {
    return this.admin.banners();
  }

  @Post('banners')
  createBanner(@Body() dto: CreateBannerDto) {
    return this.admin.createBanner(dto);
  }

  @Patch('banners/:id')
  updateBanner(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBannerDto) {
    return this.admin.updateBanner(id, dto);
  }

  @Delete('banners/:id')
  deleteBanner(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteBanner(id);
  }

  // ------------------------------------------------------- payments & reports

  @Get('payments')
  @ApiOperation({ summary: 'گزارش تراکنش‌ها' })
  adminPayments(@Query() query: AdminPaymentsQueryDto) {
    return this.admin.payments(query);
  }

  @Get('reports/commission')
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiOperation({ summary: 'گزارش کمیسیون پلتفرم و تسویه فروشندگان' })
  commissionReport(@Query('days') days?: string) {
    return this.payments.commissionReport(parseInt(days ?? '30', 10) || 30);
  }

  @Get('reports/daily')
  @ApiOperation({ summary: 'گزارش‌های روزانه تولیدشده توسط جاب زمان‌بندی' })
  dailyReports() {
    return this.admin.dailyReports();
  }

  // ------------------------------------------------------------------ tickets

  @Get('tickets')
  @ApiOperation({ summary: 'تیکت‌های پشتیبانی' })
  tickets(@Query() query: TicketsQueryDto) {
    return this.admin.tickets(query);
  }

  @Post('tickets/:id/reply')
  @ApiOperation({ summary: 'پاسخ به تیکت' })
  replyTicket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplyTicketDto) {
    return this.admin.replyTicket(id, dto.reply);
  }
}

@ApiTags('banners')
@Controller({ path: 'banners', version: '1' })
export class BannersController {
  constructor(private readonly admin: AdminService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'بنرهای فعال ویترین (عمومی)' })
  active(@Query('position') position?: string) {
    return this.admin.activeBanners(position);
  }
}

@ApiTags('support')
@ApiBearerAuth('access-token')
@Controller({ path: 'support/tickets', version: '1' })
export class SupportController {
  constructor(private readonly admin: AdminService) {}

  @Post()
  @ApiOperation({ summary: 'ثبت تیکت پشتیبانی' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTicketDto) {
    return this.admin.createTicket(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'تیکت‌های من' })
  mine(@CurrentUser('id') userId: string) {
    return this.admin.myTickets(userId);
  }
}
