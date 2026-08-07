import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../features/auth/auth_providers.dart';

class CartItem {
  CartItem({
    required this.id,
    required this.productId,
    required this.title,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
    required this.available,
    this.imageUrl,
    this.slug,
    this.stock,
  });

  final String id;
  final String productId;
  final String title;
  final int quantity;
  final num unitPrice;
  final num lineTotal;
  final bool available;
  final String? imageUrl;
  final String? slug;
  final int? stock;

  factory CartItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>? ?? {};
    return CartItem(
      id: json['id'] as String,
      productId: json['productId'] as String,
      title: product['title'] as String? ?? '',
      quantity: json['quantity'] as int,
      unitPrice: product['price'] as num? ?? 0,
      lineTotal: json['lineTotal'] as num? ?? 0,
      available: json['available'] as bool? ?? true,
      imageUrl: product['imageUrl'] as String?,
      slug: product['slug'] as String?,
      stock: product['stock'] as int?,
    );
  }
}

class Cart {
  Cart({required this.items, required this.itemCount, required this.subtotal});
  final List<CartItem> items;
  final int itemCount;
  final num subtotal;

  factory Cart.fromJson(Map<String, dynamic> json) => Cart(
        items: ((json['items'] as List?) ?? [])
            .map((e) => CartItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        itemCount: json['itemCount'] as int? ?? 0,
        subtotal: json['subtotal'] as num? ?? 0,
      );
}

class CartNotifier extends StateNotifier<AsyncValue<Cart>> {
  CartNotifier(this.ref) : super(const AsyncValue.loading()) {
    ref.listen(authProvider, (prev, next) {
      if (next.isLoggedIn != (prev?.isLoggedIn ?? false)) load();
    });
    load();
  }

  final Ref ref;

  Future<void> load() async {
    if (!ref.read(authProvider).isLoggedIn) {
      state = AsyncValue.data(Cart(items: const [], itemCount: 0, subtotal: 0));
      return;
    }
    try {
      final res = await ref.read(dioProvider).get<Map<String, dynamic>>('/cart');
      state = AsyncValue.data(Cart.fromJson(res.data!));
    } catch (e, s) {
      state = AsyncValue.error(e, s);
    }
  }

  Future<void> add(String productId, {int quantity = 1}) async {
    final res = await ref.read(dioProvider).post<Map<String, dynamic>>(
      '/cart/items',
      data: {'productId': productId, 'quantity': quantity},
    );
    state = AsyncValue.data(Cart.fromJson(res.data!));
  }

  Future<void> updateQuantity(String itemId, int quantity) async {
    final res = await ref.read(dioProvider).patch<Map<String, dynamic>>(
      '/cart/items/$itemId',
      data: {'quantity': quantity},
    );
    state = AsyncValue.data(Cart.fromJson(res.data!));
  }

  Future<void> remove(String itemId) async {
    final res = await ref.read(dioProvider).delete<Map<String, dynamic>>('/cart/items/$itemId');
    state = AsyncValue.data(Cart.fromJson(res.data!));
  }

  Future<void> clear() async {
    final res = await ref.read(dioProvider).delete<Map<String, dynamic>>('/cart');
    state = AsyncValue.data(Cart.fromJson(res.data!));
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, AsyncValue<Cart>>(
  CartNotifier.new,
);
