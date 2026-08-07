import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_client.dart';
import '../domain/models.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>(
  (ref) => CatalogRepository(ref.read(dioProvider)),
);

class CatalogRepository {
  CatalogRepository(this._dio);
  final dynamic _dio;

  Future<List<Banner>> banners() async {
    final res = await _dio.get<List<dynamic>>('/banners');
    return res.data!
        .map((e) => Banner.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Category>> categories() async {
    List<Category> categoriesList = [];
    final res = await _dio.get<List<dynamic>>('/categories');
    final dumpList = res.data!
        .map((e) => Category.fromJson(e as Map<String, dynamic>))
        .toList();
    for (var c in dumpList) {
      final category = Category(
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
      );
      categoriesList.add(category);
    }
    return categoriesList;
  }

  Future<List<Product>> featured() async {
    final List<Product> items = [];
    final res = await _dio.get<List<dynamic>>('/products/featured');
    final dump = res.data!
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
    // items.addAll(dump as List<Product>);
    // return items;
    for (var p in dump) {
      final item = Product(
          id: p.id,
          title: p.title,
          slug: p.slug,
          price: p.price,
          stock: p.stock,
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
          soldCount: p.soldCount,
          images: p.images);
      items.add(item);
    }
    return items;
  }

  Future<Paginated<Product>> products({
    String? q,
    String? category,
    String sort = 'newest',
    int page = 1,
    int limit = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/products',
      queryParameters: {
        if (q != null && q.isNotEmpty) 'q': q,
        if (category != null) 'category': category,
        'sort': sort,
        'page': page,
        'limit': limit,
      },
    );
    final body = res.data!;
    final List<Product> itemsDump = [];
    final items = (body['data'] as List)
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
    for (var p in items) {
      final item = Product(
          id: p.id,
          title: p.title,
          slug: p.slug,
          price: p.price,
          stock: p.stock,
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
          soldCount: p.soldCount,
          images: p.images);
      itemsDump.add(item);
    }
    final meta = body['meta'] as Map<String, dynamic>;
    return Paginated(
      data: itemsDump,
      total: meta['total'] as int,
      page: meta['page'] as int,
      totalPages: meta['totalPages'] as int,
    );
  }

  Future<Product> productBySlug(String slug) async {
    final res = await _dio.get<Map<String, dynamic>>('/products/$slug');
    return Product.fromJson(res.data!);
  }
}

// Convenience providers for the home page
final bannersProvider =
    FutureProvider((ref) => ref.read(catalogRepositoryProvider).banners());
final categoriesProvider =
    FutureProvider((ref) => ref.read(catalogRepositoryProvider).categories());
final featuredProductsProvider =
    FutureProvider((ref) => ref.read(catalogRepositoryProvider).featured());
