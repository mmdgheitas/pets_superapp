import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { DeviceTokenDto } from './dto/device-token.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'لیست اعلان‌های من (صفحه‌بندی)' })
  findMine(@CurrentUser('id') userId: string, @Query() query: PaginationQueryDto) {
    return this.notifications.findMine(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'تعداد اعلان‌های خوانده‌نشده — برای پولینگ هر ۱۰ ثانیه' })
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Post(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(userId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Post('device-token')
  @ApiOperation({ summary: 'ثبت توکن دستگاه برای دریافت نوتیفیکیشن (FCM)' })
  registerDevice(@CurrentUser('id') userId: string, @Body() dto: DeviceTokenDto) {
    return this.notifications.registerDevice(userId, dto.token, dto.platform);
  }
}
