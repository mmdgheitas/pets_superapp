import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/local_storage.dart';

class AuthState {
  const AuthState({
    this.accessToken,
    this.refreshToken,
    this.user,
    this.restored = false,
  });

  final String? accessToken;
  final String? refreshToken;
  final Map<String, dynamic>? user;
  final bool restored;

  bool get isLoggedIn => accessToken != null;

  AuthState copyWith({
    String? accessToken,
    String? refreshToken,
    Map<String, dynamic>? user,
    bool? restored,
  }) {
    return AuthState(
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      user: user ?? this.user,
      restored: restored ?? this.restored,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this.ref) : super(const AuthState()) {
    _restore();
  }

  final Ref ref;
  static const _kAccess = 'access_token';
  static const _kRefresh = 'refresh_token';
  static const _kUser = 'user_json';

  Future<void> _restore() async {
    final storage = ref.read(secureStorageProvider);
    final access = await storage.read(key: _kAccess);
    final refresh = await storage.read(key: _kRefresh);
    // user profile is refreshed from the API on app open (cheap, keeps role fresh)
    state = state.copyWith(accessToken: access, refreshToken: refresh, restored: true);
    if (access != null) {
      try {
        final me = await ref.read(dioProvider).get<Map<String, dynamic>>('/auth/me');
        state = state.copyWith(user: me.data);
      } catch (_) {
        // offline or expired — retry happens on the next authenticated request
      }
    }
  }

  Future<String> requestOtp(String phone) async {
    final response = await ref.read(dioProvider).post<Map<String, dynamic>>(
      '/auth/otp/request',
      data: {'phone': phone},
    );
    // devCode is only present when the API runs with KAVENEGAR_MOCK=true
    return response.data?['devCode'] as String? ?? '';
  }

  Future<void> verifyOtp(String phone, String code, {String? fullName}) async {
    final response = await ref.read(dioProvider).post<Map<String, dynamic>>(
      '/auth/otp/verify',
      data: {
        'phone': phone,
        'code': code,
        if (fullName != null && fullName.isNotEmpty) 'fullName': fullName,
      },
    );
    final data = response.data!;
    final storage = ref.read(secureStorageProvider);
    await storage.write(key: _kAccess, value: data['accessToken'] as String);
    await storage.write(key: _kRefresh, value: data['refreshToken'] as String);
    state = state.copyWith(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      user: data['user'] as Map<String, dynamic>?,
    );
  }

  /// Rotates the refresh token (backend revokes the old one). Returns false if the
  /// session is gone — the router then sends the user back to login.
  Future<bool> refresh() async {
    final token = state.refreshToken;
    if (token == null) return false;
    try {
      final response = await ref.read(dioProvider).post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': token},
        options: Options(headers: {'Authorization': null}),
      );
      final data = response.data!;
      final storage = ref.read(secureStorageProvider);
      await storage.write(key: _kAccess, value: data['accessToken'] as String);
      await storage.write(key: _kRefresh, value: data['refreshToken'] as String);
      state = state.copyWith(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
        user: data['user'] as Map<String, dynamic>?,
      );
      return true;
    } catch (_) {
      await logout();
      return false;
    }
  }

  Future<void> logout() async {
    final storage = ref.read(secureStorageProvider);
    await storage.delete(key: _kAccess);
    await storage.delete(key: _kRefresh);
    await storage.delete(key: _kUser);
    state = const AuthState(restored: true);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
