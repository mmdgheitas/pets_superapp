'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageSpinner } from '@/components/ui/page-spinner';
import { ProductImagesField } from '@/components/product-images-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { api, errorMessage } from '@/lib/api';
import { toast } from '@/lib/toast-store';
import type { Category, ProductCard, ProductDetail } from '@/lib/types';

const editSchema = z.object({
  title: z.string().min(3, 'عنوان حداقل ۳ کاراکتر باشد').max(200),
  categoryId: z.string().uuid('دسته‌بندی معتبر نیست'),
  description: z.string().min(10, 'توضیحات حداقل ۱۰ کاراکتر باشد'),
  price: z.string().min(1).refine((v) => { const n = parseInt(v, 10); return !isNaN(n) && n >= 1000; }, 'حداقل ۱۰۰۰ ریال'),
  compareAtPrice: z.string().min(1).optional(),
  stock: z.string().min(1).refine((v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0, 'شماره معتبر نیست'),
  status: z.enum(['ACTIVE', 'DRAFT', 'INACTIVE']),
  images: z.string().optional(),
});

type FormData = z.infer<typeof editSchema>;

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      description: '',
      price: '',
      compareAtPrice: '',
      stock: '',
      status: 'ACTIVE',
      images: '',
    },
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [prod, cats] = await Promise.all([
        // /mine/:id (not the public :slug lookup) so drafts/inactive listings
        // the seller owns are still editable, not just live ACTIVE ones
        api.get<ProductDetail>(`/products/mine/${resolved.id}`),
        api.get<Category[]>('/categories'),
      ]);
      setProduct(prod.data);
      setCategories(cats.data ?? []);
      if (prod.data) {
        form.reset({
          title: prod.data.title,
          categoryId: prod.data.category?.id ?? '',
          description: prod.data.description ?? '',
          price: String(prod.data.price),
          compareAtPrice: prod.data.compareAtPrice ? String(prod.data.compareAtPrice) : '',
          stock: String(prod.data.stock),
          status: prod.data.status as 'ACTIVE' | 'DRAFT' | 'INACTIVE',
          images: prod.data.images?.map((i) => i.url).join(', ') ?? '',
        });
      }
    } catch (e) {
      setLoadError(errorMessage(e, 'بارگذاری محصول ناموفق بود'));
    } finally {
      setLoading(false);
    }
  };

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
      const { data: updated } = await api.patch<ProductCard>(`/products/${resolved.id}`, payload);
      toast({ title: 'تغییرات ذخیره شد', variant: 'success' });
      router.push(`/seller/products/${updated.id}`);
    } catch (e) {
      toast({ title: 'بروزرسانی ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  if (loadError && !product) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-3 text-lg font-bold">خطا</p>
        <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        <Button className="mt-4" onClick={loadData}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="gap-1.5 -ms-3">
        <ArrowRight className="h-4 w-4" /> بازگشت
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>ویرایش محصول</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field label="عنوان" required error={form.formState.errors.title?.message}>
              <Input {...form.register('title')} />
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
              <Textarea {...form.register('description')} rows={4} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="قیمت (ریال)" required error={form.formState.errors.price?.message}>
                <Input {...form.register('price')} inputMode="numeric" dir="ltr" />
              </Field>
              <Field label="قیمت قبل از تخفیف (ریال)">
                <Input {...form.register('compareAtPrice')} inputMode="numeric" dir="ltr" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="موجودی" required error={form.formState.errors.stock?.message}>
                <Input {...form.register('stock')} inputMode="numeric" dir="ltr" />
              </Field>
              <Field label="وضعیت">
                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as 'ACTIVE' | 'DRAFT' | 'INACTIVE')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">فعال</SelectItem>
                    <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
                    <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="تصاویر محصول">
              <ProductImagesField value={form.watch('images') ?? ''} onChange={(v) => form.setValue('images', v)} />
            </Field>

            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={submitting} className="flex-1 gap-1.5">
                <Save className="h-4 w-4" /> ذخیره تغییرات
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
