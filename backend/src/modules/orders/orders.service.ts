import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { paginate, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../notifications/mail.service';

export const PAID_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  /**
   * Checkout: creates the order from the cart in a single transaction.
   * - prices are re-read from the DB (never trust the client)
   * - stock is decremented atomically (fails if a product ran out)
   * - commission is snapshot per item (seller rate or platform default)
   */
  async checkout(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('آدرس تحویل یافت نشد');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: { include: { seller: true } } },
        },
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سبد خرید شما خالی است');
    }

    for (const item of cart.items) {
      if (item.product.status !== 'ACTIVE') {
        throw new BadRequestException(`کالای «${item.product.title}» دیگر فعال نیست`);
      }
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `موجودی کالای «${item.product.title}» کافی نیست (موجودی: ${item.product.stock})`,
        );
      }
    }

    const defaultRate = this.config.get<number>('app.commission.defaultRate') ?? 5;
    const shippingFee = this.config.get<number>('app.order.shippingFee') ?? 0;

    const lineItems = cart.items.map((item) => {
      const unitPrice = Number(item.product.price);
      const totalPrice = unitPrice * item.quantity;
      const sellerRate = item.product.seller?.commissionRate;
      const commissionRate = sellerRate != null ? Number(sellerRate) : defaultRate;
      const commissionAmount = Math.round((totalPrice * commissionRate) / 100);
      return {
        productId: item.productId,
        sellerId: item.product.sellerId,
        title: item.product.title,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        commissionRate,
        commissionAmount,
        sellerAmount: totalPrice - commissionAmount,
      };
    });

    const subtotal = lineItems.reduce((acc, l) => acc + l.totalPrice, 0);
    const total = subtotal + shippingFee;

    const order = await this.prisma.$transaction(async (tx) => {
      // Atomic stock reservations — one failed update rolls everything back
      for (const item of cart.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new BadRequestException(
            `موجودی کالای «${item.product.title}» هم‌اکنون تغییر کرد؛ سبد را بازبینی کنید`,
          );
        }
      }

      const created = await tx.order.create({
        data: {
          userId,
          subtotal,
          shippingFee,
          total,
          shippingAddress: {
            province: address.province,
            city: address.city,
            addressLine: address.addressLine,
            postalCode: address.postalCode,
            receiverName: address.receiverName,
            receiverPhone: address.receiverPhone,
          } as Prisma.InputJsonValue,
          items: { create: lineItems },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    await this.notifications.notify({
      userId,
      title: 'سفارش ثبت شد',
      body: `سفارش شما به مبلغ ${total.toLocaleString('fa-IR')} ریال ثبت شد؛ تا ۱۵ دقیقه فرصت پرداخت دارید.`,
      type: 'ORDER',
      data: { orderId: order.id },
    });

    return this.toResponse(order, order.items);
  }

  async myOrders(userId: string, status: OrderStatus | undefined, query: PaginationQueryDto) {
    const where: Prisma.OrderWhereInput = { userId, ...(status ? { status } : {}) };
    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { items: true, payment: true },
      }),
    ]);
    return paginate(
      orders.map((o) => this.toResponse(o, o.items, o.payment)),
      total,
      query,
    );
  }

  async myOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('سفارش یافت نشد');
    }
    return this.toResponse(order, order.items, order.payment);
  }

  /** Buyer cancels an unpaid order; stock is restored. */
  async cancel(userId: string, orderId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('سفارش یافت نشد');
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('فقط سفارش‌های پرداخت‌نشده قابل لغو هستند');
    }
    return this.cancelAndRestock(order.id, reason ?? 'لغو توسط خریدار');
  }

  /** Shared by user cancel + the scheduled auto-cancel job. */
  async cancelAndRestock(orderId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || order.status !== 'PENDING_PAYMENT') return null;

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.payment.updateMany({
        where: { orderId, status: 'INITIATED' },
        data: { status: 'FAILED' },
      });
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
        include: { items: true, payment: true },
      });

      await this.notifications.notify({
        userId: order.userId,
        title: 'سفارش لغو شد',
        body: `سفارش شما لغو شد؛ علت: ${reason}`,
        type: 'ORDER',
        data: { orderId },
      }).catch((e) => this.logger.warn(`notify failed: ${(e as Error).message}`));

      return this.toResponse(updated, updated.items, updated.payment);
    });
  }

  /** Called by PaymentsService after gateway verification succeeds. */
  async markPaid(orderId: string, refId?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, user: true },
      });
      if (!order || order.status !== 'PENDING_PAYMENT') return null;

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.quantity } },
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID', paidAt: new Date() },
        include: { items: { include: { seller: true } }, user: true },
      });
    });
    if (!result) return null;

    const adrs = result.shippingAddress as Record<string, string> | null;
    await this.notifications.notify({
      userId: result.userId,
      title: 'پرداخت موفق 🎉',
      body: `سفارش شما با موفقیت پرداخت شد${refId ? ` (کد رهگیری: ${refId})` : ''}.`,
      type: 'PAYMENT',
      data: { orderId },
    });
    await this.mail.send(
      result.user.email,
      'تأیید پرداخت سفارش',
      `سفارش ${result.id} با موفقیت پرداخت شد.\nگیرنده: ${adrs?.receiverName ?? ''}\nمبلغ: ${Number(result.total).toLocaleString('fa-IR')} ریال`,
    );

    // Notify each involved seller
    const sellerUserIds = new Map<string, string[]>();
    for (const item of result.items) {
      const list = sellerUserIds.get(item.seller.userId) ?? [];
      list.push(item.title);
      sellerUserIds.set(item.seller.userId, list);
    }
    for (const [sellerUserId, titles] of sellerUserIds) {
      await this.notifications.notify({
        userId: sellerUserId,
        title: 'سفارش جدید 🛒',
        body: `سفارش جدیدی برای «${titles.join('», «')}» ثبت شد؛ لطفاً آماده‌سازی کنید.`,
        type: 'ORDER',
        data: { orderId },
      }).catch((e) => this.logger.warn(`seller notify failed: ${(e as Error).message}`));
    }
    return result;
  }

  // ---------------------------------------------------------------- response

  private toResponse(order: any, items: any[], payment?: any) {
    return {
      id: order.id,
      status: order.status,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      total: Number(order.total),
      shippingAddress: order.shippingAddress,
      cancelReason: order.cancelReason,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      items: (items ?? []).map((i) => ({
        id: i.id,
        productId: i.productId,
        title: i.title,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            gateway: payment.gateway,
            refId: payment.refId,
            amount: Number(payment.amount),
          }
        : undefined,
    };
  }
}
