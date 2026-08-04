import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config.dart';
import '../../../core/api_client.dart';
import '../../../shared/utils/persian.dart';

const _statusLabels = {
  'PENDING_PAYMENT': 'در انتظار پرداخت',
  'PAID': 'پرداخت‌شده',
  'PROCESSING': 'در حال آماده‌سازی',
  'SHIPPED': 'ارسال‌شده',
  'DELIVERED': 'تحویل‌شده',
  'CANCELLED': 'لغوشده',
  'REFUNDED': 'مرجوع‌شده',
};

/// Orders list with 10-second status polling (per the no-WebSocket rule).
class OrdersPage extends ConsumerStatefulWidget {
  const OrdersPage({super.key});

  @override
  ConsumerState<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends ConsumerState<OrdersPage> {
  List<Map<String, dynamic>> _orders = const [];
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(AppConfig.pollingInterval, (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final res = await ref.read(dioProvider).get<Map<String, dynamic>>(
        '/orders',
        queryParameters: {'limit': 20},
      );
      final data = (res.data?['data'] as List?) ?? [];
      if (mounted) {
        setState(() {
          _orders = data.cast<Map<String, dynamic>>();
          _error = null;
        });
      }
    } catch (e) {
      if (!silent && mounted) setState(() => _error = apiErrorMessage(e));
    }
  }

  Future<void> _payAgain(String orderId) async {
    try {
      final res = await ref.read(dioProvider).post<Map<String, dynamic>>(
        '/payments/orders/$orderId/request',
      );
      final url = res.data?['paymentUrl'] as String?;
      if (url != null && mounted) {
        // Phase 1: open the gateway page in the system browser; the callback
        // deep-link (petshop://payment/result) is registered on dev machines.
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('لینک پرداخت آماده است:\n$url', textDirection: TextDirection.ltr)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) return Center(child: Text(_error!));
    if (_orders.isEmpty) {
      return const Center(child: Text('📦\nهنوز سفارشی ثبت نکرده‌اید', textAlign: TextAlign.center));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final order = _orders[i];
          final items = (order['items'] as List?) ?? [];
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('سفارش ${toPersianDigits((order['id'] as String).substring(0, 8))}'),
                      Chip(
                        label: Text(_statusLabels[order['status']] ?? order['status'] as String),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                  ...items.map((item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Text('• ${item['title']} × ${toPersianDigits(item['quantity'])}',
                            style: Theme.of(context).textTheme.bodySmall),
                      )),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(formatToman(order['total'] as num),
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      if (order['status'] == 'PENDING_PAYMENT')
                        FilledButton.tonal(
                          onPressed: () => _payAgain(order['id'] as String),
                          child: const Text('پرداخت'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
