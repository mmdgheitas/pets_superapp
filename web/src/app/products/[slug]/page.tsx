import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ShieldCheck, Truck, RotateCcw, Store } from 'lucide-react';
import { serverGet } from '@/lib/server-api';
import { formatDate, formatToman, toPersianDigits } from '@/lib/format';
import type { Paginated, ProductCard as ProductCardType, ProductDetail } from '@/lib/types';
import { AddToCartButton } from './add-to-cart';
import { Rating } from '@/components/ui/rating';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { ProductCard } from '@/components/product-card';

export const revalidate = 60;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await serverGet<ProductDetail>(`/products/${slug}`);
  if (!product) notFound();

  const hasDiscount = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / Number(product.compareAtPrice)) * 100)
    : 0;
  const outOfStock = product.stock <= 0;
  const images = product.images?.length ? product.images : [];

  const related = product.category?.slug
    ? await serverGet<Paginated<ProductCardType>>(
        `/products?category=${product.category.slug}&limit=5`,
      )
    : null;
  const relatedProducts = (related?.data ?? []).filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="space-y-8 sm:space-y-10">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-primary">خانه</Link>
        <ChevronLeft className="h-3 w-3 shrink-0" />
        <Link href="/products" className="transition-colors hover:text-primary">محصولات</Link>
        {product.category && (
          <>
            <ChevronLeft className="h-3 w-3 shrink-0" />
            <Link href={`/products?category=${product.category.slug}`} className="transition-colors hover:text-primary">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronLeft className="h-3 w-3 shrink-0" />
        <span className="line-clamp-1 min-w-0 font-medium text-foreground">{product.title}</span>
      </nav>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
            {images[0]?.url ? (
              <Image
                src={images[0].url}
                alt={product.title}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-8xl">🐾</div>
            )}
            {hasDiscount && (
              <Badge variant="destructive" className="absolute start-3 top-3 text-sm shadow-xs">
                ٪{toPersianDigits(discountPct)} تخفیف
              </Badge>
            )}
          </div>
          {images.length > 1 && (
            <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((img) => (
                <div key={img.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted sm:h-20 sm:w-20">
                  <Image src={img.url} alt={product.title} fill className="object-cover" sizes="80px" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-5">
          <div className="space-y-2">
            {product.seller?.shopName && (
              <Link
                href={`/products?category=${product.category?.slug ?? ''}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <Store className="h-3.5 w-3.5 shrink-0" />
                {product.seller.shopName}
              </Link>
            )}
            <h1 className="font-display text-balance text-xl font-extrabold leading-snug sm:text-2xl">
              {product.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <Rating value={product.ratingAvg} count={product.ratingCount} size="sm" />
              <span className="hidden text-muted-foreground sm:inline">·</span>
              <span className="text-muted-foreground">{toPersianDigits(product.soldCount)} فروش</span>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-card sm:p-5">
            <div className="space-y-1">
              {hasDiscount && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="line-through num-tabular">{formatToman(product.compareAtPrice)}</span>
                  <Badge variant="destructive">٪{toPersianDigits(discountPct)}−</Badge>
                </div>
              )}
              <div className="text-2xl font-extrabold leading-tight text-foreground num-tabular sm:text-3xl">
                {formatToman(product.price)}
              </div>
            </div>

            <div className="space-y-1.5">
              {outOfStock ? (
                <Badge variant="destructive">ناموجود</Badge>
              ) : product.stock <= 5 ? (
                <Badge variant="warning">فقط {toPersianDigits(product.stock)} عدد باقی مانده</Badge>
              ) : (
                <Badge variant="success">
                  موجود — {toPersianDigits(product.stock)} عدد در انبار
                </Badge>
              )}
              {!outOfStock && product.stock <= 5 && (
                <p className="text-xs text-warning">موجودی واقعی از سیستم رزرو — همین حالا رزرو کنید.</p>
              )}
            </div>

            <AddToCartButton productId={product.id} stock={product.stock} disabled={outOfStock} />

            <ul className="grid grid-cols-1 gap-2 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-3">
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 shrink-0 text-success" /> پرداخت امن زرین‌پال</li>
              <li className="flex items-center gap-1.5"><Truck className="h-4 w-4 shrink-0 text-success" /> ارسال سریع</li>
              <li className="flex items-center gap-1.5"><RotateCcw className="h-4 w-4 shrink-0 text-success" /> امکان مرجوعی</li>
            </ul>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="description"
        tabs={[
          {
            value: 'description',
            label: 'توضیحات',
            content: (
              <p className="whitespace-pre-line text-[15px] leading-8 text-foreground/90">
                {product.description || 'توضیحی برای این محصول ثبت نشده است.'}
              </p>
            ),
          },
          {
            value: 'attributes',
            label: 'مشخصات فنی',
            content:
              product.attributes && Object.keys(product.attributes).length > 0 ? (
                <ul className="divide-y overflow-hidden rounded-lg border text-sm">
                  {Object.entries(product.attributes).map(([key, value]) => (
                    <li key={key} className="flex justify-between gap-4 bg-card px-4 py-3 odd:bg-muted/40">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">{String(value)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">مشخصاتی ثبت نشده است.</p>
              ),
          },
          {
            value: 'reviews',
            label: `دیدگاه‌ها (${toPersianDigits(product.ratingCount)})`,
            content:
              product.reviews && product.reviews.length > 0 ? (
                <ul className="space-y-3">
                  {product.reviews.map((review) => (
                    <li key={review.id} className="rounded-xl border bg-card p-4">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-bold">{review.user.fullName ?? 'کاربر پت‌شاپ'}</span>
                        <Rating value={review.rating} size="xs" />
                        <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                      </div>
                      {review.comment && <p className="text-sm leading-7 text-foreground/90">{review.comment}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">هنوز دیدگاهی برای این محصول ثبت نشده است.</p>
              ),
          },
        ]}
      />

      {relatedProducts.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold sm:mb-4">محصولات مشابه</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
