'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, Package, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits, formatToman, formatDate } from '@/lib/format';
import type { ProductCard } from '@/lib/types';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'فعال', cls: 'bg-green-100 text-green-800' },
  DRAFT: { label: 'پیش‌نویس', cls: 'bg-yellow-100 text-yellow-800' },
  INACTIVE: { label: 'غیرفعال', cls: 'bg-gray-200 text-gray-700' },
  REJECTED: { label: 'رد شده', cls: 'bg-red-100 text-red-800' },
};

export default function SellerProductsPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return; }
    if (!user) return;
    if (user.role !== 'SELLER') { router.replace('/'); return; }
    loadProducts();
  }, [accessToken, user, router]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ProductCard[]>('/products/mine');
      setProducts(data);
    } catch (e) {
      setError(errorMessage(e, 'بارگذاری محصولات ناموفق بود'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter((p) =>
    search === '' ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteProduct = async (id: string) => {
    if (!confirm('آیا مطمئنید که می‌خواهید این محصول را حذف/غیرفعال کنید؟')) return;
    setDeletingId(id);
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(errorMessage(e, 'حذف ناموفق بود'));
    } finally {
      setDeletingId(null);
    }
  };

  const getStatus = (status: string) => STATUS_LABELS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-800' };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">محصولات من</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length} محصول — فقط محصولات ثبت‌شده توسط شما
            </p>
          </div>
          <Button onClick={() => router.push('/seller/products/new')}>
            <Plus className="mr-2 h-4 w-4" /> محصول جدید
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="جستجو در عنوان یا دسته‌بندی…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground">
            {filtered.length} از {products.length}
          </span>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-lg font-medium">هیچ محصولی یافت نشد</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? ' با این جستجوی خاص' : ''}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => router.push('/seller/products/new')}>
                <Plus className="mr-2 h-4 w-4" /> ثبت محصول اول
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const status = getStatus(product.status);
            return (
              <Card key={product.id} className="transition-all hover:shadow-md">
                <CardContent className="p-0">
                  {/* Image */}
                  <div className="aspect-square bg-muted overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-muted-foreground">
                        🐾
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                      {product.stock === 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
                          موجودی منتهی
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium line-clamp-2">{product.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.category?.name ?? 'دسته‌بندی نشده'}
                    </p>
                    <p className="mt-2 text-base font-bold text-primary">
                      {formatToman(product.price)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.soldCount} فروش · امتیاز {product.ratingAvg.toFixed(1)}
                    </p>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/seller/products/${product.id}`)}
                      >
                        <Edit className="mr-1 h-3.5 w-3.5" /> ویرایش
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteProduct(product.id)}
                        disabled={deletingId === product.id}
                        title="حذف/غیرفعال کردن"
                      >
                        {deletingId === product.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Back link */}
      <div className="flex justify-start">
        <Button variant="link" onClick={() => router.back()}>
          ← برگشت به داشبورد
        </Button>
      </div>
    </div>
  );
}
