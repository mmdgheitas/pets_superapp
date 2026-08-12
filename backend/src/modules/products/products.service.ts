import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';

const PRODUCT_CARD_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' as const }, take: 2 },
  category: { select: { id: true, name: true, slug: true } },
  seller: { select: { id: true, shopName: true, shopSlug: true, ratingAvg: true } },
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly categories: CategoriesService,
  ) {}

  // ------------------------------------------------------------ public read

  /** Product listing with filters/search/sort/pagination. Hot pages cached 60s in Redis. */
  async findAll(query: ProductQueryDto) {
    const cacheKey = `cache:products:${createHash('md5').update(JSON.stringify(query)).digest('hex')}`;
    try {
      const cached = await this.redis.getJson(cacheKey);
      if (cached) return cached;
    } catch {
      // cache misses or Redis being down must never break the listing
    }

    const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
      ];
    }
    if (query.category) {
      const ids = await this.categories.collectIds(query.category);
      where.categoryId = { in: ids };
    }
    if (query.shop) {
      where.seller = { shopSlug: query.shop };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }
    if (query.inStock) {
      where.stock = { gt: 0 };
    }

    const orderBy = this.sortToOrderBy(query.sort);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: PRODUCT_CARD_INCLUDE,
      }),
    ]);

    const result = paginate(
      items.map((p) => this.toCard(p)),
      total,
      query,
    );
    try {
      await this.redis.setJson(cacheKey, result, 60);
    } catch {
      /* Redis optional */
    }
    return result;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        ...PRODUCT_CARD_INCLUDE,
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
      },
    });

    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException('محصول یافت نشد');
    }
    return this.toCard(product, true);
  }

  /** [Seller/Admin] Full product detail by id, regardless of status — used to
   *  load a draft/inactive product for editing (the public findBySlug above
   *  deliberately only ever returns ACTIVE listings). */
  async findByIdForOwner(userId: string, role: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        ...PRODUCT_CARD_INCLUDE,
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    if (role !== 'ADMIN') {
      const seller = await this.prisma.seller.findUnique({ where: { userId } });
      if (!seller || product.sellerId !== seller.id) {
        throw new NotFoundException('محصول یافت نشد');
      }
    }
    return this.toCard(product, true);
  }

  /** Latest products for the home screen. */
  async featured() {
    const cacheKey = 'cache:products:featured';
    try {
      const cached = await this.redis.getJson(cacheKey);
      if (cached) return cached;
    } catch {
      /* optional */
    }
    const items = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', stock: { gt: 0 } },
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      include: PRODUCT_CARD_INCLUDE,
    });
    const result = items.map((p) => this.toCard(p));
    try {
      await this.redis.setJson(cacheKey, result, 60);
    } catch {
      /* optional */
    }
    return result;
  }

  // ------------------------------------------------------------- seller CRUD

  async sellerProducts(userId: string) {
    const seller = await this.assertSeller(userId);
    const products = await this.prisma.product.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      include: PRODUCT_CARD_INCLUDE,
    });
    return products.map((p) => this.toCard(p));
  }

  async create(userId: string, dto: CreateProductDto) {
    const seller = await this.assertSeller(userId);
    await this.assertCategory(dto.categoryId);
    const slug = await this.generateUniqueSlug(dto.title);

    return this.prisma.product.create({
      data: {
        sellerId: seller.id,
        categoryId: dto.categoryId,
        title: dto.title,
        slug,
        description: dto.description,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        stock: dto.stock,
        attributes: dto.attributes as Prisma.InputJsonValue,
        status: dto.status ?? 'ACTIVE', // sellers may publish directly or save as draft
        images: dto.images?.length
          ? { create: dto.images.map((url, i) => ({ url, sortOrder: i })) }
          : undefined,
      },
      include: PRODUCT_CARD_INCLUDE,
    });
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const seller = await this.assertSeller(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.sellerId !== seller.id) {
      throw new NotFoundException('محصول یافت نشد');
    }
    if (dto.categoryId) await this.assertCategory(dto.categoryId);

    const { images, ...scalar } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.productImage.createMany({
          data: images.map((url, i) => ({ productId, url, sortOrder: i })),
        });
      }
      return tx.product.update({
        where: { id: productId },
        data: { ...scalar, attributes: scalar.attributes as Prisma.InputJsonValue },
        include: PRODUCT_CARD_INCLUDE,
      });
    });
  }

  async remove(userId: string, productId: string) {
    const seller = await this.assertSeller(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product || product.sellerId !== seller.id) {
      throw new NotFoundException('محصول یافت نشد');
    }
    // Products referenced by orders are archived instead of hard-deleted (keeps history intact)
    if (product._count.orderItems > 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { status: 'INACTIVE' },
      });
      return { message: 'محصول به‌خاطر داشتن سابقه سفارش، غیرفعال شد' };
    }
    await this.prisma.product.delete({ where: { id: productId } });
    return { message: 'محصول حذف شد' };
  }

  // ------------------------------------------------------------------- admin

  async moderate(productId: string, status: ProductStatus) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    return this.prisma.product.update({ where: { id: productId }, data: { status } });
  }

  async adminList(status?: ProductStatus, page = 1, limit = 20) {
    const where: Prisma.ProductWhereInput = status ? { status } : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: PRODUCT_CARD_INCLUDE,
      }),
    ]);
    return paginate(
      items.map((p) => this.toCard(p)),
      total,
      { page, limit },
    );
  }

  // ------------------------------------------------------------------ helpers

  private async assertSeller(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new ForbiddenException('ابتدا باید به‌عنوان فروشنده ثبت‌نام کنید');
    }
    if (seller.status !== 'APPROVED') {
      throw new ForbiddenException('حساب فروشندگی شما هنوز تأیید نشده است');
    }
    return seller;
  }

  private async assertCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || !category.isActive) {
      throw new BadRequestException('دسته‌بندی معتبر نیست');
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9آ-ی]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'product';
    for (let i = 0; i < 5; i++) {
      const slug = `${base}-${randomBytes(3).toString('hex')}`;
      const exists = await this.prisma.product.findUnique({ where: { slug } });
      if (!exists) return slug;
    }
    return `${base}-${Date.now()}`;
  }

  private sortToOrderBy(sort?: ProductSort): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'best_selling':
        return { soldCount: 'desc' };
      case 'top_rated':
        return { ratingAvg: 'desc' };
      case 'oldest':
        return { createdAt: 'asc' };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  /** Normalises Prisma output (Decimal → number) for JSON responses. */
  private toCard(p: any, detailed = false) {
    return {
      ...p,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
      ratingAvg: Number(p.ratingAvg),
      seller: p.seller
        ? { ...p.seller, ratingAvg: Number((p.seller as any).ratingAvg ?? 0) }
        : undefined,
      ...(detailed
        ? {}
        : { description: undefined, attributes: undefined, reviews: undefined }),
    };
  }
}
