'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PawPrint, ShoppingCart, UserRound, PackageSearch, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits } from '@/lib/format';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function CartBadge() {
  const token = useAuthStore((s) => s.accessToken);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setCount(0);
      return;
    }
    let alive = true;
    api
      .get<{ itemCount: number }>('/cart')
      .then((res) => alive && setCount(res.data.itemCount))
      .catch(() => alive && setCount(0));
    return () => {
      alive = false;
    };
  }, [token]);

  if (!token || count === 0) return null;
  return (
    <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
      {toPersianDigits(count)}
    </span>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const { user, clear } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <PawPrint className="h-7 w-7" />
          <span className="text-xl">پت‌شاپ</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" onClick={() => router.push('/products')}>
            <PackageSearch className="ml-1 h-4 w-4" /> محصولات
          </Button>
        </nav>

        <div className="flex items-center gap-1">
          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon" aria-label="سبد خرید">
              <ShoppingCart className="h-5 w-5" />
            </Button>
            <CartBadge />
          </Link>
          {user ? (
            <>
              <Link href="/orders">
                <Button variant="ghost">سفارش‌ها</Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="icon" aria-label="پروفایل">
                  <UserRound className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" aria-label="خروج" onClick={() => clear()}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button>ورود / ثبت‌نام</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
