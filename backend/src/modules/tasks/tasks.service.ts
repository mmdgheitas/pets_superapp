import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';

/**
 * Scheduled jobs (@nestjs/schedule):
 *  1. cleanExpiredOtps        — every minute: purge OTP keys missing TTL (expired ones self-expire)
 *  2. autoCancelUnpaidOrders  — every 5 minutes: cancel PENDING_PAYMENT orders older than the timeout
 *  3. sendReminderNotifications — hourly: payment reminders + abandoned-cart nudges
 *  4. generateDailyReport     — 00:05 daily: aggregate yesterday into DailyReport
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Redis TTL already expires OTP keys; this sweeps any key that lost its TTL (e.g. after manual writes). */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanExpiredOtps() {
    if (!this.redis.isAvailable()) return;
    try {
      const keys = await this.redis.scanKeys('otp:*');
      let purged = 0;
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          await this.redis.del(key);
          purged++;
        }
      }
      if (purged > 0) {
        this.logger.log(`OTP cleanup: purged ${purged} dangling key(s)`);
      }
    } catch (error) {
      this.logger.warn(`OTP cleanup failed: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoCancelUnpaidOrders() {
    const timeoutMinutes =
      this.config.get<number>('app.order.paymentTimeoutMinutes') ?? 15;
    const threshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    try {
      const stale = await this.prisma.order.findMany({
        where: { status: 'PENDING_PAYMENT', createdAt: { lt: threshold } },
        select: { id: true },
        take: 50,
      });
      for (const order of stale) {
        await this.orders.cancelAndRestock(order.id, 'پرداخت انجام نشد (لغو خودکار)');
      }
      if (stale.length) {
        this.logger.log(`Auto-cancelled ${stale.length} unpaid order(s)`);
      }
    } catch (error) {
      this.logger.error(`Auto-cancel job failed: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendReminderNotifications() {
    try {
      // 1) Payment reminders: unpaid orders older than 5 minutes without a reminder yet
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const unpaid = await this.prisma.order.findMany({
        where: { status: 'PENDING_PAYMENT', createdAt: { lt: fiveMinutesAgo }, reminderSentAt: null },
        take: 50,
      });
      for (const order of unpaid) {
        await this.notifications.notify({
          userId: order.userId,
          title: 'یادآوری پرداخت ⏰',
          body: 'سفارش شما هنوز پرداخت نشده است؛ تا لغو خودکار، فرصت محدود است.',
          type: 'PAYMENT',
          data: { orderId: order.id },
        });
        await this.prisma.order.update({
          where: { id: order.id },
          data: { reminderSentAt: new Date() },
        });
      }

      // 2) Abandoned-cart nudge: carts with items untouched for >24h (at most once per day per user)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const carts = await this.prisma.cart.findMany({
        where: { updatedAt: { lt: oneDayAgo }, items: { some: {} } },
        include: { items: { take: 1 } },
        take: 50,
      });
      for (const cart of carts) {
        const flagKey = `flags:cart-reminder:${cart.userId}`;
        try {
          const alreadySent = await this.redis.get(flagKey);
          if (alreadySent) continue;
          await this.notifications.notify({
            userId: cart.userId,
            title: 'سبد خرید شما منتظر است 🛒',
            body: `${cart.items.length} کالا در سبد شماست؛ قبل از اتمام موجودی خرید را تکمیل کنید.`,
            type: 'PROMO',
          });
          await this.redis.set(flagKey, '1', 24 * 60 * 60);
        } catch {
          /* Redis optional */
        }
      }
      if (unpaid.length || carts.length) {
        this.logger.log(
          `Reminders sent: ${unpaid.length} payment, ${carts.length} abandoned-cart`,
        );
      }
    } catch (error) {
      this.logger.error(`Reminder job failed: ${(error as Error).message}`);
    }
  }

  @Cron('5 0 * * *') // 00:05 every day
  async generateDailyReport() {
    try {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const inRange = { gte: start, lt: end };

      const [orders, paidOrders, paidAgg, newUsers, newSellers] = await this.prisma.$transaction([
        this.prisma.order.count({ where: { createdAt: inRange } }),
        this.prisma.order.count({
          where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, paidAt: inRange },
        }),
        this.prisma.orderItem.aggregate({
          _sum: { totalPrice: true, commissionAmount: true },
          where: { order: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, paidAt: inRange } },
        }),
        this.prisma.user.count({ where: { createdAt: inRange } }),
        this.prisma.seller.count({ where: { createdAt: inRange } }),
      ]);

      await this.prisma.dailyReport.upsert({
        where: { date: start },
        create: {
          date: start,
          ordersCount: orders,
          paidOrdersCount: paidOrders,
          revenue: paidAgg._sum.totalPrice ?? 0,
          commission: paidAgg._sum.commissionAmount ?? 0,
          newUsers,
          newSellers,
        },
        update: {
          ordersCount: orders,
          paidOrdersCount: paidOrders,
          revenue: paidAgg._sum.totalPrice ?? 0,
          commission: paidAgg._sum.commissionAmount ?? 0,
          newUsers,
          newSellers,
        },
      });
      this.logger.log(`Daily report generated for ${start.toISOString().slice(0, 10)}`);
    } catch (error) {
      this.logger.error(`Daily report job failed: ${(error as Error).message}`);
    }
  }
}
