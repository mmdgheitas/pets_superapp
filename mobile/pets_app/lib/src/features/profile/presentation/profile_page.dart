import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/utils/persian.dart';
import '../../auth/auth_providers.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    if (!auth.isLoggedIn) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🐾', style: TextStyle(fontSize: 56)),
            const SizedBox(height: 8),
            const Text('برای مشاهده پروفایل وارد شوید'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.push('/login'),
              child: const Text('ورود | ثبت‌نام'),
            ),
          ],
        ),
      );
    }

    final user = auth.user;
    final role = user?['role'] as String? ?? 'CUSTOMER';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: Text(user?['fullName'] as String? ?? 'کاربر پت‌شاپ'),
            subtitle: Text(toPersianDigits(user?['phone'] as String? ?? '')),
            trailing: Chip(
              label: Text(role == 'ADMIN' ? 'مدیر' : role == 'SELLER' ? 'فروشنده' : 'خریدار'),
              visualDensity: VisualDensity.compact,
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (role == 'CUSTOMER')
          Card(
            child: ListTile(
              leading: const Icon(Icons.storefront),
              title: const Text('ثبت‌نام فروشندگی'),
              subtitle: const Text('فروشگاه خود را باز کنید'),
              onTap: () => context.push('/seller/register'),
            ),
          ),
        Card(
          child: ListTile(
            leading: const Icon(Icons.pets),
            title: const Text('پت‌های من'),
            onTap: () => context.push('/pets'),
          ),
        ),
        Card(
          child: ListTile(
            leading: const Icon(Icons.location_on_outlined),
            title: const Text('آدرس‌ها'),
            onTap: () => context.push('/profile/addresses'),
          ),
        ),
        Card(
          child: ListTile(
            leading: const Icon(Icons.favorite_border),
            title: const Text('علاقه‌مندی‌ها'),
            onTap: () => context.push('/wishlist'),
          ),
        ),
        Card(
          child: ListTile(
            leading: const Icon(Icons.notifications_outlined),
            title: const Text('اعلان‌ها'),
            onTap: () => context.push('/notifications'),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          icon: const Icon(Icons.logout),
          label: const Text('خروج از حساب'),
          onPressed: () async {
            await ref.read(authProvider.notifier).logout();
          },
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            'پت‌شاپ — نسخه ۰٫۱٫۰',
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ),
      ],
    );
  }
}
