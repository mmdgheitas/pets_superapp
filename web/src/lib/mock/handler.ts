/**
 * Path-based mock REST handler mirroring NestJS `/api/v1/*` endpoints used by the web app.
 */

import {
  BANNER_ITEMS,
  BANNERS,
  CATEGORIES,
  DAILY_REPORTS,
  DEMO_OTP,
  flattenCategories,
  toCard,
} from './data';
import {
  MockHttpError,
  addToCart,
  cancelOrder,
  checkout,
  createSession,
  db,
  ensureUser,
  getCart,
  listProductsQuery,
  markOrderPaid,
  mockError,
  productById,
  productBySlug,
  publicProducts,
  removeCartItem,
  salesSeries,
  sellerForUser,
  sellerStats,
  updateCartItem,
  userFromAuth,
  type MockSession,
} from './store';
import type { ProductDetail, SellerProfile, User } from '../types';

export type MockResult = { status: number; data: unknown };

function ok(data: unknown, status = 200): MockResult {
  return { status, data };
}

function parseBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as Record<string, unknown>;
  return {};
}

function requireUser(auth?: string | null): User {
  const user = userFromAuth(auth);
  if (!user) throw mockError(401, 'لطفاً وارد شوید');
  return user;
}

function requireAdmin(auth?: string | null): User {
  const user = requireUser(auth);
  if (user.role !== 'ADMIN') throw mockError(403, 'دسترسی مجاز نیست');
  return user;
}

function requireSeller(auth?: string | null): { user: User; seller: SellerProfile } {
  const user = requireUser(auth);
  const seller = sellerForUser(user.id);
  if (!seller || user.role !== 'SELLER') throw mockError(403, 'فروشنده نیستید');
  return { user, seller };
}

function match(path: string, pattern: string): Record<string, string> | null {
  const pp = pattern.split('/').filter(Boolean);
  const ap = path.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(ap[i]);
    else if (pp[i] !== ap[i]) return null;
  }
  return params;
}

function slugify(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]+/g, '')
      .slice(0, 60) || `product-${Date.now()}`
  );
}

/**
 * @param method HTTP method
 * @param path path after `/api/v1` (may include query string)
 * @param body request body
 * @param auth Authorization header value
 */
