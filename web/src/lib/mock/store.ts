/**
 * In-memory mutable state for the mock API (cart, orders, profile edits…).
 * Survives client navigations; resets on full page reload.
 * Server Components get a fresh process copy — catalog reads are pure from seed.
 */

import type {
  Address,
  AdminSeller,
  AdminUser,
  BannerItem,
  Cart,
  CartItem,
  Order,
  OrderStatus,
  ProductDetail,
  SellerProfile,
  SupportTicket,
  User,
} from '../types';
import {
  ADMIN_SELLERS,
  ADMIN_USERS,
  BANNER_ITEMS,
  DEFAULT_ADDRESSES,
  DEMO_SELLER,
  PRODUCTS,
  SHIPPING_FEE_IRR,
  TICKETS,
  USERS,
  toCard,
} from './data';

function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export interface MockSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface MockDb {
  products: ProductDetail[];
  users: User[];
  adminUsers: AdminUser[];
  sellers: SellerProfile[];
  adminSellers: AdminSeller[];
  banners: BannerItem[];
  tickets: SupportTicket[];
  /** userId → addresses */
  addresses: Record<string, Address[]>;
  /** userId → cart items */
  carts: Record<string, CartItem[]>;
  /** userId → orders */
  orders: Record<string, Order[]>;
  /** accessToken → userId */
  sessions: Record<string, string>;
  /** phone → pending otp */
  otps: Record<string, { code: string; expiresAt: number }>;
}

function buildInitial(): MockDb {
  const products = clone(PRODUCTS);
  const users = clone(USERS);
  const addresses: Record<string, Address[]> = {
    [USERS[2].id]: clone(DEFAULT_ADDRESSES),
    [USERS[0].id]: clone(DEFAULT_ADDRESSES).map((a) => ({
      ...a,
      id: uid('addr'),
      receiverName: USERS[0].fullName ?? 'مدیر',
      receiverPhone: USERS[0].phone,
    })),
    [USERS[1].id]: clone(DEFAULT_ADDRESSES).map((a) => ({
      ...a,
      id: uid('addr'),
      receiverName: USERS[1].fullName ?? 'فروشنده',
      receiverPhone: USERS[1].phone,
    })),
  };

  // Seed a couple of past orders for the demo customer
  const customerId = USERS[2].id;
  const p1 = products[0];
  const p2 = products[3];
  const seedOrders: Order[] = [
    {
      id: 'ord-seed-paid-001',
      status: 'SHIPPED',
      subtotal: p1.price + p2.price,
      shippingFee: SHIPPING_FEE_IRR,
      total: p1.price + p2.price + SHIPPING_FEE_IRR,
      paidAt: '2026-08-18T10:00:00.000Z',
      createdAt: '2026-08-18T09:45:00.000Z',
      cancelReason: null,
      items: [
        {
          id: 'oi-1',
          title: p1.title,
          quantity: 1,
          unitPrice: p1.price,
          totalPrice: p1.price,
        },
        {
          id: 'oi-2',
          title: p2.title,
          quantity: 1,
          unitPrice: p2.price,
          totalPrice: p2.price,
        },
      ],
      payment: {
        id: 'pay-1',
        status: 'VERIFIED',
        refId: '48291037',
        amount: p1.price + p2.price + SHIPPING_FEE_IRR,
      },
    },
    {
      id: 'ord-seed-pending-002',
      status: 'PENDING_PAYMENT',
      subtotal: products[1].price * 2,
      shippingFee: SHIPPING_FEE_IRR,
      total: products[1].price * 2 + SHIPPING_FEE_IRR,
      paidAt: null,
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      cancelReason: null,
      items: [
        {
          id: 'oi-3',
          title: products[1].title,
          quantity: 2,
          unitPrice: products[1].price,
          totalPrice: products[1].price * 2,
        },
      ],
      payment: {
        id: 'pay-2',
        status: 'PENDING',
        refId: null,
        amount: products[1].price * 2 + SHIPPING_FEE_IRR,
      },
    },
  ];

  return {
    products,
    users,
    adminUsers: clone(ADMIN_USERS),
    sellers: [clone(DEMO_SELLER)],
    adminSellers: clone(ADMIN_SELLERS),
    banners: clone(BANNER_ITEMS),
    tickets: clone(TICKETS),
    addresses,
    carts: {},
    orders: { [customerId]: seedOrders },
    sessions: {},
    otps: {},
  };
}

/** Singleton for the browser; on the server each module evaluation is fine for reads. */
const g = globalThis as typeof globalThis & { __petsMockDb?: MockDb };
export function db(): MockDb {
  if (!g.__petsMockDb) g.__petsMockDb = buildInitial();
  return g.__petsMockDb;
}

export function resetMockDb() {
  g.__petsMockDb = buildInitial();
}

// ─── helpers ───────────────────────────────────────────────────────────────

export function userById(id: string): User | undefined {
  return db().users.find((u) => u.id === id);
}

export function userByPhone(phone: string): User | undefined {
  return db().users.find((u) => u.phone === phone);
}

