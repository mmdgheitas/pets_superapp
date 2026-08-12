/**
 * Development seed: admin user, category tree, demo seller + products, banner.
 * Usage: DATABASE_URL=... npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Minimal env loader (no dotenv dependency): prefer .env.development, fall back to .env
for (const file of ['.env.development', '.env']) {
  const path = resolve(__dirname, '..', file);
  if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
    break;
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding…');

  const admin = await prisma.user.upsert({
    where: { phone: '09120000000' },
    update: { role: 'ADMIN' },
    create: { phone: '09120000000', fullName: 'مدیر سیستم', role: 'ADMIN' },
  });
  console.log('✔ admin user', admin.phone);

  const sellerUser = await prisma.user.upsert({
    where: { phone: '09121111111' },
    update: {},
    create: { phone: '09121111111', fullName: 'فروشنده نمونه', role: 'SELLER' },
  });
  const seller = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: { status: 'APPROVED', verifiedAt: new Date() },
    create: {
      userId: sellerUser.id,
      shopName: 'پت‌شاپ نمونه',
      shopSlug: 'demo-petshop',
      bio: 'فروشگاه نمایشی برای توسعه',
      status: 'APPROVED',
      verifiedAt: new Date(),
    },
  });
  console.log('✔ demo seller', seller.shopSlug);

  const cats: { name: string; slug: string; icon: string; children?: string[][] }[] = [
    { name: 'سگ', slug: 'dog', icon: '🐶', children: [['dog-food', 'غذای سگ'], ['dog-toys', 'اسباب‌بازی سگ'], ['dog-care', 'بهداشت سگ']] },
    { name: 'گربه', slug: 'cat', icon: '🐱', children: [['cat-food', 'غذای گربه'], ['cat-litter', 'خاک گربه'], ['cat-toys', 'اسباب‌بازی گربه']] },
    { name: 'پرنده', slug: 'bird', icon: '🐦', children: [['bird-food', 'غذای پرنده'], ['bird-cage', 'قفس و لوارم قفس']] },
    { name: 'ماهی', slug: 'fish', icon: '🐟', children: [['fish-food', 'غذای ماهی'], ['aquarium', 'آکواریوم و تجهیزات']] },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of cats) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, isActive: true },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon, sortOrder: 0 },
    });
    categoryIds[cat.slug] = parent.id;
    for (const [slug, name] of cat.children ?? []) {
      const child = await prisma.category.upsert({
        where: { slug },
        update: { name, isActive: true, parentId: parent.id },
        create: { name, slug, parentId: parent.id, sortOrder: 0 },
      });
      categoryIds[slug] = child.id;
    }
  }
  console.log(`✔ ${cats.length} parent categories + children`);

  const products = [
    {
      slug: 'royal-canin-maxi-adult-15kg',
      title: 'غذای خشک رویال کنین مکسی ادالت ۱۵ کیلوگرم',
      categoryId: categoryIds['dog-food'],
      price: 28_500_000,
      compareAtPrice: 32_000_000,
      stock: 12,
      description: 'غذای کامل مخصوص سگ‌های نژاد بزرگ بالای ۱۵ ماه؛ حاوی پروتئین با کیفیت بالا.',
      attributes: { brand: 'Royal Canin', weightKg: 15 },
      images: ['https://placehold.co/800x800/png?text=Royal+Canin+Maxi'],
    },
    {
      slug: 'cat-food-whiskas-chicken-1kg',
      title: 'غذای گربه ویسکاس با طعم مرغ ۱ کیلوگرم',
      categoryId: categoryIds['cat-food'],
      price: 3_200_000,
      stock: 40,
      description: 'غذای خشک گربه بالغ با طعم مرغ؛ غنی‌شده با ویتامین و مواد معدنی.',
      attributes: { brand: 'Whiskas', weightKg: 1 },
      images: ['https://placehold.co/800x800/png?text=Whiskas+Chicken'],
    },
    {
      slug: 'cat-litter-bentonite-10l',
      title: 'خاک گربه بنتونیت آنتی‌باکتریال ۱۰ لیتر',
      categoryId: categoryIds['cat-litter'],
      price: 1_450_000,
      stock: 60,
      description: 'خاک بهداشتی گربه با جذب بالای مایعات و کنترل بو؛ کم‌غبار.',
      attributes: { type: 'bentonite', volumeL: 10 },
      images: ['https://placehold.co/800x800/png?text=Cat+Litter'],
    },
    {
      slug: 'dog-chew-toy-rope',
      title: 'اسباب‌بازی جویدنی طنابی سگ',
      categoryId: categoryIds['dog-toys'],
      price: 380_000,
      compareAtPrice: 450_000,
      stock: 100,
      description: 'طناب جویدنی مقاوم برای بازی و تمیزکردن دندان‌های سگ.',
      attributes: { material: 'cotton' },
      images: ['https://placehold.co/800x800/png?text=Dog+Rope+Toy'],
    },
  ];

  for (const p of products) {
    const { images, ...data } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...data, status: 'ACTIVE', sellerId: seller.id },
      create: {
        ...data,
        sellerId: seller.id,
        status: 'ACTIVE',
        images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
      },
    });
    console.log('✔ product', product.slug);
  }

  await prisma.banner.upsert({
    where: { id: 'seed-banner-1' },
    update: {},
    create: {
      id: 'seed-banner-1',
      title: 'حراج تابستانه لوازم حیوانات خانگی',
      imageUrl: 'https://placehold.co/1200x400/png?text=Summer+Sale',
      linkUrl: '/products?sort=price_asc',
      position: 'home_top',
      sortOrder: 1,
    },
  });
  console.log('✔ banner');

  console.log('🌱 Seed complete');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
