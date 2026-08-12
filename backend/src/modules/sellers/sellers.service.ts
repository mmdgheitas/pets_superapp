import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterSellerDto, UpdateSellerDto } from './dto/register-seller.dto';

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterSellerDto) {
    const existing = await this.prisma.seller.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('شما قبلاً به‌عنوان فروشنده ثبت‌نام کرده‌اید');
    }
    const shopSlug = await this.uniqueSlug(dto.shopName);

    const [seller] = await this.prisma.$transaction([
      this.prisma.seller.create({
        data: {
          userId,
          shopName: dto.shopName,
          shopSlug,
          bio: dto.bio,
          nationalId: dto.nationalId,
          status: 'PENDING',
        },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { role: 'SELLER' } }),
    ]);
    return seller;
  }

  async me(userId: string) {
    return this.assertSeller(userId);
  }

  async updateMe(userId: string, dto: UpdateSellerDto) {
    const seller = await this.assertSeller(userId);
    return this.prisma.seller.update({ where: { id: seller.id }, data: dto });
  }

  /** Seller dashboard: product counts + 30-day sales summary. */
  async dashboard(userId: string) {
    const seller = await this.assertSeller(userId);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalProducts, activeProducts, outOfStock, orderAgg, pendingOrders] =
      await this.prisma.$transaction([
        this.prisma.product.count({ where: { sellerId: seller.id } }),
        this.prisma.product.count({ where: { sellerId: seller.id, status: 'ACTIVE' } }),
        this.prisma.product.count({
          where: { sellerId: seller.id, status: 'ACTIVE', stock: { lte: 0 } },
        }),
        this.prisma.orderItem.aggregate({
          _sum: { sellerAmount: true, quantity: true },
          _count: { _all: true },
          where: {
            sellerId: seller.id,
            order: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
          },
        }),
        this.prisma.orderItem.count({
          where: { sellerId: seller.id, order: { status: 'PAID' } },
        }),
      ]);

    const recentItems = await this.prisma.orderItem.findMany({
      where: { sellerId: seller.id, order: { createdAt: { gte: since } } },
      orderBy: { order: { createdAt: 'desc' } },
      take: 10,
      include: {
        order: { select: { id: true, status: true, createdAt: true } },
      },
    });

    return {
      seller: this.toSafe(seller),
      stats: {
        totalProducts,
        activeProducts,
        outOfStock,
        paidOrderItems: orderAgg._count._all,
        unitsSold: orderAgg._sum.quantity ?? 0,
        revenueIrr: Number(orderAgg._sum.sellerAmount ?? 0),
        pendingFulfillment: pendingOrders,
      },
      recentSales: recentItems.map((i) => ({
        id: i.id,
        title: i.title,
        quantity: i.quantity,
        sellerAmount: Number(i.sellerAmount),
        order: i.order,
      })),
    };
  }

  /** Basic sales report grouped by day (last N days). */
  async salesReport(userId: string, days = 30) {
    const seller = await this.assertSeller(userId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const items = await this.prisma.orderItem.findMany({
      where: {
        sellerId: seller.id,
        order: {
          createdAt: { gte: since },
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
      include: { order: { select: { createdAt: true } } },
    });

    const byDay = new Map<string, { revenue: number; units: number; orderItems: number }>();
    for (const item of items) {
      const day = item.order.createdAt.toISOString().slice(0, 10);
      const entry = byDay.get(day) ?? { revenue: 0, units: 0, orderItems: 0 };
      entry.revenue += Number(item.sellerAmount);
      entry.units += item.quantity;
      entry.orderItems += 1;
      byDay.set(day, entry);
    }

    return {
      sellerId: seller.id,
      days,
      series: [...byDay.entries()]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /** Public shop profile. */
  async publicShop(shopSlug: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { shopSlug },
      include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    });
    if (!seller || seller.status !== 'APPROVED') {
      throw new NotFoundException('فروشگاه یافت نشد');
    }
    return {
      shopName: seller.shopName,
      shopSlug: seller.shopSlug,
      bio: seller.bio,
      logoUrl: seller.logoUrl,
      ratingAvg: Number(seller.ratingAvg),
      activeProducts: seller._count.products,
      createdAt: seller.createdAt,
    };
  }

  // ------------------------------------------------------------------ helpers

  async assertSeller(userId: string, { requireApproved = false } = {}) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new ForbiddenException('شما فروشنده نیستید؛ ابتدا ثبت‌نام فروشندگی انجام دهید');
    }
    if (seller.status === 'SUSPENDED') {
      throw new ForbiddenException('فروشگاه شما تعلیق شده است');
    }
    if (requireApproved && seller.status !== 'APPROVED') {
      throw new ForbiddenException('فروشگاه شما هنوز تأیید نشده است');
    }
    return seller;
  }

  private toSafe(seller: any) {
    return { ...seller, commissionRate: Number(seller.commissionRate), ratingAvg: Number(seller.ratingAvg) };
  }

  private async uniqueSlug(shopName: string): Promise<string> {
    const base =
      shopName
        .toLowerCase()
        .replace(/[^a-z0-9آ-ی]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'shop';
    for (let i = 0; i < 5; i++) {
      const slug = `${base}-${randomBytes(2).toString('hex')}`;
      const exists = await this.prisma.seller.findUnique({ where: { shopSlug: slug } });
      if (!exists) return slug;
    }
    return `${base}-${Date.now()}`;
  }
}
