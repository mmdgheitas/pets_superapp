import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }
    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            seller: { select: { shopName: true, shopSlug: true, status: true } },
          },
        },
      },
      orderBy: { product: { createdAt: 'desc' } },
    });

    let subtotal = 0;
    const mapped = items.map((item) => {
      const price = Number(item.product.price);
      const active = item.product.status === 'ACTIVE';
      const available = active && item.product.stock >= item.quantity;
      const lineTotal = price * item.quantity;
      if (available) subtotal += lineTotal;
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          title: item.product.title,
          slug: item.product.slug,
          price,
          stock: item.product.stock,
          status: item.product.status,
          imageUrl: item.product.images[0]?.url ?? null,
          seller: item.product.seller,
        },
        lineTotal,
        available,
      };
    });

    return {
      id: cart.id,
      items: mapped,
      itemCount: mapped.reduce((acc, i) => acc + i.quantity, 0),
      subtotal,
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException('محصول یافت نشد یا فعال نیست');
    }
    if (product.stock < 1) {
      throw new BadRequestException('موجودی این کالا به پایان رسیده است');
    }
    const cart = await this.getOrCreateCart(userId);
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    const newQuantity = (existing?.quantity ?? 0) + quantity;
    if (newQuantity > product.stock) {
      throw new BadRequestException(`حداکثر موجودی این کالا ${product.stock} عدد است`);
    }
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: newQuantity },
    });
    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: true },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('آیتم سبد خرید یافت نشد');
    }
    if (quantity > item.product.stock) {
      throw new BadRequestException(`حداکثر موجودی این کالا ${item.product.stock} عدد است`);
    }
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('آیتم سبد خرید یافت نشد');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCart(userId);
  }
}
