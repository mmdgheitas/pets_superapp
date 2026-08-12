import Link from 'next/link';
import { ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { serverGet } from '@/lib/server-api';
import type { Category, Paginated, ProductCard as ProductCardType } from '@/lib/types';
import { toPersianDigits } from '@/lib/format';
import { SearchForm } from './search-form';
import { SortSelect } from './sort-select';
import { cn } from '@/lib/utils';

export const revalidate = 60;

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

  const activeCategory = categories?.find((c) => c.slug === category);

  const buildHref = (over: Record<string, string>) => {
    const next = new URLSearchParams(query);
    for (const [k, v] of Object.entries(over)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `/products?${next.toString()}`;
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-primary">خانه</Link>
        <ChevronLeft className="h-3 w-3" />
        <Link href="/products" className={cn(!category && !q && 'font-semibold text-foreground')}>
          محصولات
        </Link>
        {activeCategory && (
          <>
            <ChevronLeft className="h-3 w-3" />
            <span className="font-semibold text-foreground">{activeCategory.name}</span>
          </>
        )}
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-extrabold sm:text-2xl">
          {q ? `نتایج جستجو برای «${q}»` : activeCategory ? activeCategory.name : 'همه محصولات'}
          {products && (
            <span className="ms-2 text-sm font-normal text-muted-foreground">
              ({toPersianDigits(products.meta.total)} کالا)
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <SearchForm initialQ={q ?? ''} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Category filter rail — persistent context, one click away from any category
            (avoids the "back button tax" of nested menus) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-1 rounded-xl border bg-card p-3 shadow-xs">
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              دسته‌بندی‌ها
            </p>
            <Link
              href={buildHref({ category: '', page: '1' })}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
                !category ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground/80',
              )}
            >
              همه محصولات
            </Link>
            {(categories ?? []).map((cat) => (
              <Link
                key={cat.id}
                href={buildHref({ category: cat.slug, page: '1' })}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
                  category === cat.slug ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground/80',
                )}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </Link>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 lg:hidden">
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
            <div className="ms-auto">
              <SortSelect value={sort} />
            </div>
          </div>

          {products && products.data.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.data.map((p, i) => (
                  <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>

              {products.meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <Link
                    href={buildHref({ page: String(page - 1) })}
                    aria-disabled={page <= 1}
                    className={cn(page <= 1 && 'pointer-events-none opacity-40')}
                  >
                    <Button variant="outline" size="icon" aria-label="صفحه قبل">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <span className="text-sm font-medium text-muted-foreground num-tabular">
                    صفحه {toPersianDigits(page)} از {toPersianDigits(products.meta.totalPages)}
                  </span>
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    aria-disabled={page >= products.meta.totalPages}
                    className={cn(page >= products.meta.totalPages && 'pointer-events-none opacity-40')}
                  >
                    <Button variant="outline" size="icon" aria-label="صفحه بعد">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />}
              title="محصولی پیدا نشد"
              description="می‌توانید فیلترها را تغییر دهید یا عبارت دیگری را جستجو کنید."
              actionLabel="مشاهده همه محصولات"
              actionHref="/products"
            />
          )}
        </div>
      </div>
    </div>
  );
}