export function userFromAuth(authHeader?: string | null): User | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const userId = db().sessions[token];
  if (!userId) return null;
  return userById(userId) ?? null;
}

export function createSession(user: User): MockSession {
  const accessToken = `mock-access-${user.id}-${uid('t')}`;
  const refreshToken = `mock-refresh-${user.id}-${uid('r')}`;
  db().sessions[accessToken] = user.id;
  db().sessions[refreshToken] = user.id;
  return { accessToken, refreshToken, userId: user.id };
}

export function ensureUser(phone: string): User {
  let user = userByPhone(phone);
  if (user) return user;
  user = {
    id: uid('user'),
    phone,
    email: null,
    fullName: null,
    avatarUrl: null,
    role: 'CUSTOMER',
  };
  db().users.push(user);
  db().adminUsers.push({
    id: user.id,
    phone: user.phone,
    email: null,
    fullName: null,
    role: 'CUSTOMER',
    isActive: true,
    createdAt: new Date().toISOString(),
    ordersCount: 0,
  });
  db().addresses[user.id] = [];
  return user;
}

export function getCart(userId: string): Cart {
  const items = db().carts[userId] ?? [];
  // refresh availability / line totals from live product stock
  const refreshed = items.map((item) => {
    const product = db().products.find((p) => p.id === item.productId);
    if (!product) {
      return { ...item, available: false, lineTotal: 0 };
    }
    const available = product.stock >= item.quantity && product.status === 'ACTIVE';
    return {
      ...item,
      available,
      lineTotal: product.price * item.quantity,
      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        imageUrl: product.images[0]?.url ?? null,
      },
    };
  });
  db().carts[userId] = refreshed;
  return {
    id: `cart-${userId}`,
    items: refreshed,
    itemCount: refreshed.reduce((s, i) => s + i.quantity, 0),
    subtotal: refreshed.reduce((s, i) => s + i.lineTotal, 0),
  };
}

export function addToCart(userId: string, productId: string, quantity: number): Cart {
  const product = db().products.find((p) => p.id === productId && p.status === 'ACTIVE');
  if (!product) throw mockError(404, 'محصول یافت نشد');
  if (product.stock < quantity) throw mockError(400, 'موجودی کافی نیست');

  const items = db().carts[userId] ?? [];
  const existing = items.find((i) => i.productId === productId);
  if (existing) {
    const nextQty = existing.quantity + quantity;
    if (product.stock < nextQty) throw mockError(400, 'موجودی کافی نیست');
    existing.quantity = nextQty;
  } else {
    items.push({
      id: uid('ci'),
      productId,
      quantity,
      lineTotal: product.price * quantity,
      available: true,
      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        imageUrl: product.images[0]?.url ?? null,
      },
    });
  }
  db().carts[userId] = items;
  return getCart(userId);
}

export function updateCartItem(userId: string, itemId: string, quantity: number): Cart {
  const items = db().carts[userId] ?? [];
  const item = items.find((i) => i.id === itemId);
  if (!item) throw mockError(404, 'آیتم سبد یافت نشد');
  if (quantity <= 0) {
    db().carts[userId] = items.filter((i) => i.id !== itemId);
    return getCart(userId);
  }
  const product = db().products.find((p) => p.id === item.productId);
  if (!product || product.stock < quantity) throw mockError(400, 'موجودی کافی نیست');
  item.quantity = quantity;
  return getCart(userId);
}

export function removeCartItem(userId: string, itemId: string): Cart {
  db().carts[userId] = (db().carts[userId] ?? []).filter((i) => i.id !== itemId);
  return getCart(userId);
}

export function checkout(userId: string, addressId: string): Order {
  const addresses = db().addresses[userId] ?? [];
  if (!addresses.find((a) => a.id === addressId)) throw mockError(400, 'آدرس معتبر نیست');

  const cart = getCart(userId);
  if (cart.items.length === 0) throw mockError(400, 'سبد خرید خالی است');
  if (cart.items.some((i) => !i.available)) throw mockError(400, 'برخی کالاها موجود نیستند');

  // decrement stock
  for (const item of cart.items) {
    const product = db().products.find((p) => p.id === item.productId)!;
    if (product.stock < item.quantity) throw mockError(400, 'موجودی کافی نیست');
    product.stock -= item.quantity;
  }

  const order: Order = {
    id: uid('ord'),
    status: 'PENDING_PAYMENT',
    subtotal: cart.subtotal,
    shippingFee: SHIPPING_FEE_IRR,
    total: cart.subtotal + SHIPPING_FEE_IRR,
    paidAt: null,
    createdAt: new Date().toISOString(),
    cancelReason: null,
    items: cart.items.map((i) => ({
      id: uid('oi'),
      title: i.product.title,
      quantity: i.quantity,
      unitPrice: i.product.price,
      totalPrice: i.lineTotal,
    })),
    payment: {
      id: uid('pay'),
      status: 'PENDING',
      refId: null,
      amount: cart.subtotal + SHIPPING_FEE_IRR,
    },
  };

  if (!db().orders[userId]) db().orders[userId] = [];
  db().orders[userId].unshift(order);
  db().carts[userId] = [];
  return order;
}

