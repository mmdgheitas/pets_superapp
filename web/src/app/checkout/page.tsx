'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MapPin, ShieldCheck, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReservationCountdown } from '@/components/ui/reservation-countdown';
import { PriceConfirmedBadge } from '@/components/ui/commission-card';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatToman, toPersianDigits } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import { cn } from '@/lib/utils';
import type { Address, Cart, Order } from '@/lib/types';

interface PaymentRequestResponse {
  paymentUrl: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    void (async () => {
      try {
        const [{ data: cartData }, { data: addressData }] = await Promise.all([
          api.get<Cart>('/cart'),
          api.get<Address[]>('/users/me/addresses'),
        ]);
        setCart(cartData);
        setAddresses(addressData);
        const def = addressData.find((a) => a.isDefault) ?? addressData[0];
        if (def) setSelected(def.id);
      } catch (e) {
        toast({ title: 'بارگذاری اطلاعات ناموفق بود', description: errorMessage(e), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [token, router]);

  const pay = async () => {
    if (!selected) {
      toast({ title: 'آدرس تحویل را انتخاب کنید', variant: 'warning' });
      return;
    }
    setProcessing(true);
    try {
      const { data: order } = await api.post<Order>('/orders/checkout', { addressId: selected });
      const { data: payment } = await api.post<PaymentRequestResponse>(
        `/payments/orders/${order.id}/request`,
      );
      window.dispatchEvent(new Event('cart:updated'));
      // Redirect to the ZarinPal gateway (which calls back to /payment/result)
      window.location.href = payment.paymentUrl;
    } catch (e) {
      toast({ title: 'ثبت سفارش ناموفق بود', description: errorMessage(e), variant: 'destructive' });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-extrabold sm:text-2xl">تکمیل خرید</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-[18px] w-[18px] text-primary" /> آدرس تحویل
              </CardTitle>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> آدرس جدید
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {addresses.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  هنوز آدرسی ثبت نکرده‌اید — از صفحه پروفایل یک آدرس اضافه کنید.
                </p>
              )}
              {addresses.map((addr) => {
                const isSelected = selected === addr.id;
                return (
                  <label
                    key={addr.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors',
                      isSelected ? 'border-primary bg-accent/60 ring-1 ring-primary' : 'hover:border-primary/30',
                    )}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => setSelected(addr.id)}
                    />
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <b>{addr.title ?? addr.receiverName}</b>
                      {addr.isDefault && (
                        <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          پیش‌فرض
                        </span>
                      )}
                      <p className="mt-0.5 text-muted-foreground">
                        {addr.province}، {addr.city}، {addr.addressLine}
                      </p>
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {cart && (
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-base">خلاصه پرداخت</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">جمع کالاها ({toPersianDigits(cart.itemCount)})</span>
                <span className="num-tabular">{formatToman(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-bold">
                <span>مبلغ نهایی</span>
                <span className="text-primary num-tabular">{formatToman(cart.subtotal)}</span>
              </div>

              <PriceConfirmedBadge />

              <ReservationCountdown label="پس از ثبت، موجودی تا این زمان رزرو می‌شود" />

              <Button
                className="mt-1 w-full"
                size="lg"
                onClick={pay}
                loading={processing}
                disabled={addresses.length === 0}
              >
                {processing ? 'در حال اتصال به درگاه…' : 'پرداخت و ثبت سفارش'}
              </Button>

              <div className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" /> پرداخت امن از طریق درگاه زرین‌پال
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
