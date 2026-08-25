import type { Metadata, Viewport } from 'next';
import { SiteHeader } from '@/components/site-header';
import { Toaster } from '@/components/ui/toaster';
import { PawPrint, ShieldCheck, Headset, Truck } from 'lucide-react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'پت‌شاپ — فروشگاه آنلاین حیوانات خانگی', template: '%s | پت‌شاپ' },
  description: 'خرید آنلاین غذا و لوازم سگ، گربه، پرنده و ماهی با ارسال سریع و پرداخت امن زرین‌پال',
};

export const viewport: Viewport = {
  themeColor: '#1f6f68',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* Vazirmatn served by CDN at runtime (no build-time font downloads) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="min-h-screen" data-skin="customer">
        <SiteHeader />
        <main id="main-content" className="container py-5 pb-28 sm:py-6 lg:pb-12">
          {children}
        </main>

        <footer className="mt-8 border-t bg-card pb-24 lg:mt-12 lg:pb-0">
          <div className="container grid gap-8 py-8 sm:grid-cols-2 sm:py-10 lg:grid-cols-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 font-extrabold text-primary">
                <PawPrint className="h-6 w-6 shrink-0" />
                <span className="text-lg leading-none">پت‌شاپ</span>
              </div>
              <p className="max-w-xs text-sm leading-7 text-muted-foreground">
                مرجع خرید آنلاین غذا، اسباب‌بازی و لوازم جانبی حیوانات خانگی در سراسر ایران.
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              <h3 className="font-bold leading-none">دسترسی سریع</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/products" className="transition-colors hover:text-primary">همه محصولات</Link></li>
                <li><Link href="/orders" className="transition-colors hover:text-primary">پیگیری سفارش</Link></li>
                <li><Link href="/profile" className="transition-colors hover:text-primary">حساب کاربری</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5 text-sm">
              <h3 className="font-bold leading-none">همکاری با ما</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/seller" className="transition-colors hover:text-primary">فروش در پت‌شاپ</Link></li>
                <li><Link href="/login" className="transition-colors hover:text-primary">ورود فروشندگان</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5 text-sm">
              <h3 className="font-bold leading-none">چرا پت‌شاپ؟</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> پرداخت امن با زرین‌پال</li>
                <li className="flex items-start gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> ارسال سریع به سراسر کشور</li>
                <li className="flex items-start gap-2"><Headset className="mt-0.5 h-4 w-4 shrink-0 text-success" /> پشتیبانی پاسخگو</li>
              </ul>
            </div>
          </div>
          <div className="border-t px-4 py-3.5 text-center text-xs leading-relaxed text-muted-foreground">
            پت‌شاپ — پلتفرم خرید حیوانات خانگی · ساخته‌شده با ❤️ در ایران
          </div>
        </footer>

        <Toaster />
      </body>
    </html>
  );
}
