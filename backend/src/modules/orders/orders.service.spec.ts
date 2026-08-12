import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

const mockNotifications = { notify: jest.fn().mockResolvedValue({}) };
const mockMail = { send: jest.fn().mockResolvedValue(undefined) };

const configValues: Record<string, unknown> = {
  'app.commission.defaultRate': 5,
  'app.order.shippingFee': 1000,
  'app.order.paymentTimeoutMinutes': 15,
};
const mockConfig = { get: jest.fn((key: string) => configValues[key]) };

describe('OrdersService.checkout', () => {
  let service: OrdersService;
  let prisma: any;

  const address = {
    id: 'addr1',
    userId: 'user1',
    province: 'تهران',
    city: 'تهران',
    addressLine: 'خیابان تست',
    postalCode: null,
    receiverName: 'علی',
    receiverPhone: '09121112233',
  };

  const cartWith = (items: any[]) => ({
    id: 'cart1',
    items,
  });

  const product = (over: any) => ({
    id: 'p1',
    title: 'غذای سگ',
    status: 'ACTIVE',
    price: '100000',
    stock: 5,
    sellerId: 'seller1',
    seller: { id: 'seller1', userId: 'seller-user-1', commissionRate: null },
    ...over,
  });

  const item = (productP: any, quantity: number) => ({
    id: `item-${productP.id}`,
    cartId: 'cart1',
    productId: productP.id,
    quantity,
    product: productP,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      address: { findUnique: jest.fn() },
      cart: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: any) => any) => fn(txMock)),
      order: { findUnique: jest.fn() },
    };
    txMock = {
      product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() },
      order: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'order1',
          ...data,
          items: data.items?.create ?? [],
        })),
      },
      cartItem: { deleteMany: jest.fn() },
    };
    service = new OrdersService(prisma, mockConfig as any, mockNotifications as any, mockMail as any);
  });

  let txMock: any;

  it('computes totals and per-item commission (custom seller rate or default)', async () => {
    const pDefault = product({ id: 'p1', price: '100000' }); // default 5%
    const pCustom = product({
      id: 'p2',
      title: 'غذای گربه',
      price: '50000',
      sellerId: 'seller2',
      seller: { id: 'seller2', userId: 'seller-user-2', commissionRate: '10' },
    });

    prisma.address.findUnique.mockResolvedValue(address);
    prisma.cart.findUnique.mockResolvedValue(
      cartWith([item(pDefault, 2), item(pCustom, 1)]),
    );

    const order = await service.checkout('user1', 'addr1');
    const data = txMock.order.create.mock.calls[0][0].data;

    // subtotal = 2×100000 + 1×50000, shipping = 1000
    expect(data.subtotal).toBe(250000);
    expect(data.total).toBe(251000);

    // commission: item 1 → 200000×5% = 10000 (seller 190000)
    //             item 2 →  50000×10% =  5000 (seller  45000)
    expect(data.items.create).toEqual([
      expect.objectContaining({ commissionRate: 5, commissionAmount: 10000, sellerAmount: 190000 }),
      expect.objectContaining({ commissionRate: 10, commissionAmount: 5000, sellerAmount: 45000 }),
    ]);

    // stock reserved atomically for both items
    expect(txMock.product.updateMany).toHaveBeenCalledTimes(2);
    expect(txMock.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1', stock: { gte: 2 } } }),
    );
    // cart emptied
    expect(txMock.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart1' } });
    // buyer notified
    expect(mockNotifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user1', type: 'ORDER' }),
    );
    expect(order.id).toBe('order1');
  });

  it('rejects checkout with another user\u2019s address', async () => {
    prisma.address.findUnique.mockResolvedValue({ ...address, userId: 'someone-else' });
    await expect(service.checkout('user1', 'addr1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects checkout on an empty cart', async () => {
    prisma.address.findUnique.mockResolvedValue(address);
    prisma.cart.findUnique.mockResolvedValue(cartWith([]));
    await expect(service.checkout('user1', 'addr1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects checkout when stock is insufficient', async () => {
    prisma.address.findUnique.mockResolvedValue(address);
    prisma.cart.findUnique.mockResolvedValue(cartWith([item(product({ stock: 1 }), 3)]));
    await expect(service.checkout('user1', 'addr1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rolls back when atomic stock reservation fails mid-transaction', async () => {
    prisma.address.findUnique.mockResolvedValue(address);
    prisma.cart.findUnique.mockResolvedValue(
      cartWith([item(product({ id: 'p1', stock: 10 }), 2), item(product({ id: 'p2', stock: 10 }), 1)]),
    );
    txMock.product.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 }); // second product sold out meanwhile
    // prisma.$transaction helper rethrows — simulating rollback
    prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => fn(txMock));
    await expect(service.checkout('user1', 'addr1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancelAndRestock restores inventory and cancels the order', async () => {
    const order = {
      id: 'order1',
      userId: 'user1',
      status: 'PENDING_PAYMENT',
      items: [{ productId: 'p1', quantity: 2 }],
    };
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue(order),
        update: jest.fn().mockResolvedValue({ ...order, status: 'CANCELLED', items: order.items }),
      },
      product: { update: jest.fn() },
      payment: { updateMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn: (t: any) => any) => fn(tx));

    const result = await service.cancelAndRestock('order1', 'auto-cancel');
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stock: { increment: 2 } },
    });
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }),
    );
    expect(result?.status).toBe('CANCELLED');
  });
});
