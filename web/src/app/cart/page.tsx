'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatToman, toPersianDigits } from '@/lib/format';
import type { Cart } from '@/lib/types';

export default function CartPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

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

  const updateQuantity = async (itemId: string, quantity: number) => {
    const { data } = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity });
    setCart(data);
  };

  const removeItem = async (itemId: string) => {
    const { data } = await api.delete<Cart>(`/cart/items/${itemId}`);
    setCart(data);
  };

  if (!token) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4">برای مشاهده سبد خرید ابتدا وارد شوید.</p>
        <Link href="/login">
          <Button>ورود</Button>
        </Link>
      </div>
    );
  }

  if (loading) return <p className="py-16 text-center text-muted-foreground">در حال بارگذاری…</p>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-2 text-5xl">🛒</p>
        <p className="mb-4">سبد خرید شما خالی است.</p>
        <Link href="/products">
          <Button>مشاهده محصولات</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {cart.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex gap-4 p-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.product.imageUrl ? (
                  <Image src={item.product.imageUrl} alt={item.product.title} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">🐾</div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link href={`/products/${item.product.slug}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
                    {item.product.title}
                  </Link>
                  {!item.available && (
                    <p className="mt-1 text-xs text-destructive">موجودی کافی نیست — لطفاً تعداد را اصلاح کنید</p>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>
                      −
                    </Button>
                    <span className="w-6 text-center">{toPersianDigits(item.quantity)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                    >
                      +
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} aria-label="حذف">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="font-bold text-primary">{formatToman(item.lineTotal)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="h-fit lg:sticky lg:top-20">
        <CardContent className="space-y-3 p-4">
          <h2 className="font-bold">خلاصه سفارش</h2>
          <div className="flex justify-between text-sm">
            <span>جمع کالاها ({toPersianDigits(cart.itemCount)})</span>
            <span>{formatToman(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 font-bold">
            <span>مبلغ قابل پرداخت</span>
            <span className="text-primary">{formatToman(cart.subtotal)}</span>
          </div>
          <Button className="w-full" size="lg" onClick={() => router.push('/checkout')}>
            ادامه فرایند خرید
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
