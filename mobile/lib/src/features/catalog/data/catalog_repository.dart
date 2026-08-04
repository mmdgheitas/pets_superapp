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
    return res.data!.map((e) => Banner.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Category>> categories() async {
    final res = await _dio.get<List<dynamic>>('/categories');
    return res.data!.map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> featured() async {
    final res = await _dio.get<List<dynamic>>('/products/featured');
    return res.data!.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
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
    final items = (body['data'] as List)
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
    final meta = body['meta'] as Map<String, dynamic>;
    return Paginated(
      data: items,
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
final bannersProvider = FutureProvider((ref) => ref.read(catalogRepositoryProvider).banners());
final categoriesProvider =
    FutureProvider((ref) => ref.read(catalogRepositoryProvider).categories());
final featuredProductsProvider =
    FutureProvider((ref) => ref.read(catalogRepositoryProvider).featured());
