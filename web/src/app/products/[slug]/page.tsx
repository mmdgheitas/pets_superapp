import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star } from 'lucide-react';
import { serverGet } from '@/lib/server-api';
import { formatDate, formatToman, toPersianDigits } from '@/lib/format';
import type { ProductDetail } from '@/lib/types';
import { AddToCartButton } from './add-to-cart';

export const revalidate = 60;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await serverGet<ProductDetail>(`/products/${slug}`);
  if (!product) notFound();

  const hasDiscount = product.compareAtPrice != null && product.compareAtPrice > product.price;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        {product.images?.[0]?.url ? (
          <Image
            src={product.images[0].url}
            alt={product.title}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-8xl">🐾</div>
        )}
      </div>

      <div className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          {product.category?.name} · {product.seller?.shopName}
        </nav>
        <h1 className="text-2xl font-bold leading-relaxed">{product.title}</h1>

        <div className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          {toPersianDigits(product.ratingAvg.toFixed(1))}
          <span className="text-muted-foreground">
            ({toPersianDigits(product.ratingCount)} دیدگاه) · {toPersianDigits(product.soldCount)}{' '}
            فروش
          </span>
        </div>

        <p className="whitespace-pre-line leading-8 text-foreground/90">{product.description}</p>

        {product.attributes && Object.keys(product.attributes).length > 0 && (
          <ul className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm">
            {Object.entries(product.attributes).map(([key, value]) => (
              <li key={key} className="flex justify-between gap-2 border-b pb-1 last:border-0">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium">{String(value)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg bg-card p-4">
          {hasDiscount && (
            <div className="text-sm text-muted-foreground line-through">
              {formatToman(product.compareAtPrice)}
            </div>
          )}
          <div className="text-2xl font-bold text-primary">{formatToman(product.price)}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {product.stock > 0 ? `موجودی: ${toPersianDigits(product.stock)} عدد` : 'ناموجود'}
          </div>
          <AddToCartButton productId={product.id} disabled={product.stock <= 0} />
        </div>
      </div>

      {product.reviews && product.reviews.length > 0 && (
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">دیدگاه خریداران</h2>
          <ul className="space-y-3">
            {product.reviews.map((review) => (
              <li key={review.id} className="rounded-lg border bg-card p-4">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="font-medium">{review.user.fullName ?? 'کاربر'}</span>
                  <span className="text-yellow-500">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                {review.comment && <p className="text-sm leading-7">{review.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
