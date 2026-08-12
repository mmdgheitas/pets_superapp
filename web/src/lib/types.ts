export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface SellerSummary {
  id: string;
  shopName: string;
  shopSlug: string;
  ratingAvg: number;
}

export interface SellerProfile {
  id: string;
  userId: string;
  shopName: string;
  shopSlug: string;
  bio: string | null;
  logoUrl: string | null;
  nationalId: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  commissionRate: number;
  ratingAvg: number;
  verifiedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerStats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  paidOrderItems: number;
  unitsSold: number;
  revenueIrr: number;
  pendingFulfillment: number;
}

export interface SellerDashboard {
  seller: SellerProfile;
  stats: SellerStats;
  recentSales: SellerRecentSale[];
}

export interface SellerRecentSale {
  id: string;
  title: string;
  quantity: number;
  sellerAmount: number;
  order: {
    id: string;
    status: string;
    createdAt: string;
  };
}

export interface SalesReportSeries {
  date: string;
  revenue: number;
  units: number;
  orderItems: number;
}

export interface SalesReport {
  sellerId: string;
  days: number;
  series: SalesReportSeries[];
}

export interface ProductCard {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  status: string;
  images: ProductImage[];
  category: { id: string; name: string; slug: string };
  seller: SellerSummary;
}

export interface ProductDetail extends ProductCard {
  description: string;
  attributes: Record<string, unknown> | null;
  reviews: Review[];
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { fullName: string | null; avatarUrl: string | null };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  children: Category[];
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  lineTotal: number;
  available: boolean;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    stock: number;
    imageUrl: string | null;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  total: number;
  paidAt: string | null;
  createdAt: string;
  cancelReason: string | null;
  items: { id: string; title: string; quantity: number; unitPrice: number; totalPrice: number }[];
  payment?: { id: string; status: string; refId: string | null; amount: number };
}

export interface Address {
  id: string;
  title: string | null;
  province: string;
  city: string;
  addressLine: string;
  receiverName: string;
  receiverPhone: string;
  isDefault: boolean;
}

// ------------------------------------------------------------------ Admin types

export interface AdminDashboard {
  users: { total: number; customers: number };
  sellers: { PENDING: number; APPROVED: number };
  products: { ACTIVE: number; DRAFT: number };
  orders: { today: number; revenueToday: number };
  tickets: { open: number };
}

export interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  date: string;
  ordersCount: number;
  paidOrdersCount: number;
  revenue: number;
  commission: number;
  newUsers: number;
  newSellers: number;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  email: string | null;
  fullName: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  ordersCount: number;
}

export interface PaginatedUsers {
  data: AdminUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AdminSeller {
  id: string;
  userId: string;
  shopName: string;
  shopSlug: string;
  bio: string | null;
  logoUrl: string | null;
  nationalId: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  commissionRate: number;
  ratingAvg: number;
  verifiedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  productsCount: number;
  user: { phone: string; fullName: string | null };
}

export interface PaginatedSellers {
  data: AdminSeller[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
  user: { phone: string; fullName: string | null };
}
