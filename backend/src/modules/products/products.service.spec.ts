import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';

const mockCategories = { collectIds: jest.fn() };

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let redis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      category: { findUnique: jest.fn() },
      seller: { findUnique: jest.fn() },
      $transaction: jest.fn(async (arg: any) =>
        Array.isArray(arg) ? Promise.all(arg) : arg({}),
      ),
    };
    redis = { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn().mockResolvedValue(null) };
    service = new ProductsService(prisma, redis, mockCategories as any);
  });

  it('serves cached listing without touching the database', async () => {
    const cached = { data: [{ id: 'p1' }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
    redis.getJson.mockResolvedValue(cached);
    const query = Object.assign(new ProductQueryDto(), { q: 'غذا' });

    const result = await service.findAll(query);

    expect(result).toBe(cached);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it('applies search, category tree, price range and sort filters', async () => {
    mockCategories.collectIds.mockResolvedValue(['cat-parent', 'cat-child']);
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.$transaction.mockResolvedValue([0, []]);
    const query = Object.assign(new ProductQueryDto(), {
      q: 'رویال',
      category: 'dog',
      shop: 'demo-shop',
      minPrice: 1000,
      maxPrice: 50000,
      sort: 'price_asc' as const,
      page: 2,
      limit: 10,
    });

    const result = await service.findAll(query);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          categoryId: { in: ['cat-parent', 'cat-child'] },
          price: { gte: 1000, lte: 50000 },
          seller: { shopSlug: 'demo-shop' },
          OR: [{ title: { contains: 'رویال' } }, { description: { contains: 'رویال' } }],
        }),
        orderBy: { price: 'asc' },
        skip: 10,
        take: 10,
      }),
    );
    expect(result.meta.page).toBe(2);
    expect(redis.setJson).toHaveBeenCalled(); // page cached for 60s
  });

  it('works when Redis is down (no cache reads/writes)', async () => {
    redis.getJson.mockRejectedValue(new Error('ECONNREFUSED'));
    redis.setJson.mockRejectedValue(new Error('ECONNREFUSED'));
    prisma.$transaction.mockResolvedValue([0, []]);

    const result = await service.findAll(new ProductQueryDto());
    expect(result.data).toEqual([]);
  });

  it('blocks product creation from unapproved sellers', async () => {
    prisma.seller.findUnique.mockResolvedValue({ id: 's1', status: 'PENDING' });
    await expect(
      service.create('user1', {
        title: 'کالا',
        categoryId: 'cat-1',
        description: 'توضیحات',
        price: 10000,
        stock: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('throws 404 for unknown product slug', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
