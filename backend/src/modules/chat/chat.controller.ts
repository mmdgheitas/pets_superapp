import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateChatDto, GetMessagesQueryDto, SendMessageDto } from './dto/chat.dto';

@ApiTags('chat')
@ApiBearerAuth('access-token')
@Controller({ path: 'chats', version: '1' })
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'شروع/بازگشت به گفتگو با یک فروشگاه' })
  open(@CurrentUser('id') userId: string, @Body() dto: CreateChatDto) {
    return this.chat.openChat(userId, dto.sellerId);
  }

  @Get()
  @ApiOperation({ summary: 'لیست گفتگوهای من (خریدار یا فروشنده)' })
  listMine(@CurrentUser('id') userId: string) {
    return this.chat.listMine(userId);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'پیام‌های گفتگو — با پارامتر after برای پولینگ ۱۰ ثانیه‌ای پیام‌های جدید',
  })
  messages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.chat.getMessages(userId, id, query.after, query.limit);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'ارسال پیام' })
  send(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendMessage(userId, id, dto.body);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'علامت‌گذاری پیام‌های گفتگو به‌عنوان خوانده‌شده' })
  markRead(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.chat.markRead(userId, id);
  }
}
