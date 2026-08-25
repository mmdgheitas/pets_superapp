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
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <h1 className="font-display text-xl font-extrabold sm:text-2xl">تکمیل خرید</h1>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                <MapPin className="h-[18px] w-[18px] shrink-0 text-primary" />
                <span className="truncate">آدرس تحویل</span>
              </CardTitle>
              <Link href="/profile" className="shrink-0">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> آدرس جدید
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {addresses.length === 0 && (
                <p className="rounded-lg border border-dashed p-3.5 text-sm leading-7 text-muted-foreground sm:p-4">
                  هنوز آدرسی ثبت نکرده‌اید — از صفحه پروفایل یک آدرس اضافه کنید.
                </p>
              )}
              {addresses.map((addr) => {
                const isSelected = selected === addr.id;
                return (
                  <label
                    key={addr.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors sm:gap-3 sm:p-3.5',
                      isSelected
                        ? 'border-primary bg-accent/60 ring-1 ring-primary'
                        : 'hover:border-primary/30',
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
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <b className="leading-snug">{addr.title ?? addr.receiverName}</b>
                        {addr.isDefault && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold leading-none text-primary">
                            پیش‌فرض
                          </span>
                        )}
                      </span>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground sm:text-sm">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">خلاصه پرداخت</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">جمع کالاها ({toPersianDigits(cart.itemCount)})</span>
                <span className="shrink-0 num-tabular">{formatToman(cart.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-3 text-base font-bold">
                <span>مبلغ نهایی</span>
                <span className="shrink-0 text-primary num-tabular">{formatToman(cart.subtotal)}</span>
              </div>

              <PriceConfirmedBadge />

              <ReservationCountdown label="پس از ثبت، موجودی تا این زمان رزرو می‌شود" />

              <Button
                className="w-full"
                size="lg"
                onClick={pay}
                loading={processing}
                disabled={addresses.length === 0}
              >
                {processing ? 'در حال اتصال به درگاه…' : 'پرداخت و ثبت سفارش'}
              </Button>

              <div className="border-t pt-3 text-xs text-muted-foreground">
                <p className="flex items-start gap-1.5 leading-6">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  پرداخت امن از طریق درگاه زرین‌پال
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
