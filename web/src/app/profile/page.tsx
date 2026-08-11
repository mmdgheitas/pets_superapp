'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Plus, User as UserIcon, ClipboardList, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits } from '@/lib/format';
import { toast } from '@/lib/toast-store';
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
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);

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
    setSavingName(true);
    try {
      const { data } = await api.patch<typeof user>('/users/me', { fullName });
      setUser(data as typeof user);
      toast({ title: 'تغییرات ذخیره شد', variant: 'success' });
    } catch (e) {
      toast({ title: 'ذخیره ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const addAddress = async (values: AddressForm) => {
    try {
      await api.post('/users/me/addresses', values);
      setAddingAddress(false);
      form.reset();
      await loadAddresses();
      toast({ title: 'آدرس جدید ثبت شد', variant: 'success' });
    } catch (e) {
      toast({ title: 'ثبت آدرس ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await api.post(`/users/me/addresses/${id}/default`);
      await loadAddresses();
      toast({ title: 'آدرس پیش‌فرض تغییر کرد' });
    } catch (e) {
      toast({ title: 'عملیات ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-extrabold text-primary">
          {(user.fullName ?? user.phone).slice(0, 1)}
        </span>
        <div>
          <h1 className="text-lg font-extrabold">{user.fullName || 'کاربر پت‌شاپ'}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span dir="ltr" className="text-sm text-muted-foreground num-tabular">{toPersianDigits(user.phone)}</span>
            <Badge variant="secondary">{ROLE_LABEL[user.role] ?? user.role}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="h-[18px] w-[18px] text-primary" /> اطلاعات حساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="نام و نام خانوادگی"
              className="flex-1"
            />
            <Button onClick={saveName} loading={savingName} disabled={fullName === (user.fullName ?? '')}>
              ذخیره تغییرات
            </Button>
          </div>
          {user.role === 'CUSTOMER' && (
            <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
              فروشنده هستید؟{' '}
              <Link href="/seller" className="font-bold underline underline-offset-2">
                فروشگاه خود را راه‌اندازی کنید
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-[18px] w-[18px] text-primary" /> آدرس‌های من
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAddingAddress((v) => !v)} className="gap-1">
            {addingAddress ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {addingAddress ? 'انصراف' : 'افزودن آدرس'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingAddress && (
            <form
              onSubmit={form.handleSubmit(addAddress)}
              className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2 animate-fade-up"
            >
              <Field label="عنوان (منزل/محل کار)" error={form.formState.errors.title?.message}>
                <Input {...form.register('title')} />
              </Field>
              <Field label="نام گیرنده" required error={form.formState.errors.receiverName?.message}>
                <Input {...form.register('receiverName')} />
              </Field>
              <Field label="موبایل گیرنده" required error={form.formState.errors.receiverPhone?.message}>
                <Input dir="ltr" placeholder="09…" {...form.register('receiverPhone')} />
              </Field>
              <Field label="استان" required error={form.formState.errors.province?.message}>
                <Input {...form.register('province')} />
              </Field>
              <Field label="شهر" required error={form.formState.errors.city?.message}>
                <Input {...form.register('city')} />
              </Field>
              <Field label="کد پستی" error={form.formState.errors.postalCode?.message}>
                <Input dir="ltr" placeholder="۱۰ رقم" {...form.register('postalCode')} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="نشانی کامل" required error={form.formState.errors.addressLine?.message}>
                  <Input {...form.register('addressLine')} />
                </Field>
              </div>
              <Button type="submit" className="sm:col-span-2" loading={form.formState.isSubmitting}>
                ثبت آدرس
              </Button>
            </form>
          )}
          {addresses.length === 0 && !addingAddress && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              هنوز آدرسی ثبت نشده است.
            </p>
          )}
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-start justify-between gap-3 rounded-xl border p-3.5 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <b>{addr.title ?? addr.receiverName}</b>
                  {addr.isDefault && <Badge>پیش‌فرض</Badge>}
                </div>
                <p className="mt-1 text-muted-foreground">
                  {addr.province}، {addr.city}، {addr.addressLine}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground num-tabular" dir="ltr">
                  {toPersianDigits(addr.receiverPhone)}
                </p>
              </div>
              {!addr.isDefault && (
                <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={() => makeDefault(addr.id)}>
                  <Star className="h-3.5 w-3.5" /> پیش‌فرض کن
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Link href="/orders">
        <Button variant="outline" className="w-full gap-2">
          <ClipboardList className="h-4 w-4" /> مشاهده سفارش‌های من
        </Button>
      </Link>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {error && <span className="block text-destructive">{error}</span>}
    </label>
  );
}
