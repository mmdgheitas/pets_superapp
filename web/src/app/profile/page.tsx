'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits } from '@/lib/format';
import type { Address } from '@/lib/types';

const addressSchema = z.object({
  receiverName: z.string().min(2, 'نام گیرنده الزامی است'),
  receiverPhone: z.string().regex(/^09\d{9}$/, 'موبایل گیرنده معتبر نیست'),
  province: z.string().min(2, 'استان الزامی است'),
  city: z.string().min(2, 'شهر الزامی است'),
  addressLine: z.string().min(5, 'نشانی کامل‌تری وارد کنید'),
  postalCode: z.string().regex(/^\d{10}$/, 'کد پستی ۱۰ رقم').optional().or(z.literal('')),
  title: z.string().optional(),
});
type AddressForm = z.infer<typeof addressSchema>;

const ROLE_LABEL: Record<string, string> = { CUSTOMER: 'خریدار', SELLER: 'فروشنده', ADMIN: 'مدیر' };

export default function ProfilePage() {
  const router = useRouter();
  const { user, accessToken: token, setUser } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [fullName, setFullName] = useState('');

  const form = useForm<AddressForm>({ resolver: zodResolver(addressSchema) });

  const loadAddresses = useCallback(async () => {
    try {
      const { data } = await api.get<Address[]>('/users/me/addresses');
      setAddresses(data);
    } catch {
      /* profile may load before token hydration */
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    loadAddresses();
    setFullName(user?.fullName ?? '');
  }, [token, router, loadAddresses, user?.fullName]);

  if (!user) return null;

  const saveName = async () => {
    setSaved('');
    try {
      const { data } = await api.patch<typeof user>('/users/me', { fullName });
      setUser(data as typeof user);
      setSaved('ذخیره شد ✓');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const addAddress = async (values: AddressForm) => {
    setError('');
    try {
      await api.post('/users/me/addresses', values);
      setAddingAddress(false);
      form.reset();
      await loadAddresses();
    } catch (e) {
      setError(errorMessage(e, 'ثبت آدرس ناموفق بود'));
    }
  };

  const makeDefault = async (id: string) => {
    await api.post(`/users/me/addresses/${id}/default`).catch(() => undefined);
    loadAddresses();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>پروفایل من</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">موبایل</span>
            <span dir="ltr">{toPersianDigits(user.phone)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">نقش</span>
            <span>{ROLE_LABEL[user.role] ?? user.role}</span>
          </div>
          <div className="flex gap-2">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="نام و نام خانوادگی" />
            <Button onClick={saveName}>ذخیره</Button>
          </div>
          {saved && <p className="text-sm text-green-600">{saved}</p>}
          {user.role === 'CUSTOMER' && (
            <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
              فروشنده هستید؟ از اپلیکیشن موبایل یا نسخه بعدی پنل وب فروشندگی ثبت‌نام کنید.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>آدرس‌ها</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAddingAddress((v) => !v)}>
            {addingAddress ? 'انصراف' : 'افزودن آدرس'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingAddress && (
            <form onSubmit={form.handleSubmit(addAddress)} className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <Input placeholder="عنوان (منزل/محل کار)" {...form.register('title')} />
              <Input placeholder="نام گیرنده*" {...form.register('receiverName')} />
              <Input dir="ltr" placeholder="موبایل گیرنده* 09…" {...form.register('receiverPhone')} />
              <Input placeholder="استان*" {...form.register('province')} />
              <Input placeholder="شهر*" {...form.register('city')} />
              <Input dir="ltr" placeholder="کد پستی (۱۰ رقم)" {...form.register('postalCode')} />
              <div className="col-span-2">
                <Input placeholder="نشانی کامل*" {...form.register('addressLine')} />
              </div>
              <Button type="submit" className="col-span-2" disabled={form.formState.isSubmitting}>
                ثبت آدرس
              </Button>
            </form>
          )}
          {addresses.length === 0 && !addingAddress && (
            <p className="text-sm text-muted-foreground">هنوز آدرسی ثبت نشده است.</p>
          )}
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
              <div>
                <b>
                  {addr.title ?? addr.receiverName}
                  {addr.isDefault && (
                    <span className="mr-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                      پیش‌فرض
                    </span>
                  )}
                </b>
                <p className="mt-1 text-muted-foreground">
                  {addr.province}، {addr.city}، {addr.addressLine}
                </p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {toPersianDigits(addr.receiverPhone)}
                </p>
              </div>
              {!addr.isDefault && (
                <Button variant="link" size="sm" onClick={() => makeDefault(addr.id)}>
                  پیش‌فرض شود
                </Button>
              )}
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/orders">
          <Button variant="link">مشاهده سفارش‌های من ←</Button>
        </Link>
      </div>
    </div>
  );
}
