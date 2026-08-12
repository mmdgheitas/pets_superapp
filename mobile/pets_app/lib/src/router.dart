import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/auth/auth_providers.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/cart/presentation/cart_page.dart';
import 'features/catalog/presentation/home_page.dart';
import 'features/catalog/presentation/product_detail_page.dart';
import 'features/catalog/presentation/products_page.dart';
import 'features/orders/presentation/orders_page.dart';
import 'features/profile/presentation/profile_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      // Bottom navigation shell (خانه، محصولات، سفارش‌ها، پروفایل)
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/', builder: (_, __) => const HomePage()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/products',
              builder: (_, state) => ProductsPage(
                category: state.uri.queryParameters['category'],
                sort: state.uri.queryParameters['sort'],
              ),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/orders', builder: (_, __) => const OrdersPage()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (_, __) => const ProfilePage()),
          ]),
        ],
      ),
      GoRoute(
        path: '/products/:slug',
        builder: (_, state) => ProductDetailPage(slug: state.pathParameters['slug']!),
      ),
      GoRoute(path: '/cart', builder: (_, __) => const CartPage()),
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),

      // Phase-2 stubs (routes exist so profile links don't 404; screens arrive next iteration)
      GoRoute(path: '/checkout', redirect: (_, __) => '/cart'),
      GoRoute(path: '/wishlist', redirect: (_, __) => '/profile'),
      GoRoute(path: '/notifications', redirect: (_, __) => '/profile'),
      GoRoute(path: '/pets', redirect: (_, __) => '/profile'),
      GoRoute(path: '/profile/addresses', redirect: (_, __) => '/profile'),
      GoRoute(path: '/seller/register', redirect: (_, __) => '/profile'),
    ],
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final goingToLogin = state.matchedLocation == '/login';
      if (!auth.isLoggedIn && state.matchedLocation == '/cart' && !goingToLogin) {
        return '/login';
      }
      if (auth.isLoggedIn && goingToLogin) return '/';
      return null;
    },
  );
});

class _AppShell extends ConsumerWidget {
  const _AppShell({required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (index) => shell.goBranch(
          index,
          initialLocation: index == shell.currentIndex,
        ),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'خانه'),
          NavigationDestination(icon: Icon(Icons.search), label: 'محصولات'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), label: 'سفارش‌ها'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'پروفایل'),
        ],
      ),
    );
  }
}
