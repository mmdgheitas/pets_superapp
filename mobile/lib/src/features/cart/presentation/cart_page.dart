import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/utils/persian.dart';
import '../../auth/auth_providers.dart';
import '../cart_providers.dart';

class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final cart = ref.watch(cartProvider);

    if (!auth.isLoggedIn) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('برای مشاهده سبد خرید وارد شوید'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.push('/login'),
              child: const Text('ورود'),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('سبد خرید')),
      body: cart.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('خطا در بارگذاری سبد: $e')),
        data: (data) {
          if (data.items.isEmpty) {
            return const Center(child: Text('🛒\nسبد خرید شما خالی است', textAlign: TextAlign.center));
          }
          return Column(
            children: [
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: data.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final item = data.items[i];
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(8),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: SizedBox(
                                width: 64,
                                height: 64,
                                child: item.imageUrl != null
                                    ? CachedNetworkImage(imageUrl: item.imageUrl!, fit: BoxFit.cover)
                                    : const Center(child: Text('🐾')),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                                  if (!item.available)
                                    Text('موجودی کافی نیست', style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        icon: const Icon(Icons.remove_circle_outline),
                                        onPressed: () => ref
                                            .read(cartProvider.notifier)
                                            .updateQuantity(item.id, item.quantity > 1 ? item.quantity - 1 : 1),
                                      ),
                                      Text(toPersianDigits(item.quantity)),
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        icon: const Icon(Icons.add_circle_outline),
                                        onPressed: () => ref
                                            .read(cartProvider.notifier)
                                            .updateQuantity(item.id, item.quantity + 1),
                                      ),
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        icon: const Icon(Icons.delete_outline),
                                        onPressed: () => ref.read(cartProvider.notifier).remove(item.id),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              formatToman(item.lineTotal),
                              style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              SafeArea(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    boxShadow: [BoxShadow(blurRadius: 8, color: Colors.black12)],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('جمع (${toPersianDigits(data.itemCount)} کالا)'),
                          Text(
                            formatToman(data.subtotal),
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      FilledButton(
                        onPressed: () => context.push('/checkout'),
                        child: const Text('ادامه خرید'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
