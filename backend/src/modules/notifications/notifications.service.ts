import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { paginate, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { FcmService } from './fcm.service';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  data?: Prisma.InputJsonValue;
  /** also deliver a push notification to the user's devices (default: true) */
  push?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async notify(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type ?? 'INFO',
        data: input.data,
      },
    });

    if (input.push !== false) {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: input.userId },
        select: { token: true },
      });
      await this.fcm.sendToTokens(
        tokens.map((t) => t.token),
        {
          title: input.title,
          body: input.body,
          data: { notificationId: notification.id, type: notification.type },
        },
      );
    }
    return notification;
  }

  async findMine(userId: string, query: PaginationQueryDto) {
    const where = { userId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
    ]);
    return paginate(items, total, query);
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('اعلان یافت نشد');
    }
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'همه اعلان‌ها خوانده شد' };
  }

  async registerDevice(userId: string, token: string, platform: string) {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, lastSeenAt: new Date() },
    });
    return { message: 'دستگاه ثبت شد' };
  }

  /** Admin/debug helper used internally by other modules. */
  assertOwner(notificationUserId: string, userId: string) {
    if (notificationUserId !== userId) {
      throw new ForbiddenException();
    }
  }
}