export function markOrderPaid(orderId: string): Order | null {
  for (const userId of Object.keys(db().orders)) {
    const order = db().orders[userId].find((o) => o.id === orderId);
    if (!order) continue;
    if (order.status === 'PENDING_PAYMENT') {
      order.status = 'PAID';
      order.paidAt = new Date().toISOString();
      if (order.payment) {
        order.payment.status = 'VERIFIED';
        order.payment.refId = String(Math.floor(10000000 + Math.random() * 89999999));
      }
      // bump sold counts
      for (const item of order.items) {
        const product = db().products.find((p) => p.title === item.title);
        if (product) product.soldCount += item.quantity;
      }
    }
    return order;
  }
  return null;
}

export function cancelOrder(userId: string, orderId: string): Order {
  const order = (db().orders[userId] ?? []).find((o) => o.id === orderId);
  if (!order) throw mockError(404, 'سفارش یافت نشد');
  if (order.status !== 'PENDING_PAYMENT') throw mockError(400, 'فقط سفارش‌های در انتظار پرداخت قابل لغو هستند');
  order.status = 'CANCELLED';
  order.cancelReason = 'لغو توسط کاربر';
  // restock
  for (const item of order.items) {
    const product = db().products.find((p) => p.title === item.title);
    if (product) product.stock += item.quantity;
  }
  return order;
}

export function sellerForUser(userId: string): SellerProfile | undefined {
  return db().sellers.find((s) => s.userId === userId);
}

export function publicProducts(): ProductDetail[] {
  return db().products.filter((p) => p.status === 'ACTIVE');
}

export function listProductsQuery(searchParams: URLSearchParams) {
  let list = publicProducts();
  const q = searchParams.get('q')?.trim();
  const category = searchParams.get('category')?.trim();
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '16', 10) || 16));

  if (q) {
    const lower = q.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.category.name.includes(q),
    );
  }
  if (category) {
    list = list.filter(
      (p) =>
        p.category.slug === category ||
        // parent slug match via known tree: dog → dog-food etc.
        p.category.slug.startsWith(category + '-') ||
        categoryStartsWithParent(p.category.slug, category),
    );
  }

  list = [...list].sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'best_selling':
        return b.soldCount - a.soldCount;
      case 'newest':
      default:
        return b.soldCount - a.soldCount || b.ratingAvg - a.ratingAvg;
    }
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit).map(toCard);
  return { data, meta: { total, page, limit, totalPages } };
}

function categoryStartsWithParent(slug: string, parent: string): boolean {
  // e.g. parent "dog" matches "dog-food"
  return slug === parent || slug.startsWith(`${parent}-`);
}

export function productBySlug(slug: string): ProductDetail | undefined {
  return publicProducts().find((p) => p.slug === slug) ?? db().products.find((p) => p.slug === slug && p.status === 'ACTIVE');
}

export function productById(id: string): ProductDetail | undefined {
  return db().products.find((p) => p.id === id);
}

export function sellerStats(sellerId: string) {
  const mine = db().products.filter((p) => p.seller.id === sellerId);
  const allOrders = Object.values(db().orders).flat();
  const paidStatuses: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  let paidOrderItems = 0;
  let unitsSold = 0;
  let revenueIrr = 0;
  let pendingFulfillment = 0;
  const recentSales: {
    id: string;
    title: string;
    quantity: number;
    sellerAmount: number;
    order: { id: string; status: string; createdAt: string };
  }[] = [];

  for (const order of allOrders) {
    for (const item of order.items) {
      const belongs = mine.some((p) => p.title === item.title);
      if (!belongs) continue;
      const sellerAmount = Math.round(item.totalPrice * 0.95);
      if (paidStatuses.includes(order.status)) {
        paidOrderItems += 1;
        unitsSold += item.quantity;
        revenueIrr += sellerAmount;
      }
      if (order.status === 'PAID' || order.status === 'PROCESSING') pendingFulfillment += 1;
      recentSales.push({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        sellerAmount,
        order: { id: order.id, status: order.status, createdAt: order.createdAt },
      });
    }
  }

  recentSales.sort((a, b) => +new Date(b.order.createdAt) - +new Date(a.order.createdAt));

  return {
    totalProducts: mine.length,
    activeProducts: mine.filter((p) => p.status === 'ACTIVE').length,
    outOfStock: mine.filter((p) => p.stock <= 0).length,
    paidOrderItems,
    unitsSold,
    revenueIrr,
    pendingFulfillment,
    recentSales: recentSales.slice(0, 8),
  };
}

export function salesSeries(days: number) {
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    // fake but stable-looking daily revenue
    const seed = (i * 17 + days) % 11;
    const units = seed % 5;
    const revenue = units * (800_000 + seed * 120_000);
    series.push({
      date: `${y}/${m}/${day}`,
      revenue,
      units,
      orderItems: units,
    });
  }
  return series;
}

export function mockError(status: number, message: string): MockHttpError {
  return new MockHttpError(status, message);
}

export class MockHttpError extends Error {
  status: number;
  body: { message: string; statusCode: number };
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.body = { message, statusCode: status };
  }
}
