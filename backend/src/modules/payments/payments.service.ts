import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { paginate, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ZarinpalService } from './zarinpal.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly zarinpal: ZarinpalService,
    private readonly orders: OrdersService,
  ) {}

  /** Creates (or reuses) a payment intent and returns the gateway redirect URL. */
  async requestPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, user: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('سفارش یافت نشد');
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('این سفارش قابل پرداخت نیست');
    }

    // Reuse an existing initiated payment if the gateway authority is still valid
    if (order.payment && order.payment.status === 'INITIATED' && order.payment.authority) {
      const ageMs = Date.now() - order.payment.createdAt.getTime();
      if (ageMs < 30 * 60 * 1000) {
        return {
          paymentId: order.payment.id,
          authority: order.payment.authority,
          paymentUrl: this.buildStartPayUrl(order.payment.authority),
        };
      }
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: 'FAILED' },
      });
    }

    const amountIrr = Number(order.total);
    const apiPublicUrl = this.config.get<string>('app.apiPublicUrl');
    const callbackUrl = `${apiPublicUrl}/api/v1/payments/callback`;

    const { authority, startPayUrl } = await this.zarinpal.requestPayment({
      amountIrr,
      description: `پرداخت سفارش ${order.id.slice(0, 8)} فروشگاه حیوانات خانگی`,
      callbackUrl,
      mobile: order.user.phone,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amount: amountIrr,
        gateway: 'ZARINPAL',
        status: 'INITIATED',
        authority,
        description: `سفارش ${order.id}`,
      },
    });

    return { paymentId: payment.id, authority, paymentUrl: startPayUrl };
  }

  /**
   * Gateway callback (browser redirect). Verifies the payment and, on success,
   * flags the order as PAID (atomically + idempotently). Returns a redirect URL for the web app.
   */
  async handleCallback(authority: string, status: string): Promise<string> {
    const webAppUrl = this.config.get<string>('app.webAppUrl') ?? 'http://localhost:3001';
    const fail = (reason: string, orderId?: string) =>
      `${webAppUrl}/payment/result?status=failed&reason=${encodeURIComponent(reason)}${orderId ? `&order=${orderId}` : ''}`;

    const payment = await this.prisma.payment.findFirst({
      where: { authority },
      include: { order: true },
    });
    if (!payment) {
      this.logger.warn(`Callback for unknown authority=${authority}`);
      return fail('تراکنش یافت نشد');
    }
    const orderId = payment.orderId;

    if (payment.status === 'SUCCESS') {
      return `${webAppUrl}/payment/result?status=success&order=${orderId}`;
    }
    if (status !== 'OK') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return fail('پرداخت توسط کاربر لغو شد', orderId);
    }

    const verification = await this.zarinpal.verifyPayment({
      authority,
      amountIrr: Number(payment.amount),
    });
    if (!verification.success) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return fail('تأیید تراکنش ناموفق بود', orderId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          refId: verification.refId,
          verifiedAt: new Date(),
        },
      });
    });
    await this.orders.markPaid(orderId, verification.refId);

    return `${webAppUrl}/payment/result?status=success&order=${orderId}${
      verification.refId ? `&ref=${verification.refId}` : ''
    }`;
  }

  /** Buyer's payment history. */
  async myPayments(userId: string, query: PaginationQueryDto) {
    const where = { order: { userId } };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { order: { select: { id: true, status: true } } },
      }),
    ]);
    return paginate(
      items.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderStatus: p.order.status,
        amount: Number(p.amount),
        gateway: p.gateway,
        status: p.status,
        refId: p.refId,
        createdAt: p.createdAt,
        verifiedAt: p.verifiedAt,
      })),
      total,
      query,
    );
  }

  /** Commission split report for the admin panel (paid orders only, computed from item snapshots). */
  async commissionReport(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where = {
      order: {
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as OrderStatus[] },
        paidAt: { gte: since },
      },
    };
    const agg = await this.prisma.orderItem.aggregate({
      _sum: { totalPrice: true, commissionAmount: true, sellerAmount: true },
      where,
    });
    const bySeller = await this.prisma.orderItem.groupBy({
      by: ['sellerId'],
      _sum: { totalPrice: true, commissionAmount: true, sellerAmount: true },
      where,
    });
    const sellers = await this.prisma.seller.findMany({
      where: { id: { in: bySeller.map((b) => b.sellerId) } },
      select: { id: true, shopName: true, shopSlug: true },
    });

    return {
      days,
      grossSales: Number(agg._sum.totalPrice ?? 0),
      platformCommission: Number(agg._sum.commissionAmount ?? 0),
      sellersPayout: Number(agg._sum.sellerAmount ?? 0),
      bySeller: bySeller.map((b) => ({
        seller: sellers.find((s) => s.id === b.sellerId) ?? { id: b.sellerId },
        grossSales: Number(b._sum.totalPrice ?? 0),
        commission: Number(b._sum.commissionAmount ?? 0),
        payout: Number(b._sum.sellerAmount ?? 0),
      })),
    };
  }

  private buildStartPayUrl(authority: string): string {
    const sandbox = this.config.get<boolean>('app.zarinpal.sandbox') !== false;
    const mock = this.config.get<boolean>('app.zarinpal.mock') === true;
    if (mock) {
      const apiPublicUrl = this.config.get<string>('app.apiPublicUrl');
      return `${apiPublicUrl}/api/v1/payments/callback?Authority=${authority}&Status=OK`;
    }
    return sandbox
      ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
      : `https://payment.zarinpal.com/pg/StartPay/${authority}`;
  }
}
