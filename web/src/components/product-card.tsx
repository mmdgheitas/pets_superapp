import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatToman, toPersianDigits } from '@/lib/format';
import type { ProductCard as ProductCardType } from '@/lib/types';

export function ProductCard({ product }: { product: ProductCardType }) {
  const image = product.images?.[0]?.url;
  const hasDiscount = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / Number(product.compareAtPrice)) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-square bg-muted">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">🐾</div>
          )}
          {hasDiscount && (
            <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
              ٪{toPersianDigits(discountPct)} تخفیف
            </span>
          )}
          {product.stock <= 0 && (
            <span className="absolute inset-x-0 bottom-0 bg-foreground/70 py-1 text-center text-xs text-background">
              ناموجود
            </span>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium">{product.title}</h3>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {toPersianDigits(product.ratingAvg.toFixed(1))} · {product.seller?.shopName}
          </div>
          <div className="mt-2 flex flex-col">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatToman(product.compareAtPrice)}
              </span>
            )}
            <span className="font-bold text-primary">{formatToman(product.price)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
