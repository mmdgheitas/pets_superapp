import type { Metadata, Viewport } from 'next';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'پت‌شاپ — فروشگاه آنلاین حیوانات خانگی', template: '%s | پت‌شاپ' },
  description: 'خرید آنلاین غذا و لوازم سگ، گربه، پرنده و ماهی با ارسال سریع',
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
        <main className="container py-6">{children}</main>
        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          پت‌شاپ — پلتفرم خرید حیوانات خانگی · ساخته‌شده با ❤️ در ایران
        </footer>
      </body>
    </html>
  );
}
