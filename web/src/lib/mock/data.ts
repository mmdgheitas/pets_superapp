/**
 * Static seed catalog + demo accounts for offline / no-backend web demos.
 * Amounts are IRR (rials), matching the real API.
 */

import type {
  Address,
  AdminSeller,
  AdminUser,
  Banner,
  BannerItem,
  Category,
  DailyReport,
  ProductCard,
  ProductDetail,
  Review,
  SellerProfile,
  SupportTicket,
  User,
} from '../types';

/** Mock is ON unless explicitly disabled with NEXT_PUBLIC_USE_MOCK=false */
export const MOCK_ENABLED = (() => {
  const flag = process.env.NEXT_PUBLIC_USE_MOCK;
  if (flag === 'false' || flag === '0') return false;
  // true / 1 / unset → mock mode (so `npm run dev` works without the API)
  return true;
})();

export const DEMO_OTP = '12345';

export const USERS: User[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    phone: '09120000000',
    email: 'admin@petshop.ir',
    fullName: 'مدیر سیستم',
    avatarUrl: null,
    role: 'ADMIN',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    phone: '09121111111',
    email: 'seller@petshop.ir',
    fullName: 'فروشنده نمونه',
    avatarUrl: null,
    role: 'SELLER',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    phone: '09123333333',
    email: null,
    fullName: 'سارا محمدی',
    avatarUrl: null,
    role: 'CUSTOMER',
  },
];

export const DEMO_SELLER: SellerProfile = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: USERS[1].id,
  shopName: 'پت‌شاپ نمونه',
  shopSlug: 'demo-petshop',
  bio: 'فروشگاه نمایشی غذا و لوازم حیوانات خانگی',
  logoUrl: null,
  nationalId: '0012345678',
  status: 'APPROVED',
  commissionRate: 5,
  ratingAvg: 4.7,
  verifiedAt: '2025-06-01T10:00:00.000Z',
  rejectReason: null,
  createdAt: '2025-05-15T08:00:00.000Z',
  updatedAt: '2025-06-01T10:00:00.000Z',
};

const SELLER_SUMMARY = {
  id: DEMO_SELLER.id,
  shopName: DEMO_SELLER.shopName,
  shopSlug: DEMO_SELLER.shopSlug,
  ratingAvg: DEMO_SELLER.ratingAvg,
};

export const CATEGORIES: Category[] = [
  {
    id: 'c1000000-0000-4000-8000-000000000001',
    name: 'سگ',
    slug: 'dog',
    icon: '🐶',
    children: [
      { id: 'c1000000-0000-4000-8000-000000000011', name: 'غذای سگ', slug: 'dog-food', icon: null, children: [] },
      { id: 'c1000000-0000-4000-8000-000000000012', name: 'اسباب‌بازی سگ', slug: 'dog-toys', icon: null, children: [] },
      { id: 'c1000000-0000-4000-8000-000000000013', name: 'بهداشت سگ', slug: 'dog-care', icon: null, children: [] },
    ],
  },
  {
    id: 'c1000000-0000-4000-8000-000000000002',
    name: 'گربه',
    slug: 'cat',
    icon: '🐱',
    children: [
      { id: 'c1000000-0000-4000-8000-000000000021', name: 'غذای گربه', slug: 'cat-food', icon: null, children: [] },
      { id: 'c1000000-0000-4000-8000-000000000022', name: 'خاک گربه', slug: 'cat-litter', icon: null, children: [] },
      { id: 'c1000000-0000-4000-8000-000000000023', name: 'اسباب‌بازی گربه', slug: 'cat-toys', icon: null, children: [] },
    ],
  },
  {
    id: 'c1000000-0000-4000-8000-000000000003',
    name: 'پرنده',
    slug: 'bird',
    icon: '🐦',
    children: [
      { id: 'c1000000-0000-4000-8000-000000000031', name: 'غذای پرنده', slug: 'bird-food', icon: null, children: [] },
      { id: 'c1000000-0000-4000-8000-000000000032', name: 'قفس و لوازم', slug: 'bird-cage', icon: null, children: [] },
    ],
  },
  {
    id: 'c1000000-0000-4000-8000-000000000004',
    name: 'ماهی',
    slug: 'fish',
    icon: '🐟',
    children: [
      { id: 'c1000000-0000-4000-8000-000000000041', name: 'غذای ماهی', slug: 'fish-food', icon: null, children: [] },
      { id: 'c1000000-0000-4000-8000-000000000042', name: 'آکواریوم', slug: 'aquarium', icon: null, children: [] },
    ],
  },
];

