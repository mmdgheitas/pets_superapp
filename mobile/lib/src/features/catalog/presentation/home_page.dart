import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/product_card.dart';
import '../data/catalog_repository.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final banners = ref.watch(bannersProvider);
    final categories = ref.watch(categoriesProvider);
    final featured = ref.watch(featuredProductsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(bannersProvider);
        ref.invalidate(categoriesProvider);
        ref.invalidate(featuredProductsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          banners.when(
            data: (items) => items.isEmpty
                ? const SizedBox.shrink()
                : ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: AspectRatio(
                      aspectRatio: 3,
                      child: CachedNetworkImage(
                        imageUrl: items.first.imageUrl,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(color: Colors.black12),
                      ),
                    ),
                  ),
            loading: () => const SizedBox(height: 100, child: Center(child: CircularProgressIndicator())),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 16),
          Text('دسته‌بندی‌ها', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          SizedBox(
            height: 88,
            child: categories.when(
              data: (items) => ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) => InkWell(
                  onTap: () => context.push('/products?category=${items[i].slug}'),
                  child: Container(
                    width: 84,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.black12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(8),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(items[i].icon ?? '🐾', style: const TextStyle(fontSize: 24)),
                        const SizedBox(height: 4),
                        Text(items[i].name, style: Theme.of(context).textTheme.labelSmall),
                      ],
                    ),
                  ),
                ),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const Center(child: Text('خطا در بارگذاری')),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('پرفروش‌ترین‌ها', style: Theme.of(context).textTheme.titleMedium),
              TextButton(
                onPressed: () => context.push('/products?sort=best_selling'),
                child: const Text('مشاهده همه'),
              ),
            ],
          ),
          featured.when(
            data: (items) => GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 0.68,
              ),
              itemCount: items.length,
              itemBuilder: (context, i) => ProductCard(product: items[i]),
            ),
            loading: () => const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (_, __) => const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: Text('بارگذاری محصولات ناموفق بود')),
            ),
          ),
        ],
      ),
    );
  }
}
