import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_client.dart';
import '../../../shared/utils/persian.dart';
import '../../auth/auth_providers.dart';
import '../../cart/cart_providers.dart';
import '../data/catalog_repository.dart';
import '../domain/models.dart';

final _productProvider = FutureProvider.family<Product, String>(
  (ref, slug) => ref.read(catalogRepositoryProvider).productBySlug(slug),
);

class ProductDetailPage extends ConsumerWidget {
  const ProductDetailPage({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(_productProvider(slug));

    return Scaffold(
      appBar: AppBar(title: const Text('جزئیات محصول')),
      body: product.when(
        data: (p) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: p.thumbnail != null
                    ? CachedNetworkImage(imageUrl: p.thumbnail!, fit: BoxFit.cover)
                    : const Center(child: Text('🐾', style: TextStyle(fontSize: 72))),
              ),
            ),
            const SizedBox(height: 16),
            Text(p.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              '${p.categoryName ?? ''} · ${p.shopName ?? ''} · ${toPersianDigits(p.soldCount)} فروش',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            if (p.description != null) Text(p.description!, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (p.compareAtPrice != null && p.compareAtPrice! > p.price)
                      Text(
                        formatToman(p.compareAtPrice!),
                        style: const TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey),
                      ),
                    Text(
                      formatToman(p.price),
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Text(p.stock > 0 ? 'موجودی: ${toPersianDigits(p.stock)}' : 'ناموجود'),
              ],
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.shopping_cart_outlined),
              label: const Text('افزودن به سبد خرید'),
              onPressed: p.stock <= 0
                  ? null
                  : () async {
                      if (!ref.read(authProvider).isLoggedIn) {
                        Navigator.of(context).pushNamed('/login');
                        return;
                      }
                      try {
                        await ref.read(cartProvider.notifier).add(p.id);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('به سبد خرید اضافه شد ✓')),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(apiErrorMessage(e))),
                          );
                        }
                      }
                    },
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('محصول یافت نشد')),
      ),
    );
  }
}
