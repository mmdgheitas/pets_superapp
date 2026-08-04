/// Lightweight domain models parsed from API JSON.
class ProductImage {
  ProductImage({required this.url, required this.sortOrder});
  final String url;
  final int sortOrder;

  factory ProductImage.fromJson(Map<String, dynamic> json) =>
      ProductImage(url: json['url'] as String, sortOrder: json['sortOrder'] as int? ?? 0);
}

class Product {
  Product({
    required this.id,
    required this.title,
    required this.slug,
    required this.price,
    this.compareAtPrice,
    required this.stock,
    required this.ratingAvg,
    required this.ratingCount,
    required this.soldCount,
    required this.images,
    this.categoryName,
    this.shopName,
    this.description,
  });

  final String id;
  final String title;
  final String slug;
  final num price;
  final num? compareAtPrice;
  final int stock;
  final num ratingAvg;
  final int ratingCount;
  final int soldCount;
  final List<ProductImage> images;
  final String? categoryName;
  final String? shopName;
  final String? description;

  String? get thumbnail => images.isEmpty ? null : images.first.url;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        title: json['title'] as String,
        slug: json['slug'] as String,
        price: json['price'] as num,
        compareAtPrice: json['compareAtPrice'] as num?,
        stock: json['stock'] as int? ?? 0,
        ratingAvg: json['ratingAvg'] as num? ?? 0,
        ratingCount: json['ratingCount'] as int? ?? 0,
        soldCount: json['soldCount'] as int? ?? 0,
        images: ((json['images'] as List?) ?? [])
            .map((e) => ProductImage.fromJson(e as Map<String, dynamic>))
            .toList(),
        categoryName: (json['category'] as Map?)?['name'] as String?,
        shopName: (json['seller'] as Map?)?['shopName'] as String?,
        description: json['description'] as String?,
      );
}

class Category {
  Category({required this.id, required this.name, required this.slug, this.icon});
  final String id;
  final String name;
  final String slug;
  final String? icon;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String,
        icon: json['icon'] as String?,
      );
}

class Banner {
  Banner({required this.title, required this.imageUrl, this.linkUrl});
  final String title;
  final String imageUrl;
  final String? linkUrl;

  factory Banner.fromJson(Map<String, dynamic> json) => Banner(
        title: json['title'] as String,
        imageUrl: json['imageUrl'] as String,
        linkUrl: json['linkUrl'] as String?,
      );
}

class Paginated<T> {
  Paginated({required this.data, required this.total, required this.page, required this.totalPages});
  final List<T> data;
  final int total;
  final int page;
  final int totalPages;
}
