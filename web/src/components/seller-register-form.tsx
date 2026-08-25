'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Store, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api';
import { toast } from '@/lib/toast-store';
import { useAuthStore } from '@/lib/auth-store';
import type { User } from '@/lib/types';
import { Field } from '@/components/ui/field';

const schema = z.object({
  shopName: z.string().min(2, 'نام فروشگاه حداقل ۲ کاراکتر باشد').max(100),
  bio: z.string().max(1000, 'توضیحات حداکثر ۱۰۰۰ کاراکتر باشد').optional().or(z.literal('')),
  nationalId: z
    .string()
    .regex(/^\d{10}$/, 'کد ملی باید دقیقاً ۱۰ رقم باشد')
    .optional()
    .or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

const PERKS = [
  'فروشگاه اختصاصی با آدرس مستقل و صفحه معرفی',
  'ثبت نامحدود محصول پس از تأیید حساب',
  'داشبورد فروش، گزارش درآمد و مدیریت سفارش‌ها',
];

/**
 * Shown at /seller for any logged-in user who hasn't registered a shop yet.
 * Registering flips the account to SELLER immediately, but the shop stays
 * PENDING until an admin approves it — so this doubles as an expectation-
 * setting screen (what happens next), not just a form.
 */
export function SellerRegisterForm({ onRegistered }: { onRegistered: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    try {
      await api.post('/sellers/register', {
        shopName: values.shopName,
        bio: values.bio || undefined,
        nationalId: values.nationalId || undefined,
      });
      // The account's role flips to SELLER server-side the moment registration
      // succeeds — refresh it locally so the header/nav update immediately.
      try {
        const { data: me } = await api.get<User>('/users/me');
        setUser(me);
      } catch {
        /* non-fatal — the dashboard reload below still reflects the new state */
      }
      toast({ title: 'ثبت‌نام فروشندگی انجام شد 🎉', description: 'درخواست شما برای بررسی به ادمین ارسال شد.', variant: 'success' });
      onRegistered();
    } catch (e) {
      toast({ title: 'ثبت‌نام ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5 lg:gap-8">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-raised sm:h-14 sm:w-14">
          <Store className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <h1 className="font-display text-xl font-extrabold leading-snug sm:text-2xl">
          فروشگاه خودتان را راه‌اندازی کنید
        </h1>
        <p className="text-sm leading-7 text-muted-foreground">
          به جمع فروشندگان پت‌شاپ بپیوندید و لوازم حیوانات خانگی خود را به هزاران مشتری در سراسر کشور بفروشید.
        </p>
        <ul className="space-y-2.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm leading-6">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 rounded-lg bg-info-bg p-3 text-xs leading-6 text-info">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            پس از ثبت درخواست، تیم پت‌شاپ ظرف ۱ تا ۲ روز کاری آن را بررسی می‌کند. تا آن زمان می‌توانید اطلاعات
            فروشگاه را از همین صفحه مشاهده کنید.
          </span>
        </p>
      </div>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">اطلاعات فروشگاه</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field label="نام فروشگاه" required error={form.formState.errors.shopName?.message}>
              <Input {...form.register('shopName')} placeholder="مثلاً: پت‌لند" />
            </Field>
            <Field label="درباره فروشگاه (اختیاری)" error={form.formState.errors.bio?.message}>
              <Textarea {...form.register('bio')} rows={3} placeholder="چند جمله درباره فروشگاه و محصولاتتان بنویسید…" />
            </Field>
            <Field label="کد ملی (اختیاری، برای احراز هویت)" error={form.formState.errors.nationalId?.message}>
              <Input {...form.register('nationalId')} dir="ltr" inputMode="numeric" placeholder="۱۰ رقم" />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
              ثبت‌نام به‌عنوان فروشنده
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
