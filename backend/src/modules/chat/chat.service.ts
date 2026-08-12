import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Buyer starts (or resumes) a conversation with a shop. One thread per buyer↔seller pair. */
  async openChat(buyerId: string, sellerId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller || seller.status !== 'APPROVED') {
      throw new NotFoundException('فروشگاه یافت نشد');
    }
    if (seller.userId === buyerId) {
      throw new ForbiddenException('نمی‌توانید با فروشگاه خودتان گفتگو کنید');
    }
    return this.prisma.chat.upsert({
      where: { buyerId_sellerId: { buyerId, sellerId } },
      create: { buyerId, sellerId },
      update: {},
      include: this.chatInclude(),
    });
  }

  /** All threads where the user participates (as buyer or as the shop owner). */
  async listMine(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: { OR: [{ buyerId: userId }, { seller: { userId } }] },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        ...this.chatInclude(),
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { isRead: false, NOT: { senderId: userId } } } } },
      },
    });
    return chats.map((c) => ({
      id: c.id,
      buyer: c.buyer,
      seller: c.seller,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      lastMessage: c.messages[0] ?? null,
      unreadCount: c._count.messages,
    }));
  }

  /**
   * Polling-friendly message fetch: pass `after` (ISO8601) to get only new
   * messages since the previous poll; omit it to load recent history.
   */
  async getMessages(userId: string, chatId: string, after?: string, limit = 50) {
    await this.assertParticipant(userId, chatId);
    const where: Prisma.ChatMessageWhereInput = {
      chatId,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    };
    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: after ? 'asc' : 'desc' },
      take: limit,
    });
    if (!after) messages.reverse();
    return { chatId, messages, serverTime: new Date().toISOString() };
  }

  async sendMessage(userId: string, chatId: string, body: string) {
    const chat = await this.assertParticipant(userId, chatId);
    const message = await this.prisma.chatMessage.create({
      data: { chatId, senderId: userId, body },
    });
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: message.createdAt },
    });

    const recipientId = chat.buyerId === userId ? chat.seller.userId : chat.buyerId;
    const senderName =
      chat.buyerId === userId ? chat.buyer.fullName ?? 'مشتری' : chat.seller.shopName;
    await this.notifications.notify({
      userId: recipientId,
      title: `پیام جدید از ${senderName}`,
      body: body.length > 80 ? `${body.slice(0, 80)}…` : body,
      type: 'CHAT',
      data: { chatId },
    });
    return message;
  }

  async markRead(userId: string, chatId: string) {
    await this.assertParticipant(userId, chatId);
    await this.prisma.chatMessage.updateMany({
      where: { chatId, isRead: false, NOT: { senderId: userId } },
      data: { isRead: true },
    });
    return { message: 'پیام‌ها خوانده شد' };
  }

  private assertParticipant(userId: string, chatId: string) {
    return this.prisma.chat
      .findUniqueOrThrow({ where: { id: chatId }, include: this.chatIncludeWithBuyerName() })
      .then((chat) => {
        if (chat.buyerId !== userId && chat.seller.userId !== userId) {
          throw new ForbiddenException('دسترسی به این گفتگو ندارید');
        }
        return chat;
      })
      .catch((e) => {
        if (e instanceof ForbiddenException) throw e;
        throw new NotFoundException('گفتگو یافت نشد');
      });
  }

  private chatInclude() {
    return {
      buyer: { select: { id: true, fullName: true, avatarUrl: true } },
      seller: { select: { id: true, shopName: true, shopSlug: true, logoUrl: true } },
    } as const;
  }

  private chatIncludeWithBuyerName() {
    return {
      buyer: { select: { id: true, fullName: true, avatarUrl: true } },
      seller: {
        select: { id: true, shopName: true, shopSlug: true, logoUrl: true, userId: true },
      },
    } as const;
  }
}
