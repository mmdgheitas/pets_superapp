'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageSpinner } from '@/components/ui/page-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { toast } from '@/lib/toast-store';
import type { Category, ProductCard } from '@/lib/types';
import { Field } from '../field';
import { ImagesUrlsInput } from '../images-urls-input';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { compareAtPrice: '', images: '', status: 'ACTIVE' },
  });

  useEffect(() => {
    api
      .get<Category[]>('/categories')
      .then((res) => setCategories(res.data ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (data: FormData) => {
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
      toast({ title: 'محصول ثبت شد', variant: 'success' });
      router.push(`/seller/products/${product.id}`);
    } catch (e) {
      toast({ title: 'ثبت محصول ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="gap-1.5 -ms-3">
        <ArrowRight className="h-4 w-4" /> بازگشت
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>ثبت محصول جدید</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field label="عنوان" required error={form.formState.errors.title?.message}>
              <Input {...form.register('title')} placeholder="غذای خشک سگ رویال کنین ۱۵ کیلویی" />
            </Field>

            <Field label="دسته‌بندی" required error={form.formState.errors.categoryId?.message}>
              <Select value={form.watch('categoryId')} onValueChange={(v) => form.setValue('categoryId', v, { shouldValidate: true })}>
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
            </Field>

            <Field label="توضیحات" required error={form.formState.errors.description?.message}>
              <Textarea {...form.register('description')} placeholder="توضیحات کامل محصول، ویژگی‌ها، نکات بهداشتی و…" rows={4} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="قیمت (ریال)" required error={form.formState.errors.price?.message}>
                <Input {...form.register('price')} placeholder="۲۸۵۰۰۰۰" inputMode="numeric" dir="ltr" />
              </Field>
              <Field label="قیمت قبل از تخفیف (ریال)">
                <Input {...form.register('compareAtPrice')} placeholder="۳۴۰۰۰۰۰" inputMode="numeric" dir="ltr" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="موجودی" required error={form.formState.errors.stock?.message}>
                <Input {...form.register('stock')} placeholder="۱۲" inputMode="numeric" dir="ltr" />
              </Field>
              <Field label="وضعیت">
                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as 'ACTIVE' | 'DRAFT')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">فعال (نمایش عمومی)</SelectItem>
                    <SelectItem value="DRAFT">پیش‌نویس (فقط شما می‌بینید)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="تصاویر (آدرس‌ها، حداکثر ۵ تا)">
              <ImagesUrlsInput {...form.register('images')} value={form.watch('images') ?? ''} />
              <p className="text-xs text-muted-foreground">
                آدرس‌های مستقیم تصاویر را با «,» از هم جدا کنید. از /upload/images برای آپلود استفاده کنید.
              </p>
            </Field>

            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={submitting} className="flex-1 gap-1.5">
                <Upload className="h-4 w-4" /> ثبت محصول
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
