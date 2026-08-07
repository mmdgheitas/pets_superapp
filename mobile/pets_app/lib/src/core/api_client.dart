import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config.dart';
import '../features/auth/auth_providers.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: '${AppConfig.apiUrl}${AppConfig.apiPrefix}',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      // headers: {'Accept': 'application/json'},
    ),
  );
  print('API base URL: ${dio.options.baseUrl}');

  // Attach access token
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = ref.read(authProvider).accessToken;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Rotate the refresh token once on 401, then retry the original call
        if (error.response?.statusCode == 401 &&
            !error.requestOptions.extra.containsKey('retried')) {
          final refreshed = await ref.read(authProvider.notifier).refresh();
          if (refreshed) {
            final request = error.requestOptions;
            request.extra['retried'] = true;
            request.headers['Authorization'] =
                'Bearer ${ref.read(authProvider).accessToken}';
            try {
              final response = await dio.fetch(request);
              return handler.resolve(response);
            } catch (_) {
              return handler.next(error);
            }
          }
        }
        handler.next(error);
      },
    ),
  );
  return dio;
});

/// Extracts a human-readable Persian message from API error bodies.
String apiErrorMessage(Object error, [String fallback = 'خطایی رخ داد']) {
  if (error is DioException) {
    final message = error.response?.data is Map ? error.response?.data['message'] : null;
    if (message is List) return message.join('، ');
    if (message is String) return message;
  }
  return fallback;
}
