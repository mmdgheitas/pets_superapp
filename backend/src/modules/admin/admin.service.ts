import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  AdminPaymentsQueryDto,
  AdminUsersQueryDto,
  CreateBannerDto,
  TicketsQueryDto,
  UpdateBannerDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------------ metrics

  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      usersTotal,
      customersTotal,
      sellersPending,
      sellersApproved,
      productsActive,
      productsDraft,
      ordersToday,
      revenueToday,
      openTickets,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.seller.count({ where: { status: 'PENDING' } }),
      this.prisma.seller.count({ where: { status: 'APPROVED' } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { status: 'DRAFT' } }),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, paidAt: { gte: today } },
      }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    return {
      users: { total: usersTotal, customers: customersTotal },
      sellers: { PENDING: sellersPending, APPROVED: sellersApproved },
      products: { ACTIVE: productsActive, DRAFT: productsDraft },
      orders: { today: ordersToday, revenueToday: Number(revenueToday._sum.total ?? 0) },
      tickets: { open: openTickets },
    };
  }

  // -------------------------------------------------------------------- users

  async users(query: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.q
        ? {
            OR: [
              { phone: { contains: query.q } },
              { fullName: { contains: query.q } },
              { email: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        select: {
          id: true,
          phone: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
    ]);
    return paginate(
      items.map((u) => ({ ...u, ordersCount: u._count.orders, _count: undefined })),
      total,
      query,
    );
  }

  async setUserActive(id: string, isActive: boolean, adminId: string) {
    if (id === adminId && !isActive) {
      throw new NotFoundException('نمی‌توانید حساب خودتان را غیرفعال کنید');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, phone: true, isActive: true },
    });
  }

  // ------------------------------------------------------------------ sellers

  async sellers(query: { status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'; page: number; limit: number; skip: number }) {
    const where: Prisma.SellerWhereInput = query.status ? { status: query.status } : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.seller.count({ where }),
      this.prisma.seller.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: {
          user: { select: { phone: true, fullName: true } },
          _count: { select: { products: true } },
        },
      }),
    ]);
    const mapped = items.map((s) => ({
      ...s,
      commissionRate: Number(s.commissionRate),
      ratingAvg: Number(s.ratingAvg),
      productsCount: s._count.products,
      _count: undefined,
    }));
    return paginate(mapped, total, query);
  }

  async approveSeller(id: string, commissionRate?: number) {
    const seller = await this.prisma.seller.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException('فروشنده یافت نشد');
    const updated = await this.prisma.seller.update({
      where: { id },
      data: {
        status: 'APPROVED',
        verifiedAt: new Date(),
        rejectReason: null,
        ...(commissionRate !== undefined ? { commissionRate } : {}),
      },
    });
    await this.notifications.notify({
      userId: seller.userId,
      title: 'فروشگاه شما تأیید شد ✅',
      body: 'تبریک! حساب فروشندگی شما فعال شد و می‌توانید محصول ثبت کنید.',
      type: 'SYSTEM',
    });
    return updated;
  }

  async rejectSeller(id: string, reason: string) {
    const seller = await this.prisma.seller.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException('فروشنده یافت نشد');
    const updated = await this.prisma.seller.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: reason },
    });
    await this.notifications.notify({
      userId: seller.userId,
      title: 'درخواست فروشندگی رد شد',
      body: `علت: ${reason}`,
      type: 'SYSTEM',
    });
    return updated;
  }

  async suspendSeller(id: string) {
    const seller = await this.prisma.seller.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException('فروشنده یافت نشد');
    const [updated] = await this.prisma.$transaction([
      this.prisma.seller.update({ where: { id }, data: { status: 'SUSPENDED' } }),
      this.prisma.product.updateMany({ where: { sellerId: id }, data: { status: 'INACTIVE' } }),
    ]);
    return updated;
  }

  // ------------------------------------------------------------------ banners

  banners() {
    return this.prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
  }

  createBanner(dto: CreateBannerDto) {
    return this.prisma.banner.create({ data: dto });
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('بنر یافت نشد');
    return this.prisma.banner.update({ where: { id }, data: dto });
  }

  async deleteBanner(id: string) {
    await this.prisma.banner.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('بنر یافت نشد');
    });
    return { message: 'بنر حذف شد' };
  }

  /** Public: active banners for the storefront, respecting schedule windows. */
  async activeBanners(position?: string) {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        ...(position ? { position } : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // ------------------------------------------------------------------ payments

  async payments(query: AdminPaymentsQueryDto) {
    const where: Prisma.PaymentWhereInput = query.status ? { status: query.status } : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { order: { select: { id: true, user: { select: { phone: true } } } } },
      }),
    ]);
    return paginate(
      items.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        customerPhone: p.order.user.phone,
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

  async dailyReports(limit = 30) {
    return this.prisma.dailyReport.findMany({
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  // ------------------------------------------------------------------ tickets

  async tickets(query: TicketsQueryDto) {
    const where: Prisma.SupportTicketWhereInput = query.status ? { status: query.status } : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { user: { select: { phone: true, fullName: true } } },
      }),
    ]);
    return paginate(items, total, query);
  }

  async replyTicket(id: string, reply: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { adminReply: reply, status: 'RESOLVED' },
    });
    await this.notifications.notify({
      userId: ticket.userId,
      title: 'پاسخ پشتیبانی',
      body: reply.length > 90 ? `${reply.slice(0, 90)}…` : reply,
      type: 'SYSTEM',
    });
    return updated;
  }

  // Customer-facing ticket creation also lives here (shared prisma logic)
  async createTicket(userId: string, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: { userId, subject: dto.subject, message: dto.message },
    });
  }

  async myTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
