import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** One review per user per product (upsert). Product aggregate rating is recomputed in the same tx. */
  async upsert(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException('محصول یافت نشد');
    }

    const review = await this.prisma.review.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, rating: dto.rating, comment: dto.comment },
      update: { rating: dto.rating, comment: dto.comment },
    });

    const agg = await this.prisma.review.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
      where: { productId, isApproved: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100,
        ratingCount: agg._count._all,
      },
    });

    return review;
  }

  async listForProduct(productId: string, query: PaginationQueryDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    const where = { productId, isApproved: true };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { user: { select: { fullName: true, avatarUrl: true } } },
      }),
    ]);
    return paginate(items, total, query);
  }

  async moderate(id: string, isApproved: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('دیدگاه یافت نشد');
    const updated = await this.prisma.review.update({ where: { id }, data: { isApproved } });

    const agg = await this.prisma.review.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
      where: { productId: review.productId, isApproved: true },
    });
    await this.prisma.product.update({
      where: { id: review.productId },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100,
        ratingCount: agg._count._all,
      },
    });
    return updated;
  }
}
