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
