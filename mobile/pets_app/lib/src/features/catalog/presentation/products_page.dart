import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/product_card.dart';
import '../data/catalog_repository.dart';
import '../domain/models.dart';

typedef ProductsQuery = ({String? q, String? category, String sort, int page});

// Records have value equality — safe as a .family key (no refetch loops).
final _productsQueryProvider = FutureProvider.family<Paginated<Product>, ProductsQuery>(
  (ref, query) => ref.read(catalogRepositoryProvider).products(
        q: query.q,
        category: query.category,
        sort: query.sort,
        page: query.page,
      ),
);

class ProductsPage extends ConsumerStatefulWidget {
  const ProductsPage({super.key, this.category, this.sort});
  final String? category;
  final String? sort;

  @override
  ConsumerState<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends ConsumerState<ProductsPage> {
  final _searchController = TextEditingController();
  String _q = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = (
      q: _q.isEmpty ? null : _q,
      category: widget.category,
      sort: widget.sort ?? 'newest',
      page: 1,
    );
    final products = ref.watch(_productsQueryProvider(query));

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          textInputAction: TextInputAction.search,
          decoration: const InputDecoration(
            hintText: 'جستجوی محصول…',
            border: InputBorder.none,
          ),
          onSubmitted: (value) => setState(() => _q = value.trim()),
        ),
      ),
      body: products.when(
        data: (page) => page.data.isEmpty
            ? const Center(child: Text('محصولی پیدا نشد'))
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(_productsQueryProvider(query)),
                child: GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 0.68,
                  ),
                  itemCount: page.data.length,
                  itemBuilder: (context, i) => ProductCard(product: page.data[i]),
                ),
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('خطا در بارگذاری محصولات\n$e', textAlign: TextAlign.center)),
      ),
    );
  }
}
