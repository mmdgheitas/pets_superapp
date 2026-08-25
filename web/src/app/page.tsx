import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Truck, RotateCcw, Headset, Star, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { serverGet } from '@/lib/server-api';
import type { Banner, Category, ProductCard as ProductCardType } from '@/lib/types';

export const revalidate = 60;

const TRUST_POINTS = [
  { icon: ShieldCheck, title: 'پرداخت ۱۰۰٪ امن', desc: 'درگاه مستقیم زرین‌پال' },
  { icon: Truck, title: 'ارسال سریع', desc: 'به سراسر کشور' },
  { icon: RotateCcw, title: 'ضمانت بازگشت کالا', desc: 'در صورت مغایرت' },
  { icon: Headset, title: 'پشتیبانی پاسخگو', desc: 'هر روز هفته' },
];

export default async function HomePage() {
  const [banners, categories, featured] = await Promise.all([
    serverGet<Banner[]>('/banners'),
    serverGet<Category[]>('/categories'),
    serverGet<ProductCardType[]>('/products/featured'),
  ]);

  const banner = banners?.[0];

  return (
    <div className="space-y-8 sm:space-y-10 lg:space-y-12">
      {/* Hero — warmth first (pitch screen #1) */}
      <section className="overflow-hidden rounded-2xl">
        {banner ? (
          <Link href={banner.linkUrl ?? '/products'} className="group relative block aspect-[16/7] w-full sm:aspect-[3/1]">
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              priority
              sizes="100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                <Sparkles className="h-3 w-3" /> بازارچه آنلاین حیوانات خانگی
              </span>
              <h2 className="font-display max-w-lg text-balance text-lg font-extrabold text-white sm:text-3xl">
                {banner.title}
              </h2>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-primary shadow-raised">
                مشاهده محصولات <ArrowLeft className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ) : (
          <div className="relative flex aspect-[16/9] flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-hover px-6 text-center text-primary-foreground sm:aspect-[3/1]">
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute -start-10 top-6 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
              <div className="absolute -end-8 bottom-0 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
            </div>
            <span className="text-5xl" aria-hidden>
              🐾
            </span>
            <h1 className="font-display text-balance text-2xl font-extrabold sm:text-3xl">
              هر چیزی که برای حیوان خانگی‌تان لازم دارید
            </h1>
            <p className="max-w-md text-sm text-white/85 sm:text-base">
              غذا، اسباب‌بازی و لوازم بهداشتی از فروشنده‌های تأییدشده — با پرداخت امن و ارسال سریع
            </p>
            <Link href="/products">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                شروع خرید <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
        {TRUST_POINTS.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-xs sm:gap-3 sm:p-3.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-bg text-success sm:h-10 sm:w-10">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold leading-snug sm:text-sm">{title}</p>
              <p className="truncate text-[11px] leading-snug text-muted-foreground sm:text-xs">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {categories && categories.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h2 className="font-display text-lg font-bold sm:text-xl">دسته‌بندی‌ها</h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card sm:gap-2 sm:p-4"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xl leading-none transition-transform group-hover:scale-110 sm:h-12 sm:w-12 sm:text-2xl">
                  {cat.icon ?? '🐾'}
                </span>
                <span className="line-clamp-2 text-[11px] font-semibold leading-snug sm:text-sm">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
          <div className="flex min-w-0 items-center gap-2">
            <Star className="h-5 w-5 shrink-0 fill-warning text-warning" />
            <h2 className="font-display text-lg font-bold sm:text-xl">پرفروش‌ترین‌ها</h2>
          </div>
          <Link href="/products?sort=best_selling" className="shrink-0">
            <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
              مشاهده همه <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        {featured && featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p, i) => (
              <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📦" title="فعلاً محصولی ثبت نشده" description="به‌زودی محصولات جدید اضافه می‌شوند." />
        )}
      </section>

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-primary/10 bg-secondary p-5 text-center sm:flex-row sm:justify-between sm:p-6 sm:text-start">
        <div className="min-w-0 space-y-1">
          <h3 className="font-display text-base font-bold text-secondary-foreground sm:text-lg">
            فروشنده لوازم حیوانات خانگی هستید؟
          </h3>
          <p className="text-sm leading-7 text-secondary-foreground/80">
            فروشگاه خود را رایگان راه‌اندازی کنید — تسویه شفاف، کمیسیون مشخص، دسترسی به هزاران مشتری.
          </p>
        </div>
        <Link href="/seller" className="w-full shrink-0 sm:w-auto">
          <Button variant="default" className="w-full sm:w-auto">
            شروع فروش
          </Button>
        </Link>
      </section>
    </div>
  );
}
