import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            seller: { select: { shopName: true, shopSlug: true } },
          },
        },
      },
    });
    return items.map((i) => ({
      id: i.id,
      addedAt: i.createdAt,
      product: {
        id: i.product.id,
        title: i.product.title,
        slug: i.product.slug,
        price: Number(i.product.price),
        compareAtPrice:
          i.product.compareAtPrice != null ? Number(i.product.compareAtPrice) : null,
        stock: i.product.stock,
        status: i.product.status,
        ratingAvg: Number(i.product.ratingAvg),
        ratingCount: i.product.ratingCount,
        imageUrl: i.product.images[0]?.url ?? null,
        seller: i.product.seller,
      },
    }));
  }

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException('محصول یافت نشد');
    }
    await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { message: 'به علاقه‌مندی‌ها اضافه شد' };
  }

  async remove(userId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return { message: 'از علاقه‌مندی‌ها حذف شد' };
  }
}
