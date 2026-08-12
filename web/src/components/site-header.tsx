'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PawPrint,
  ShoppingCart,
  UserRound,
  PackageSearch,
  LogOut,
  Store,
  Shield,
  LayoutDashboard,
  Search,
  Menu,
  X,
  Home,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits } from '@/lib/format';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

function useCartCount() {
  const token = useAuthStore((s) => s.accessToken);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setCount(0);
      return;
    }
    let alive = true;
    const load = () =>
      api
        .get<{ itemCount: number }>('/cart')
        .then((res) => alive && setCount(res.data.itemCount))
        .catch(() => alive && setCount(0));
    load();
    const onFocus = () => load();
    window.addEventListener('cart:updated', onFocus);
    return () => {
      alive = false;
      window.removeEventListener('cart:updated', onFocus);
    };
  }, [token]);

  return count;
}

function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -end-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
      {toPersianDigits(count > 99 ? '99+' : count)}
    </span>
  );
}

function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
  };

  return (
    <form onSubmit={onSubmit} role="search" className={cn('w-full', className)}>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="جستجوی محصول، دسته یا برند…"
        inputMode="search"
        startIcon={<Search className="h-4 w-4" />}
        className="h-11 bg-muted/60 focus-visible:bg-background"
      />
    </form>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const { user, clear } = useAuthStore();
  const cartCount = useCartCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        رفتن به محتوای اصلی
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center gap-3 sm:gap-5">
          <button
            className="-ms-1 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent lg:hidden"
            aria-label="منو"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-1.5 font-extrabold text-primary">
            <PawPrint className="h-7 w-7" />
            <span className="hidden text-xl sm:inline">پت‌شاپ</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Button variant="ghost" onClick={() => router.push('/products')}>
              <PackageSearch className="h-4 w-4" /> محصولات
            </Button>
            {user?.role === 'SELLER' && (
              <Button variant="ghost" onClick={() => router.push('/seller')}>
                <Store className="h-4 w-4" /> فروشگاه من
              </Button>
            )}
            {user?.role === 'ADMIN' && (
              <Button variant="ghost" onClick={() => router.push('/admin')}>
                <Shield className="h-4 w-4" /> مدیریت
              </Button>
            )}
          </nav>

          <div className="hidden flex-1 sm:block">
            <HeaderSearch className="mx-auto max-w-lg" />
          </div>

          <div className="mr-auto flex items-center gap-0.5 sm:mr-0 sm:gap-1">
            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon" aria-label="سبد خرید">
                <ShoppingCart className="h-5 w-5" />
              </Button>
              <CartBadge count={cartCount} />
            </Link>
            {user ? (
              <>
                <Link href="/orders" className="hidden lg:block">
                  <Button variant="ghost" size="icon" aria-label="سفارش‌های من">
                    <ClipboardList className="h-5 w-5" />
                  </Button>
                </Link>
                {user.role === 'SELLER' && (
                  <Link href="/seller" className="hidden lg:block">
                    <Button variant="ghost" size="icon" aria-label="داشبورد فروشنده">
                      <LayoutDashboard className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="hidden lg:block">
                    <Button variant="ghost" size="icon" aria-label="پنل مدیریت">
                      <Shield className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Link href="/profile" className="hidden lg:block">
                  <Button variant="ghost" size="icon" aria-label="پروفایل">
                    <UserRound className="h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="خروج"
                  className="hidden lg:inline-flex"
                  onClick={() => clear()}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm" className="sm:h-10 sm:px-4">
                  ورود / ثبت‌نام
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="border-t px-4 pb-3 pt-2 sm:hidden">
          <HeaderSearch />
        </div>

        {mobileMenuOpen && (
          <div className="border-t bg-card px-4 py-3 lg:hidden animate-fade-up">
            <nav className="flex flex-col gap-1">
              <MobileLink href="/" icon={<Home className="h-4 w-4" />} label="خانه" onClick={() => setMobileMenuOpen(false)} />
              <MobileLink href="/products" icon={<PackageSearch className="h-4 w-4" />} label="محصولات" onClick={() => setMobileMenuOpen(false)} />
              {user?.role === 'SELLER' && (
                <MobileLink href="/seller" icon={<Store className="h-4 w-4" />} label="فروشگاه من" onClick={() => setMobileMenuOpen(false)} />
              )}
              {user?.role === 'ADMIN' && (
                <MobileLink href="/admin" icon={<Shield className="h-4 w-4" />} label="مدیریت" onClick={() => setMobileMenuOpen(false)} />
              )}
              {user ? (
                <button
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive-bg"
                  onClick={() => {
                    clear();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" /> خروج از حساب
                </button>
              ) : (
                <MobileLink href="/login" icon={<UserRound className="h-4 w-4" />} label="ورود / ثبت‌نام" onClick={() => setMobileMenuOpen(false)} />
              )}
            </nav>
          </div>
        )}
      </header>

      <MobileTabBar cartCount={cartCount} isAuthed={!!user} />
    </>
  );
}

function MobileLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
    >
      {icon}
      {label}
    </Link>
  );
}

/** Fixed bottom tab bar on mobile — keeps primary actions in the thumb-reachable zone
 *  (Fitts's law) instead of forcing a reach to the top of a tall phone screen. */
function MobileTabBar({ cartCount, isAuthed }: { cartCount: number; isAuthed: boolean }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="پیمایش اصلی"
    >
      <TabItem href="/" icon={<Home className="h-5 w-5" />} label="خانه" />
      <TabItem href="/products" icon={<PackageSearch className="h-5 w-5" />} label="محصولات" />
      <TabItem href="/cart" icon={<ShoppingCart className="h-5 w-5" />} label="سبد خرید" badge={cartCount} />
      <TabItem href="/orders" icon={<ClipboardList className="h-5 w-5" />} label="سفارش‌ها" />
      <TabItem href={isAuthed ? '/profile' : '/login'} icon={<UserRound className="h-5 w-5" />} label="حساب من" />
    </nav>
  );
}

function TabItem({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <Link
      href={href}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors active:text-primary"
    >
      <span className="relative">
        {icon}
        {!!badge && <CartBadge count={badge} />}
      </span>
      {label}
    </Link>
  );
}
