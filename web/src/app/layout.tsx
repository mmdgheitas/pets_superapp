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
  themeColor: '#7c3aed',
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
      <body className="min-h-screen">
        <SiteHeader />
        <main id="main-content" className="container py-6 pb-24 lg:pb-10">
          {children}
        </main>

        <footer className="mt-10 border-t bg-card pb-20 lg:pb-0">
          <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 font-extrabold text-primary">
                <PawPrint className="h-6 w-6" />
                <span className="text-lg">پت‌شاپ</span>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                مرجع خرید آنلاین غذا، اسباب‌بازی و لوازم جانبی حیوانات خانگی در سراسر ایران.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <h3 className="font-bold">دسترسی سریع</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/products" className="transition-colors hover:text-primary">همه محصولات</Link></li>
                <li><Link href="/orders" className="transition-colors hover:text-primary">پیگیری سفارش</Link></li>
                <li><Link href="/profile" className="transition-colors hover:text-primary">حساب کاربری</Link></li>
              </ul>
            </div>

            <div className="space-y-3 text-sm">
              <h3 className="font-bold">همکاری با ما</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/seller" className="transition-colors hover:text-primary">فروش در پت‌شاپ</Link></li>
                <li><Link href="/login" className="transition-colors hover:text-primary">ورود فروشندگان</Link></li>
              </ul>
            </div>

            <div className="space-y-3 text-sm">
              <h3 className="font-bold">چرا پت‌شاپ؟</h3>
              <ul className="space-y-2.5 text-muted-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-success" /> پرداخت امن با زرین‌پال</li>
                <li className="flex items-center gap-2"><Truck className="h-4 w-4 shrink-0 text-success" /> ارسال سریع به سراسر کشور</li>
                <li className="flex items-center gap-2"><Headset className="h-4 w-4 shrink-0 text-success" /> پشتیبانی پاسخگو</li>
              </ul>
            </div>
          </div>
          <div className="border-t py-4 text-center text-xs text-muted-foreground">
            پت‌شاپ — پلتفرم خرید حیوانات خانگی · ساخته‌شده با ❤️ در ایران
          </div>
        </footer>

        <Toaster />
      </body>
    </html>
  );
}
