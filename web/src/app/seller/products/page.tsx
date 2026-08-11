'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, Package, Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductGridSkeleton } from '@/components/product-card-skeleton';
import { api, errorMessage } from '@/lib/api';
import { toPersianDigits, formatToman } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import type { ProductCard } from '@/lib/types';

const STATUS_LABELS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  ACTIVE: { label: 'فعال', variant: 'success' },
  DRAFT: { label: 'پیش‌نویس', variant: 'warning' },
  INACTIVE: { label: 'غیرفعال', variant: 'outline' },
  REJECTED: { label: 'رد شده', variant: 'destructive' },
};

export default function SellerProductsPage() {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ProductCard[]>('/products/mine');
      setProducts(data);
    } catch (e) {
      toast({ title: 'بارگذاری محصولات ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      search === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const deleteProduct = async (id: string) => {
    if (!window.confirm('آیا مطمئنید که می‌خواهید این محصول را حذف/غیرفعال کنید؟')) return;
    setDeletingId(id);
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'محصول حذف شد' });
    } catch (e) {
      toast({ title: 'حذف ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <ProductGridSkeleton count={6} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">محصولات من</h1>
          <p className="mt-1 text-sm text-muted-foreground num-tabular">
            {toPersianDigits(products.length)} محصول ثبت‌شده
          </p>
        </div>
        <Link href="/seller/products/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> محصول جدید
          </Button>
        </Link>
      </div>

      <Input
        placeholder="جستجو در عنوان یا دسته‌بندی…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        startIcon={<Search className="h-4 w-4" />}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="mx-auto h-12 w-12 text-muted-foreground" />}
          title={search ? 'محصولی با این جستجو یافت نشد' : 'هنوز محصولی ثبت نکرده‌اید'}
          actionLabel={search ? undefined : 'ثبت اولین محصول'}
          actionHref={search ? undefined : '/seller/products/new'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const status = STATUS_LABELS[product.status] ?? { label: product.status, variant: 'outline' as const };
            return (
              <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-raised">
                <div className="relative aspect-square bg-muted">
                  {product.images?.[0] ? (
                    <Image src={product.images[0].url} alt={product.title} fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">🐾</div>
                  )}
                </div>
                <CardContent className="space-y-1.5 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {product.stock === 0 && <Badge variant="destructive">بدون موجودی</Badge>}
                  </div>
                  <h3 className="line-clamp-2 min-h-10 text-sm font-medium">{product.title}</h3>
                  <p className="text-xs text-muted-foreground">{product.category?.name ?? 'دسته‌بندی نشده'}</p>
                  <p className="text-base font-extrabold num-tabular">{formatToman(product.price)}</p>
                  <p className="text-xs text-muted-foreground num-tabular">
                    {toPersianDigits(product.soldCount)} فروش · امتیاز {toPersianDigits(product.ratingAvg.toFixed(1))}
                  </p>
                  <div className="flex gap-2 pt-1.5">
                    <Link href={`/seller/products/${product.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full gap-1">
                        <Edit className="h-3.5 w-3.5" /> ویرایش
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive-bg hover:text-destructive"
                      onClick={() => deleteProduct(product.id)}
                      disabled={deletingId === product.id}
                      aria-label="حذف محصول"
                    >
                      {deletingId === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