export async function handleMockRequest(
  method: string,
  pathWithQuery: string,
  body?: unknown,
  auth?: string | null,
): Promise<MockResult> {
  // Simulate a tiny network delay on the client for realism
  if (typeof window !== 'undefined') {
    await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));
  }

  const m = method.toUpperCase();
  const qIndex = pathWithQuery.indexOf('?');
  const path = (qIndex >= 0 ? pathWithQuery.slice(0, qIndex) : pathWithQuery).replace(/\/+$/, '') || '/';
  const qs = new URLSearchParams(qIndex >= 0 ? pathWithQuery.slice(qIndex + 1) : '');
  const data = parseBody(body);

  try {
    // ── Auth ────────────────────────────────────────────────────────────
    if (m === 'POST' && path === '/auth/otp/request') {
      const phone = String(data.phone ?? '');
      if (!/^09\d{9}$/.test(phone)) throw mockError(400, 'شماره موبایل معتبر نیست');
      db().otps[phone] = { code: DEMO_OTP, expiresAt: Date.now() + 120_000 };
      return ok({ expiresIn: 120, devCode: DEMO_OTP });
    }

    if (m === 'POST' && path === '/auth/otp/verify') {
      const phone = String(data.phone ?? '');
      const code = String(data.code ?? '');
      const pending = db().otps[phone];
      if (!pending || pending.code !== code || pending.expiresAt < Date.now()) {
        throw mockError(400, 'کد واردشده صحیح نیست');
      }
      delete db().otps[phone];
      const user = ensureUser(phone);
      const session = createSession(user);
      return ok({ accessToken: session.accessToken, refreshToken: session.refreshToken, user });
    }

    if (m === 'POST' && path === '/auth/refresh') {
      const refreshToken = String(data.refreshToken ?? '');
      const userId = db().sessions[refreshToken];
      if (!userId) throw mockError(401, 'نشست منقضی شده');
      const user = db().users.find((u) => u.id === userId);
      if (!user) throw mockError(401, 'کاربر یافت نشد');
      const session = createSession(user);
      return ok({ accessToken: session.accessToken, refreshToken: session.refreshToken, user });
    }

    if (m === 'POST' && path === '/auth/logout') {
      return ok({ ok: true });
    }

    if (m === 'GET' && path === '/auth/me') {
      return ok(requireUser(auth));
    }

    // ── Public catalog ──────────────────────────────────────────────────
    if (m === 'GET' && path === '/banners') {
      return ok(BANNERS);
    }

    if (m === 'GET' && path === '/categories') {
      return ok(CATEGORIES);
    }

    if (m === 'GET' && path === '/products/featured') {
      const featured = [...publicProducts()]
        .sort((a, b) => b.soldCount - a.soldCount)
        .slice(0, 8)
        .map(toCard);
      return ok(featured);
    }

    if (m === 'GET' && path === '/products/mine') {
      const { seller } = requireSeller(auth);
      const mine = db().products.filter((p) => p.seller.id === seller.id).map(toCard);
      return ok(mine);
    }

    {
      const p = match(path, '/products/mine/:id');
      if (m === 'GET' && p) {
        const { seller } = requireSeller(auth);
        const product = productById(p.id);
        if (!product || product.seller.id !== seller.id) throw mockError(404, 'محصول یافت نشد');
        return ok(product);
      }
    }

    if (m === 'GET' && path === '/products') {
      return ok(listProductsQuery(qs));
    }

    {
      const p = match(path, '/products/:slug');
      if (m === 'GET' && p && p.slug !== 'mine') {
        // avoid clashing with /products/mine
        const product = productBySlug(p.slug) ?? productById(p.slug);
        if (!product || product.status !== 'ACTIVE') throw mockError(404, 'محصول یافت نشد');
        return ok(product);
      }
    }

    if (m === 'POST' && path === '/products') {
      const { user, seller } = requireSeller(auth);
      if (seller.status !== 'APPROVED') throw mockError(403, 'فروشگاه تأیید نشده است');
      const title = String(data.title ?? '');
      const categoryId = String(data.categoryId ?? '');
      const cat = flattenCategories().find((c) => c.id === categoryId);
      if (!cat) throw mockError(400, 'دسته‌بندی معتبر نیست');
      const images = Array.isArray(data.images)
        ? (data.images as string[]).map((url, i) => ({ id: `img-${Date.now()}-${i}`, url, sortOrder: i }))
        : [];
      const product: ProductDetail = {
        id: `p-${Date.now().toString(36)}`,
        title,
        slug: slugify(title) + '-' + Date.now().toString(36).slice(-4),
        price: Number(data.price) || 0,
        compareAtPrice: data.compareAtPrice != null ? Number(data.compareAtPrice) : null,
        stock: Number(data.stock) || 0,
        ratingAvg: 0,
        ratingCount: 0,
        soldCount: 0,
        status: (data.status as string) === 'DRAFT' ? 'DRAFT' : 'ACTIVE',
        description: String(data.description ?? ''),
        attributes: null,
        images,
        category: { id: cat.id, name: cat.name, slug: cat.slug },
        seller: {
          id: seller.id,
          shopName: seller.shopName,
          shopSlug: seller.shopSlug,
          ratingAvg: seller.ratingAvg,
        },
        reviews: [],
      };
      db().products.unshift(product);
      void user;
      return ok(toCard(product), 201);
    }

    {
      const p = match(path, '/products/:id');
      if (m === 'PATCH' && p) {
        const { seller } = requireSeller(auth);
        const product = productById(p.id);
        if (!product || product.seller.id !== seller.id) throw mockError(404, 'محصول یافت نشد');
        if (data.title != null) product.title = String(data.title);
        if (data.description != null) product.description = String(data.description);
        if (data.price != null) product.price = Number(data.price);
        if (data.compareAtPrice !== undefined) {
          product.compareAtPrice = data.compareAtPrice == null ? null : Number(data.compareAtPrice);
        }
        if (data.stock != null) product.stock = Number(data.stock);
        if (data.status != null) product.status = String(data.status);
        if (data.categoryId != null) {
          const cat = flattenCategories().find((c) => c.id === String(data.categoryId));
          if (cat) product.category = { id: cat.id, name: cat.name, slug: cat.slug };
        }
        if (Array.isArray(data.images)) {
          product.images = (data.images as string[]).map((url, i) => ({
            id: `img-${Date.now()}-${i}`,
            url,
            sortOrder: i,
          }));
        }
        return ok(toCard(product));
      }
      if (m === 'DELETE' && p) {
        const { seller } = requireSeller(auth);
        const product = productById(p.id);
        if (!product || product.seller.id !== seller.id) throw mockError(404, 'محصول یافت نشد');
        product.status = 'INACTIVE';
        return ok({ ok: true });
      }
    }

    // ── Cart ────────────────────────────────────────────────────────────
    if (m === 'GET' && path === '/cart') {
      const user = requireUser(auth);
      return ok(getCart(user.id));
    }

    if (m === 'POST' && path === '/cart/items') {
      const user = requireUser(auth);
      return ok(addToCart(user.id, String(data.productId), Number(data.quantity) || 1));
    }

    {
      const p = match(path, '/cart/items/:id');
      if (m === 'PATCH' && p) {
        const user = requireUser(auth);
        return ok(updateCartItem(user.id, p.id, Number(data.quantity)));
      }
      if (m === 'DELETE' && p) {
        const user = requireUser(auth);
        return ok(removeCartItem(user.id, p.id));
      }
    }

    // ── Users / addresses ───────────────────────────────────────────────
    if (m === 'GET' && path === '/users/me') {
      return ok(requireUser(auth));
    }

    if (m === 'PATCH' && path === '/users/me') {
      const user = requireUser(auth);
      if (data.fullName != null) user.fullName = String(data.fullName);
      if (data.email != null) user.email = String(data.email);
      const adminRow = db().adminUsers.find((u) => u.id === user.id);
      if (adminRow) {
        adminRow.fullName = user.fullName;
        adminRow.email = user.email;
      }
      return ok(user);
    }

    if (m === 'GET' && path === '/users/me/addresses') {
      const user = requireUser(auth);
      return ok(db().addresses[user.id] ?? []);
    }

    if (m === 'POST' && path === '/users/me/addresses') {
      const user = requireUser(auth);
      const list = db().addresses[user.id] ?? [];
      const addr = {
        id: `addr-${Date.now().toString(36)}`,
        title: data.title ? String(data.title) : null,
        province: String(data.province ?? ''),
        city: String(data.city ?? ''),
        addressLine: String(data.addressLine ?? ''),
        receiverName: String(data.receiverName ?? ''),
        receiverPhone: String(data.receiverPhone ?? ''),
        isDefault: list.length === 0,
      };
      list.push(addr);
      db().addresses[user.id] = list;
      return ok(addr, 201);
    }

    {
      const p = match(path, '/users/me/addresses/:id/default');
      if (m === 'POST' && p) {
        const user = requireUser(auth);
        const list = db().addresses[user.id] ?? [];
        for (const a of list) a.isDefault = a.id === p.id;
        return ok({ ok: true });
      }
    }

    // ── Orders & payments ───────────────────────────────────────────────
    if (m === 'POST' && path === '/orders/checkout') {
      const user = requireUser(auth);
      return ok(checkout(user.id, String(data.addressId)), 201);
    }

    if (m === 'GET' && path === '/orders') {
      const user = requireUser(auth);
      const all = db().orders[user.id] ?? [];
      const limit = Math.min(50, parseInt(qs.get('limit') ?? '20', 10) || 20);
      const page = Math.max(1, parseInt(qs.get('page') ?? '1', 10) || 1);
      const total = all.length;
      const start = (page - 1) * limit;
      return ok({
        data: all.slice(start, start + limit),
        meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    }

    {
      const p = match(path, '/orders/:id/cancel');
      if (m === 'POST' && p) {
        const user = requireUser(auth);
        return ok(cancelOrder(user.id, p.id));
      }
    }

    {
      const p = match(path, '/payments/orders/:id/request');
      if (m === 'POST' && p) {
        requireUser(auth);
        // In mock mode, "gateway" is just the local payment result page.
        // Auto-mark paid so the money loop completes offline.
        const order = markOrderPaid(p.id);
        if (!order) throw mockError(404, 'سفارش یافت نشد');
        const ref = order.payment?.refId ?? '0';
        const paymentUrl = `/payment/result?status=success&order=${encodeURIComponent(order.id)}&ref=${encodeURIComponent(ref)}`;
        return ok({ paymentUrl, authority: `mock-${order.id}` });
      }
    }

    // ── Sellers ─────────────────────────────────────────────────────────
    if (m === 'POST' && path === '/sellers/register') {
      const user = requireUser(auth);
      if (sellerForUser(user.id)) throw mockError(400, 'قبلاً ثبت‌نام کرده‌اید');
      const shopName = String(data.shopName ?? '').trim();
      if (shopName.length < 2) throw mockError(400, 'نام فروشگاه معتبر نیست');
      const seller: SellerProfile = {
        id: `sel-${Date.now().toString(36)}`,
        userId: user.id,
        shopName,
        shopSlug: slugify(shopName) || `shop-${Date.now()}`,
        bio: data.bio ? String(data.bio) : null,
        logoUrl: null,
        nationalId: data.nationalId ? String(data.nationalId) : null,
        status: 'PENDING',
        commissionRate: 5,
        ratingAvg: 0,
        verifiedAt: null,
        rejectReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db().sellers.push(seller);
      user.role = 'SELLER';
      const adminUser = db().adminUsers.find((u) => u.id === user.id);
      if (adminUser) adminUser.role = 'SELLER';
      db().adminSellers.push({
        ...seller,
        productsCount: 0,
        user: { phone: user.phone, fullName: user.fullName },
      });
      return ok(seller, 201);
    }

    if (m === 'GET' && path === '/sellers/me') {
      const user = requireUser(auth);
      const seller = sellerForUser(user.id);
      if (!seller) throw mockError(403, 'فروشنده نیستید');
      return ok(seller);
    }

    if (m === 'GET' && path === '/sellers/me/dashboard') {
      const { seller } = requireSeller(auth);
      const stats = sellerStats(seller.id);
      const { recentSales, ...rest } = stats;
      return ok({ seller, stats: rest, recentSales });
    }

    if (m === 'GET' && path.startsWith('/sellers/me/sales-report')) {
      requireSeller(auth);
      const days = Math.min(90, parseInt(qs.get('days') ?? '30', 10) || 30);
      return ok({
        sellerId: sellerForUser(requireUser(auth).id)?.id,
        days,
        series: salesSeries(days),
      });
    }

    // ── Upload (mock) ───────────────────────────────────────────────────
    if (m === 'POST' && (path === '/upload/images' || path === '/upload/image')) {
      requireUser(auth);
      // Return placeholder CDN URLs — no real upload
      const placeholders = [
        {
          key: `mock/${Date.now()}.jpg`,
          url: `https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=800&fit=crop&t=${Date.now()}`,
        },
      ];
      return ok(path === '/upload/image' ? placeholders[0] : placeholders);
    }

    // ── Admin ───────────────────────────────────────────────────────────
    if (m === 'GET' && path === '/admin/dashboard') {
      requireAdmin(auth);
      const openTickets = db().tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
      return ok({
        users: {
          total: db().adminUsers.length,
          customers: db().adminUsers.filter((u) => u.role === 'CUSTOMER').length,
        },
        sellers: {
          PENDING: db().adminSellers.filter((s) => s.status === 'PENDING').length,
          APPROVED: db().adminSellers.filter((s) => s.status === 'APPROVED').length,
        },
        products: {
          ACTIVE: db().products.filter((p) => p.status === 'ACTIVE').length,
          DRAFT: db().products.filter((p) => p.status === 'DRAFT').length,
        },
        orders: {
          today: Object.values(db().orders).flat().length,
          revenueToday: DAILY_REPORTS[0]?.revenue ?? 0,
        },
        tickets: { open: openTickets },
      });
    }

    if (m === 'GET' && path === '/admin/users') {
      requireAdmin(auth);
      let list = [...db().adminUsers];
      const q = qs.get('q')?.trim();
      const role = qs.get('role');
      if (q) {
        const lower = q.toLowerCase();
        list = list.filter(
          (u) =>
            u.phone.includes(q) ||
            (u.fullName ?? '').toLowerCase().includes(lower) ||
            (u.email ?? '').toLowerCase().includes(lower),
        );
      }
      if (role) list = list.filter((u) => u.role === role);
      const page = Math.max(1, parseInt(qs.get('page') ?? '1', 10) || 1);
      const limit = Math.min(50, parseInt(qs.get('limit') ?? '20', 10) || 20);
      const total = list.length;
      const start = (page - 1) * limit;
      return ok({
        data: list.slice(start, start + limit),
        meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    }

    {
      const p = match(path, '/admin/users/:id/active');
      if (m === 'PATCH' && p) {
        requireAdmin(auth);
        const row = db().adminUsers.find((u) => u.id === p.id);
        if (!row) throw mockError(404, 'کاربر یافت نشد');
        row.isActive = Boolean(data.isActive);
        return ok(row);
      }
    }

    if (m === 'GET' && path === '/admin/sellers') {
      requireAdmin(auth);
      let list = [...db().adminSellers];
      const status = qs.get('status');
      if (status) list = list.filter((s) => s.status === status);
      const page = Math.max(1, parseInt(qs.get('page') ?? '1', 10) || 1);
      const limit = Math.min(50, parseInt(qs.get('limit') ?? '20', 10) || 20);
      const total = list.length;
      const start = (page - 1) * limit;
      return ok({
        data: list.slice(start, start + limit),
        meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    }

    {
      const p = match(path, '/admin/sellers/:id/approve');
      if (m === 'POST' && p) {
        requireAdmin(auth);
        const row = db().adminSellers.find((s) => s.id === p.id);
        const seller = db().sellers.find((s) => s.id === p.id);
        if (!row) throw mockError(404, 'فروشنده یافت نشد');
        row.status = 'APPROVED';
        row.verifiedAt = new Date().toISOString();
        row.rejectReason = null;
        if (seller) {
          seller.status = 'APPROVED';
          seller.verifiedAt = row.verifiedAt;
          seller.rejectReason = null;
        }
        return ok(row);
      }
    }

    {
      const p = match(path, '/admin/sellers/:id/reject');
      if (m === 'POST' && p) {
        requireAdmin(auth);
        const row = db().adminSellers.find((s) => s.id === p.id);
        const seller = db().sellers.find((s) => s.id === p.id);
        if (!row) throw mockError(404, 'فروشنده یافت نشد');
        const reason = String(data.reason ?? 'رد شده');
        row.status = 'REJECTED';
        row.rejectReason = reason;
        if (seller) {
          seller.status = 'REJECTED';
          seller.rejectReason = reason;
        }
        return ok(row);
      }
    }

    {
      const p = match(path, '/admin/sellers/:id/suspend');
      if (m === 'POST' && p) {
        requireAdmin(auth);
        const row = db().adminSellers.find((s) => s.id === p.id);
        const seller = db().sellers.find((s) => s.id === p.id);
        if (!row) throw mockError(404, 'فروشنده یافت نشد');
        row.status = 'SUSPENDED';
        if (seller) seller.status = 'SUSPENDED';
        return ok(row);
      }
    }

    if (m === 'GET' && path === '/admin/banners') {
      requireAdmin(auth);
      return ok(db().banners);
    }

    if (m === 'POST' && path === '/admin/banners') {
      requireAdmin(auth);
      const banner = {
        id: `ban-${Date.now().toString(36)}`,
        title: String(data.title ?? ''),
        imageUrl: String(data.imageUrl ?? ''),
        linkUrl: data.linkUrl ? String(data.linkUrl) : null,
        position: String(data.position ?? 'home_top'),
        sortOrder: Number(data.sortOrder) || 0,
        isActive: data.isActive !== false,
        startsAt: null,
        endsAt: null,
        createdAt: new Date().toISOString(),
      };
      db().banners.unshift(banner);
      return ok(banner, 201);
    }

    {
      const p = match(path, '/admin/banners/:id');
      if (m === 'PATCH' && p) {
        requireAdmin(auth);
        const banner = db().banners.find((b) => b.id === p.id);
        if (!banner) throw mockError(404, 'بنر یافت نشد');
        Object.assign(banner, {
          ...(data.title != null ? { title: String(data.title) } : {}),
          ...(data.imageUrl != null ? { imageUrl: String(data.imageUrl) } : {}),
          ...(data.linkUrl !== undefined ? { linkUrl: data.linkUrl ? String(data.linkUrl) : null } : {}),
          ...(data.position != null ? { position: String(data.position) } : {}),
          ...(data.sortOrder != null ? { sortOrder: Number(data.sortOrder) } : {}),
          ...(data.isActive != null ? { isActive: Boolean(data.isActive) } : {}),
        });
        return ok(banner);
      }
      if (m === 'DELETE' && p) {
        requireAdmin(auth);
        db().banners = db().banners.filter((b) => b.id !== p.id);
        return ok({ ok: true });
      }
    }

    if (m === 'GET' && path === '/admin/tickets') {
      requireAdmin(auth);
      let list = [...db().tickets];
      const status = qs.get('status');
      if (status) list = list.filter((t) => t.status === status);
      const page = Math.max(1, parseInt(qs.get('page') ?? '1', 10) || 1);
      const limit = Math.min(50, parseInt(qs.get('limit') ?? '20', 10) || 20);
      const total = list.length;
      const start = (page - 1) * limit;
      return ok({
        data: list.slice(start, start + limit),
        meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    }

    {
      const p = match(path, '/admin/tickets/:id/reply');
      if (m === 'POST' && p) {
        requireAdmin(auth);
        const ticket = db().tickets.find((t) => t.id === p.id);
        if (!ticket) throw mockError(404, 'تیکت یافت نشد');
        ticket.adminReply = String(data.reply ?? '');
        ticket.status = 'RESOLVED';
        ticket.updatedAt = new Date().toISOString();
        return ok(ticket);
      }
    }

    if (m === 'GET' && path === '/admin/reports/daily') {
      requireAdmin(auth);
      return ok(DAILY_REPORTS);
    }

    if (m === 'GET' && path === '/health') {
      return ok({ status: 'ok', mock: true });
    }

    throw mockError(404, `Mock endpoint not found: ${m} ${path}`);
  } catch (e) {
    if (e instanceof MockHttpError) {
      return { status: e.status, data: e.body };
    }
    throw e;
  }
}

export type { MockSession };