/** Flat lookup for leaf + parent categories */
export function flattenCategories(cats: Category[] = CATEGORIES): Category[] {
  const out: Category[] = [];
  for (const c of cats) {
    out.push(c);
    if (c.children?.length) out.push(...flattenCategories(c.children));
  }
  return out;
}

function catRef(slug: string) {
  const c = flattenCategories().find((x) => x.slug === slug)!;
  return { id: c.id, name: c.name, slug: c.slug };
}

const reviewsFor = (items: Omit<Review, 'id'>[], prefix: string): Review[] =>
  items.map((r, i) => ({ ...r, id: `${prefix}-rev-${i + 1}` }));

export const PRODUCTS: ProductDetail[] = [
  {
    id: 'p1000000-0000-4000-8000-000000000001',
    title: 'غذای خشک رویال کنین مکسی ادالت ۱۵ کیلوگرم',
    slug: 'royal-canin-maxi-adult-15kg',
    price: 28_500_000,
    compareAtPrice: 32_000_000,
    stock: 12,
    ratingAvg: 4.8,
    ratingCount: 34,
    soldCount: 128,
    status: 'ACTIVE',
    description:
      'غذای کامل مخصوص سگ‌های نژاد بزرگ بالای ۱۵ ماه.\nحاوی پروتئین با کیفیت بالا برای حفظ توده عضلانی و حمایت از مفاصل.',
    attributes: { برند: 'Royal Canin', وزن: '۱۵ کیلوگرم', مناسب: 'سگ نژاد بزرگ' },
    images: [
      {
        id: 'img-1a',
        url: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
      {
        id: 'img-1b',
        url: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=800&h=800&fit=crop',
        sortOrder: 1,
      },
    ],
    category: catRef('dog-food'),
    seller: SELLER_SUMMARY,
    reviews: reviewsFor(
      [
        {
          rating: 5,
          comment: 'سگم خیلی دوست داره، کیفیت عالیه.',
          createdAt: '2026-07-10T12:00:00.000Z',
          user: { fullName: 'علی رضایی', avatarUrl: null },
        },
        {
          rating: 4,
          comment: 'قیمتش بالاست ولی ارزشش رو داره.',
          createdAt: '2026-06-22T09:30:00.000Z',
          user: { fullName: 'مریم احمدی', avatarUrl: null },
        },
      ],
      'p1',
    ),
  },
  {
    id: 'p1000000-0000-4000-8000-000000000002',
    title: 'غذای گربه ویسکاس با طعم مرغ ۱ کیلوگرم',
    slug: 'cat-food-whiskas-chicken-1kg',
    price: 3_200_000,
    compareAtPrice: null,
    stock: 40,
    ratingAvg: 4.5,
    ratingCount: 56,
    soldCount: 310,
    status: 'ACTIVE',
    description: 'غذای خشک گربه بالغ با طعم مرغ؛ غنی‌شده با ویتامین و مواد معدنی ضروری.',
    attributes: { برند: 'Whiskas', وزن: '۱ کیلوگرم', طعم: 'مرغ' },
    images: [
      {
        id: 'img-2a',
        url: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&h=800&fit=crop&sat=-20',
        sortOrder: 0,
      },
    ],
    category: catRef('cat-food'),
    seller: SELLER_SUMMARY,
    reviews: reviewsFor(
      [
        {
          rating: 5,
          comment: 'گربه‌ام کامل تموم می‌کنه.',
          createdAt: '2026-08-01T15:00:00.000Z',
          user: { fullName: 'نیلوفر', avatarUrl: null },
        },
      ],
      'p2',
    ),
  },
  {
    id: 'p1000000-0000-4000-8000-000000000003',
    title: 'خاک گربه بنتونیت آنتی‌باکتریال ۱۰ لیتر',
    slug: 'cat-litter-bentonite-10l',
    price: 1_450_000,
    compareAtPrice: null,
    stock: 60,
    ratingAvg: 4.3,
    ratingCount: 22,
    soldCount: 95,
    status: 'ACTIVE',
    description: 'خاک بهداشتی گربه با جذب بالای مایعات و کنترل بو؛ کم‌غبار و آنتی‌باکتریال.',
    attributes: { نوع: 'بنتونیت', حجم: '۱۰ لیتر' },
    images: [
      {
        id: 'img-3a',
        url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
    ],
    category: catRef('cat-litter'),
    seller: SELLER_SUMMARY,
    reviews: [],
  },
  {
    id: 'p1000000-0000-4000-8000-000000000004',
    title: 'اسباب‌بازی جویدنی طنابی سگ',
    slug: 'dog-chew-toy-rope',
    price: 380_000,
    compareAtPrice: 450_000,
    stock: 100,
    ratingAvg: 4.6,
    ratingCount: 41,
    soldCount: 220,
    status: 'ACTIVE',
    description: 'طناب جویدنی مقاوم برای بازی و تمیزکردن دندان‌های سگ. مناسب سایز متوسط تا بزرگ.',
    attributes: { جنس: 'پنبه', مناسب: 'سگ متوسط و بزرگ' },
    images: [
      {
        id: 'img-4a',
        url: 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
    ],
    category: catRef('dog-toys'),
    seller: SELLER_SUMMARY,
    reviews: reviewsFor(
      [
        {
          rating: 5,
          comment: 'خیلی مقاومه، سگم هنوز پاره نکرده!',
          createdAt: '2026-07-28T11:00:00.000Z',
          user: { fullName: 'حسین', avatarUrl: null },
        },
      ],
      'p4',
    ),
  },
  {
    id: 'p1000000-0000-4000-8000-000000000005',
    title: 'غذای خشک پرنده مخلوط دانه ۱ کیلو',
    slug: 'bird-seed-mix-1kg',
    price: 890_000,
    compareAtPrice: 990_000,
    stock: 35,
    ratingAvg: 4.2,
    ratingCount: 12,
    soldCount: 48,
    status: 'ACTIVE',
    description: 'ترکیب دانه‌های مغذی برای قناری، مرغ عشق و طوطی کوچک.',
    attributes: { وزن: '۱ کیلوگرم', مناسب: 'پرندگان زینتی' },
    images: [
      {
        id: 'img-5a',
        url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
    ],
    category: catRef('bird-food'),
    seller: SELLER_SUMMARY,
    reviews: [],
  },
  {
    id: 'p1000000-0000-4000-8000-000000000006',
    title: 'غذای پولکی ماهی گرمسیری ۲۵۰ گرم',
    slug: 'tropical-fish-flakes-250g',
    price: 520_000,
    compareAtPrice: null,
    stock: 80,
    ratingAvg: 4.4,
    ratingCount: 18,
    soldCount: 76,
    status: 'ACTIVE',
    description: 'غذای پولکی کامل برای ماهی‌های آب شیرین گرمسیری؛ رنگ‌دهی طبیعی.',
    attributes: { وزن: '۲۵۰ گرم', نوع: 'پولکی' },
    images: [
      {
        id: 'img-6a',
        url: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
    ],
    category: catRef('fish-food'),
    seller: SELLER_SUMMARY,
    reviews: [],
  },
  {
    id: 'p1000000-0000-4000-8000-000000000007',
    title: 'شامپو ضدشوره سگ رایحه نارگیل ۵۰۰ میل',
    slug: 'dog-shampoo-coconut-500ml',
    price: 740_000,
    compareAtPrice: 850_000,
    stock: 25,
    ratingAvg: 4.1,
    ratingCount: 9,
    soldCount: 33,
    status: 'ACTIVE',
    description: 'شامپوی ملایم با pH مناسب پوست سگ؛ ضدشوره و نرم‌کننده مو.',
    attributes: { حجم: '۵۰۰ میلی‌لیتر', رایحه: 'نارگیل' },
    images: [
      {
        id: 'img-7a',
        url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
    ],
    category: catRef('dog-care'),
    seller: SELLER_SUMMARY,
    reviews: [],
  },
  {
    id: 'p1000000-0000-4000-8000-000000000008',
    title: 'اسباب‌بازی موش پشمالو گربه (بسته ۳ عددی)',
    slug: 'cat-plush-mice-3pack',
    price: 290_000,
    compareAtPrice: null,
    stock: 3,
    ratingAvg: 4.7,
    ratingCount: 27,
    soldCount: 140,
    status: 'ACTIVE',
    description: 'بسته سه عددی موش پشمالو با زنگوله کوچک برای تحریک غریزه شکار گربه.',
    attributes: { تعداد: '۳ عدد', جنس: 'پلاش' },
    images: [
      {
        id: 'img-8a',
        url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
    ],
    category: catRef('cat-toys'),
    seller: SELLER_SUMMARY,
    reviews: [],
  },
  {
    id: 'p1000000-0000-4000-8000-000000000009',
    title: 'قفس پرنده فلزی دو طبقه با پایه',
    slug: 'bird-cage-two-tier',
    price: 4_800_000,
    compareAtPrice: 5_500_000,
    stock: 8,
    ratingAvg: 4.0,
    ratingCount: 6,
    soldCount: 14,
    status: 'ACTIVE',
    description: 'قفس فلزی مقاوم با دو طبقه، سینی کشویی و پایه چرخ‌دار.',
    attributes: { جنس: 'فلز', طبقات: '۲' },
    images: [
      {
        id: 'img-9a',
        url: 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
    ],
    category: catRef('bird-cage'),
    seller: SELLER_SUMMARY,
    reviews: [],
  },
  {
    id: 'p1000000-0000-4000-8000-000000000010',
    title: 'فیلتر داخلی آکواریوم ۵۰ لیتری',
    slug: 'aquarium-internal-filter-50l',
    price: 1_980_000,
    compareAtPrice: null,
    stock: 0,
    ratingAvg: 4.5,
    ratingCount: 15,
    soldCount: 42,
    status: 'ACTIVE',
    description: 'فیلتر داخلی بی‌صدا مناسب تانک تا ۵۰ لیتر؛ اسفنج قابل شستشو.',
    attributes: { ظرفیت: '۵۰ لیتر', نوع: 'داخلی' },
    images: [
      {
        id: 'img-10a',
        url: 'https://images.unsplash.com/photo-1520990269346-1c1d0b0b4b8e?w=800&h=800&fit=crop',
        sortOrder: 0,
      },
    ],
    category: catRef('aquarium'),
    seller: SELLER_SUMMARY,
    reviews: [],
  },
  {
    id: 'p1000000-0000-4000-8000-000000000011',
    title: 'پیش‌نویس — قلاده چرمی سگ (منتشر نشده)',
    slug: 'draft-leather-collar',
    price: 650_000,
    compareAtPrice: null,
    stock: 5,
    ratingAvg: 0,
    ratingCount: 0,
    soldCount: 0,
    status: 'DRAFT',
    description: 'این محصول هنوز منتشر نشده و فقط در پنل فروشنده دیده می‌شود.',
    attributes: { جنس: 'چرم' },
    images: [],
    category: catRef('dog-care'),
    seller: SELLER_SUMMARY,
    reviews: [],
  },
];

export function toCard(p: ProductDetail): ProductCard {
  const { description: _d, attributes: _a, reviews: _r, ...card } = p;
  return card;
}

export const BANNERS: Banner[] = [
  {
    id: 'b1000000-0000-4000-8000-000000000001',
    title: 'حراج تابستانه لوازم حیوانات خانگی',
    imageUrl: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&h=400&fit=crop',
    linkUrl: '/products?sort=best_selling',
    position: 'home_top',
  },
];

export const BANNER_ITEMS: BannerItem[] = BANNERS.map((b, i) => ({
  ...b,
  sortOrder: i + 1,
  isActive: true,
  startsAt: null,
  endsAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
}));

export const DEFAULT_ADDRESSES: Address[] = [
  {
    id: 'ad100000-0000-4000-8000-000000000001',
    title: 'منزل',
    province: 'تهران',
    city: 'تهران',
    addressLine: 'خیابان ولیعصر، بالاتر از پارک ساعی، پلاک ۱۲۳، واحد ۴',
    receiverName: 'سارا محمدی',
    receiverPhone: '09123333333',
    isDefault: true,
  },
  {
    id: 'ad100000-0000-4000-8000-000000000002',
    title: 'محل کار',
    province: 'تهران',
    city: 'تهران',
    addressLine: 'سعادت‌آباد، خیابان سرو غربی، برج آسمان، طبقه ۸',
    receiverName: 'سارا محمدی',
    receiverPhone: '09123333333',
    isDefault: false,
  },
];

export const ADMIN_USERS: AdminUser[] = [
  {
    id: USERS[0].id,
    phone: USERS[0].phone,
    email: USERS[0].email,
    fullName: USERS[0].fullName,
    role: 'ADMIN',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    ordersCount: 0,
  },
  {
    id: USERS[1].id,
    phone: USERS[1].phone,
    email: USERS[1].email,
    fullName: USERS[1].fullName,
    role: 'SELLER',
    isActive: true,
    createdAt: '2025-05-15T08:00:00.000Z',
    ordersCount: 18,
  },
  {
    id: USERS[2].id,
    phone: USERS[2].phone,
    email: USERS[2].email,
    fullName: USERS[2].fullName,
    role: 'CUSTOMER',
    isActive: true,
    createdAt: '2026-03-10T12:00:00.000Z',
    ordersCount: 4,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    phone: '09124444444',
    email: null,
    fullName: 'رضا کریمی',
    role: 'CUSTOMER',
    isActive: false,
    createdAt: '2026-04-01T10:00:00.000Z',
    ordersCount: 1,
  },
];

export const ADMIN_SELLERS: AdminSeller[] = [
  {
    id: DEMO_SELLER.id,
    userId: DEMO_SELLER.userId,
    shopName: DEMO_SELLER.shopName,
    shopSlug: DEMO_SELLER.shopSlug,
    bio: DEMO_SELLER.bio,
    logoUrl: null,
    nationalId: DEMO_SELLER.nationalId,
    status: 'APPROVED',
    commissionRate: 5,
    ratingAvg: 4.7,
    verifiedAt: DEMO_SELLER.verifiedAt,
    rejectReason: null,
    createdAt: DEMO_SELLER.createdAt,
    productsCount: PRODUCTS.filter((p) => p.status === 'ACTIVE').length,
    user: { phone: USERS[1].phone, fullName: USERS[1].fullName },
  },
  {
    id: 'aaaaaaaa-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    userId: '55555555-5555-4555-8555-555555555555',
    shopName: 'پت‌لند کرج',
    shopSlug: 'petland-karaj',
    bio: 'تخصص غذای خشک وارداتی',
    logoUrl: null,
    nationalId: '0023456789',
    status: 'PENDING',
    commissionRate: 5,
    ratingAvg: 0,
    verifiedAt: null,
    rejectReason: null,
    createdAt: '2026-08-20T09:00:00.000Z',
    productsCount: 0,
    user: { phone: '09125555555', fullName: 'مهدی نوری' },
  },
];

export const TICKETS: SupportTicket[] = [
  {
    id: 't1000000-0000-4000-8000-000000000001',
    userId: USERS[2].id,
    subject: 'تأخیر در ارسال سفارش',
    message: 'سفارش من سه روزه در وضعیت «در حال آماده‌سازی» مانده. کی ارسال می‌شه؟',
    status: 'OPEN',
    adminReply: null,
    createdAt: '2026-08-22T08:30:00.000Z',
    updatedAt: '2026-08-22T08:30:00.000Z',
    user: { phone: USERS[2].phone, fullName: USERS[2].fullName },
  },
  {
    id: 't1000000-0000-4000-8000-000000000002',
    userId: USERS[2].id,
    subject: 'درخواست فاکتور رسمی',
    message: 'لطفاً برای سفارش قبلی فاکتور رسمی ارسال کنید.',
    status: 'RESOLVED',
    adminReply: 'فاکتور از طریق ایمیل ارسال شد.',
    createdAt: '2026-08-10T14:00:00.000Z',
    updatedAt: '2026-08-11T10:00:00.000Z',
    user: { phone: USERS[2].phone, fullName: USERS[2].fullName },
  },
];

export const DAILY_REPORTS: DailyReport[] = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date('2026-08-24T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - i);
  const orders = 12 + ((i * 3) % 9);
  const paid = Math.max(1, orders - 2);
  const revenue = paid * 2_400_000 + i * 150_000;
  return {
    id: `rep-${i}`,
    date: d.toISOString(),
    ordersCount: orders,
    paidOrdersCount: paid,
    revenue,
    commission: Math.round(revenue * 0.05),
    newUsers: 3 + (i % 4),
    newSellers: i % 3 === 0 ? 1 : 0,
    createdAt: d.toISOString(),
  };
});

export const SHIPPING_FEE_IRR = 150_000;
