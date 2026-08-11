'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits, formatToman } from '@/lib/format';
import type { Category, ProductCard } from '@/lib/types';

const createSchema = z.object({
  title: z.string().min(3, 'عنوان حداقل ۳ کاراکتر باشد').max(200),
  categoryId: z.string().uuid('دسته‌بندی معتبر نیست'),
  description: z.string().min(10, 'توضیحات حداقل ۱۰ کاراکتر باشد'),
  price: z
    .string()
    .min(1, 'قیمت الزامی است')
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 1000;
    }, 'قیمت حداقل ۱۰۰۰ ریال باشد'),
  compareAtPrice: z.string().min(1).optional(),
  stock: z.string().min(1).refine((v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0, 'شماره معتبر نیست'),
  status: z.enum(['ACTIVE', 'DRAFT']),
  images: z.string().optional(),
});

type FormData = z.infer<typeof createSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { compareAtPrice: '', images: '', status: 'ACTIVE' },
  });

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return; }
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    if (currentUser.role !== 'SELLER') { router.replace('/'); return; }
    loadData();
  }, [accessToken, router]);

  const loadData = async () => {
    try {
      const [cats] = await Promise.all([api.get<Category[]>('/categories')]);
      setCategories(cats.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        title: data.title,
        categoryId: data.categoryId,
        description: data.description,
        price: parseInt(data.price, 10),
        compareAtPrice: data.compareAtPrice ? parseInt(data.compareAtPrice, 10) : undefined,
        stock: parseInt(data.stock, 10),
        status: data.status,
        images: data.images ? data.images.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      const { data: product } = await api.post<ProductCard>('/products', payload);
      router.push(`/seller/products/${product.id}`);
    } catch (e) {
      setError(errorMessage(e, 'ثبت محصول ناموفق بود'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="link" onClick={() => router.back()} className="mb-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> بازگشت
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>ثبت محصول جدید</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">عنوان *</label>
              <Input
                {...form.register('title')}
                placeholder="غذای خشک سگ رویال کنین ۱۵ کیلویی"
                required
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">دسته‌بندی *</label>
              <Select value={form.watch('categoryId')} onValueChange={(v) => form.setValue('categoryId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="دسته‌بندی را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">توضیحات *</label>
              <textarea
                {...form.register('description')}
                placeholder="توضیحات کامل محصول، ویژگی‌ها، نکات بهداشتی و…"
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">قیمت (ریال) *</label>
                <Input
                  {...form.register('price')}
                  placeholder="2850000"
                  inputMode="numeric"
                  required
                />
                {form.formState.errors.price && (
                  <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">قیمت پیشنهادی (ریال)</label>
                <Input
                  {...form.register('compareAtPrice')}
                  placeholder="3400000"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">موجودی *</label>
                <Input
                  {...form.register('stock')}
                  placeholder="۱۲"
                  inputMode="numeric"
                  required
                />
                {form.formState.errors.stock && (
                  <p className="text-xs text-destructive">{form.formState.errors.stock.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">وضعیت</label>
                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as 'ACTIVE' | 'DRAFT')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">فعال</SelectItem>
                    <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">تصاویر (آدرس‌ها، کمتر از ۵ تا)</label>
              <Input
                {...form.register('images')}
                placeholder="https://cdn.example.com/1.webp, https://cdn.example.com/2.webp"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                آدرس‌های مستقیم تصاویر را با ',' از هم جدا کنید. از /upload/images برای آپلود استفاده کنید.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ذخیره‌سازی…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> ثبت محصول
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                انصراف
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
