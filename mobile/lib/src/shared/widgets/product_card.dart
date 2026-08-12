import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/catalog/domain/models.dart';
import '../utils/persian.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasDiscount =
        product.compareAtPrice != null && product.compareAtPrice! > product.price;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/products/${product.slug}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  product.thumbnail != null
                      ? CachedNetworkImage(
                          imageUrl: product.thumbnail!,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => const Center(child: Text('🐾', style: TextStyle(fontSize: 32))),
                          errorWidget: (_, __, ___) => const Center(child: Text('🐾', style: TextStyle(fontSize: 32))),
                        )
                      : const Center(child: Text('🐾', style: TextStyle(fontSize: 32))),
                  if (hasDiscount)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.error,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '٪${toPersianDigits((100 * (1 - product.price / product.compareAtPrice!)).round())}',
                          style: TextStyle(color: theme.colorScheme.onError, fontSize: 11),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  if (hasDiscount)
                    Text(
                      formatToman(product.compareAtPrice!),
                      style: theme.textTheme.labelSmall?.copyWith(
                        decoration: TextDecoration.lineThrough,
                        color: theme.hintColor,
                      ),
                    ),
                  Text(
                    formatToman(product.price),
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
