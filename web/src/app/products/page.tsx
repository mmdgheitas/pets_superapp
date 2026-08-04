import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { serverGet } from '@/lib/server-api';
import type { Category, Paginated, ProductCard as ProductCardType } from '@/lib/types';
import { toPersianDigits } from '@/lib/format';
import { SearchForm } from './search-form';

export const revalidate = 60;

const SORTS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'best_selling', label: 'پرفروش‌ترین' },
  { value: 'top_rated', label: 'محبوب‌ترین' },
  { value: 'price_asc', label: 'ارزان‌ترین' },
  { value: 'price_desc', label: 'گران‌ترین' },
] as const;

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const sort = typeof params.sort === 'string' ? params.sort : 'newest';
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (category) query.set('category', category);
  query.set('sort', sort);
  query.set('page', String(page));
  query.set('limit', '16');

  const [products, categories] = await Promise.all([
    serverGet<Paginated<ProductCardType>>(`/products?${query.toString()}`),
    serverGet<Category[]>('/categories'),
  ]);

  const buildHref = (over: Record<string, string>) => {
    const next = new URLSearchParams(query);
    for (const [k, v] of Object.entries(over)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `/products?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">
          {q ? `نتایج جستجو برای «${q}»` : 'همه محصولات'}
        </h1>
        <SearchForm initialQ={q ?? ''} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={buildHref({ category: '', page: '1' })}>
          <Button variant={!category ? 'default' : 'outline'} size="sm">
            همه
          </Button>
        </Link>
        {(categories ?? []).map((cat) => (
          <Link key={cat.id} href={buildHref({ category: cat.slug, page: '1' })}>
            <Button variant={category === cat.slug ? 'default' : 'outline'} size="sm">
              {cat.icon} {cat.name}
            </Button>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        مرتب‌سازی:
        {SORTS.map((s) => (
          <Link
            key={s.value}
            href={buildHref({ sort: s.value, page: '1' })}
            className={sort === s.value ? 'font-bold text-primary' : 'hover:text-foreground'}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {products && products.data.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 pt-4">
            {page > 1 && (
              <Link href={buildHref({ page: String(page - 1) })}>
                <Button variant="outline">صفحه قبل</Button>
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              صفحه {toPersianDigits(page)} از {toPersianDigits(products.meta.totalPages)}
            </span>
            {page < products.meta.totalPages && (
              <Link href={buildHref({ page: String(page + 1) })}>
                <Button variant="outline">صفحه بعد</Button>
              </Link>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          محصولی مطابق جستجوی شما پیدا نشد.
        </p>
      )}
    </div>
  );
}
