'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatToman } from '@/lib/format';
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
  const [error, setError] = useState('');
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
        setError(errorMessage(e));
      }
    })();
  }, [token, router]);

  const pay = async () => {
    setError('');
    if (!selected) {
      setError('لطفاً آدرس تحویل را انتخاب کنید');
      return;
    }
    setProcessing(true);
    try {
      const { data: order } = await api.post<Order>('/orders/checkout', { addressId: selected });
      const { data: payment } = await api.post<PaymentRequestResponse>(
        `/payments/orders/${order.id}/request`,
      );
      // Redirect to the ZarinPal gateway (which calls back to /payment/result)
      window.location.href = payment.paymentUrl;
    } catch (e) {
      setError(errorMessage(e, 'ثبت سفارش ناموفق بود'));
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>آدرس تحویل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              هنوز آدرسی ثبت نکرده‌اید — ابتدا از صفحه پروفایل یک آدرس اضافه کنید.
            </p>
          )}
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className={`block cursor-pointer rounded-lg border p-3 text-sm ${
                selected === addr.id ? 'border-primary bg-accent/50' : ''
              }`}
            >
              <input
                type="radio"
                name="address"
                className="ml-2"
                checked={selected === addr.id}
                onChange={() => setSelected(addr.id)}
              />
              <b>{addr.title ?? addr.receiverName}</b> — {addr.province}، {addr.city}، {addr.addressLine}
            </label>
          ))}
        </CardContent>
      </Card>

      {cart && (
        <Card>
          <CardHeader>
            <CardTitle>پرداخت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>جمع کالاها</span>
              <span>{formatToman(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>مبلغ نهایی</span>
              <span className="text-primary">{formatToman(cart.subtotal)}</span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              پرداخت امن از طریق درگاه زرین‌پال · در صورت عدم پرداخت تا ۱۵ دقیقه سفارش لغو می‌شود
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="mt-2 w-full" size="lg" onClick={pay} disabled={processing || addresses.length === 0}>
              {processing ? 'در حال اتصال به درگاه…' : 'پرداخت'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
