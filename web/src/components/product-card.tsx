'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';
import { formatToman, toPersianDigits } from '@/lib/format';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from '@/lib/toast-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ProductCard as ProductCardType } from '@/lib/types';

export function ProductCard({ product }: { product: ProductCardType }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [adding, setAdding] = useState(false);

  const image = product.images?.[0]?.url;
  const hasDiscount = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / Number(product.compareAtPrice)) * 100)
    : 0;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 3;

  const quickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      router.push('/login');
      return;
    }
    setAdding(true);
    try {
      await api.post('/cart/items', { productId: product.id, quantity: 1 });
      window.dispatchEvent(new Event('cart:updated'));
      toast({ title: 'به سبد خرید اضافه شد', description: product.title, variant: 'success' });
    } catch (err) {
      toast({ title: 'افزودن به سبد ناموفق بود', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
        <div className="relative aspect-square bg-muted">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">🐾</div>
          )}

          <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
            {hasDiscount ? (
              <Badge variant="destructive" className="shadow-xs">
                ٪{toPersianDigits(discountPct)} تخفیف
              </Badge>
            ) : (
              <span />
            )}
          </div>

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 backdrop-blur-[1px]">
              <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-bold">ناموجود</span>
            </div>
          )}

          {!outOfStock && (
            <button
              onClick={quickAdd}
              disabled={adding}
              aria-label="افزودن سریع به سبد خرید"
              className={cn(
                'absolute bottom-2 start-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-raised',
                'translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100',
                'active:scale-90 disabled:opacity-60 sm:flex',
              )}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{product.title}</h3>
          <Rating value={product.ratingAvg} count={product.ratingCount} size="xs" />
          {product.seller?.shopName && (
            <p className="truncate text-xs text-muted-foreground">{product.seller.shopName}</p>
          )}
          <div className="mt-auto flex flex-col pt-1.5">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through num-tabular">
                {formatToman(product.compareAtPrice)}
              </span>
            )}
            <span className="text-base font-extrabold text-foreground num-tabular">
              {formatToman(product.price)}
            </span>
            {lowStock && (
              <span className="mt-0.5 text-[11px] font-medium text-warning">
                فقط {toPersianDigits(product.stock)} عدد باقی مانده
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
