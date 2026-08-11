'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Trash2, ShoppingBag, ShieldCheck, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatToman, toPersianDigits } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import type { Cart } from '@/lib/types';

export default function CartPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<Cart>('/cart');
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const notifyCartChanged = () => window.dispatchEvent(new Event('cart:updated'));

  const updateQuantity = async (itemId: string, quantity: number) => {
    setPendingId(itemId);
    try {
      const { data } = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity });
      setCart(data);
      notifyCartChanged();
    } catch (e) {
      toast({ title: 'به‌روزرسانی ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setPendingId(null);
    }
  };

  const removeItem = async (itemId: string, title: string) => {
    setPendingId(itemId);
    try {
      const { data } = await api.delete<Cart>(`/cart/items/${itemId}`);
      setCart(data);
      notifyCartChanged();
      toast({ title: 'از سبد حذف شد', description: title });
    } catch (e) {
      toast({ title: 'حذف ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setPendingId(null);
    }
  };

  if (!token) {
    return (
      <EmptyState
        icon="🔒"
        title="ابتدا وارد حساب خود شوید"
        description="برای مشاهده سبد خرید باید وارد حساب کاربری خود شوید."
        actionLabel="ورود / ثبت‌نام"
        actionHref="/login"
      />
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex gap-4 p-4">
                <Skeleton className="h-24 w-24 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="mx-auto h-14 w-14 text-muted-foreground" />}
        title="سبد خرید شما خالی است"
        description="محصولات مورد علاقه‌تان را پیدا کنید و به سبد اضافه کنید."
        actionLabel="مشاهده محصولات"
        actionHref="/products"
      />
    );
  }

  const hasUnavailable = cart.items.some((i) => !i.available);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold sm:text-2xl">سبد خرید ({toPersianDigits(cart.itemCount)} کالا)</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {cart.items.map((item) => (
            <Card key={item.id} className={pendingId === item.id ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <CardContent className="flex gap-4 p-4">
                <Link href={`/products/${item.product.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.product.imageUrl ? (
                    <Image src={item.product.imageUrl} alt={item.product.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl">🐾</div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col justify-between gap-2">
                  <div>
                    <Link href={`/products/${item.product.slug}`} className="line-clamp-2 text-sm font-medium transition-colors hover:text-primary">
                      {item.product.title}
                    </Link>
                    {!item.available && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" /> موجودی کافی نیست — تعداد را اصلاح کنید
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground num-tabular">
                      {formatToman(item.product.price)} / عدد
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        max={item.product.stock}
                        disabled={pendingId === item.id}
                        onChange={(q) => updateQuantity(item.id, q)}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(item.id, item.product.title)}
                        disabled={pendingId === item.id}
                        aria-label="حذف از سبد"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="font-bold text-foreground num-tabular">{formatToman(item.lineTotal)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="space-y-3 p-5">
            <h2 className="font-bold">خلاصه سفارش</h2>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>جمع کالاها ({toPersianDigits(cart.itemCount)})</span>
              <span className="num-tabular">{formatToman(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>مبلغ قابل پرداخت</span>
              <span className="text-primary num-tabular">{formatToman(cart.subtotal)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/checkout')}
              disabled={hasUnavailable}
            >
              ادامه فرایند خرید <ArrowLeft className="h-4 w-4" />
            </Button>
            {hasUnavailable && (
              <p className="text-center text-xs text-destructive">
                برای ادامه، ابتدا کالاهای بدون موجودی کافی را اصلاح یا حذف کنید.
              </p>
            )}
            <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> پرداخت امن با درگاه زرین‌پال
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
