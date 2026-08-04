import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public category tree (active categories only, 2 levels). */
  async tree() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
    return categories.filter((c) => !c.parentId);
  }

  async adminList() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { children: true },
    });
  }

  async bySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: { where: { isActive: true } }, parent: true },
    });
    if (!category || !category.isActive) throw new NotFoundException('دسته‌بندی یافت نشد');
    return category;
  }

  /** Returns the category id plus all of its (active) children ids — used for filtering. */
  async collectIds(slugOrId: string): Promise<string[]> {
    const category = await this.prisma.category.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }], isActive: true },
      include: { children: { select: { id: true } } },
    });
    if (!category) throw new NotFoundException('دسته‌بندی یافت نشد');
    return [category.id, ...category.children.map((c) => c.id)];
  }

  async create(dto: CreateCategoryDto) {
    await this.ensureSlugFree(dto.slug);
    if (dto.parentId) await this.assertParent(dto.parentId);
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('دسته‌بندی یافت نشد');
    if (dto.slug !== existing.slug) await this.ensureSlugFree(dto.slug);
    if (dto.parentId) await this.assertParent(dto.parentId, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const [products, children] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { categoryId: id } }),
      this.prisma.category.count({ where: { parentId: id } }),
    ]);
    if (products > 0 || children > 0) {
      throw new BadRequestException(
        'این دسته‌بندی دارای محصول یا زیردسته است؛ ابتدا آن‌ها را منتقل کنید',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'دسته‌بندی حذف شد' };
  }

  private async ensureSlugFree(slug: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('این اسلاگ قبلاً استفاده شده است');
  }

  private async assertParent(parentId: string, selfId?: string) {
    if (selfId && parentId === selfId) {
      throw new BadRequestException('دسته‌بندی نمی‌تواند والد خودش باشد');
    }
    const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('دسته‌بندی والد یافت نشد');
    if (parent.parentId) {
      throw new BadRequestException('حداکثر عمق درخت دسته‌بندی دو سطح است');
    }
  }
}
