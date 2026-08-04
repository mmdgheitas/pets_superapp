import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { serverGet } from '@/lib/server-api';
import type { Banner, Category, ProductCard as ProductCardType } from '@/lib/types';

export const revalidate = 60;

export default async function HomePage() {
  const [banners, categories, featured] = await Promise.all([
    serverGet<Banner[]>('/banners'),
    serverGet<Category[]>('/categories'),
    serverGet<ProductCardType[]>('/products/featured'),
  ]);

  return (
    <div className="space-y-10">
      {banners && banners.length > 0 && (
        <section className="overflow-hidden rounded-xl">
          <Link href={banners[0].linkUrl ?? '/products'} className="relative block aspect-[3/1] w-full">
            <Image
              src={banners[0].imageUrl}
              alt={banners[0].title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <h2 className="text-lg font-bold text-white">{banners[0].title}</h2>
            </div>
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">دسته‌بندی‌ها</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {(categories ?? []).slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 transition-shadow hover:shadow"
            >
              <span className="text-3xl">{cat.icon ?? '🐾'}</span>
              <span className="text-sm font-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">پرفروش‌ترین‌ها</h2>
          <Link href="/products?sort=best_selling">
            <Button variant="link">مشاهده همه ←</Button>
          </Link>
        </div>
        {featured && featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            فعلاً محصولی ثبت نشده است — به‌زودی!
          </p>
        )}
      </section>
    </div>
  );
}
