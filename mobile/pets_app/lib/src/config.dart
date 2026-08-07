/// Compile-time configuration.
///
/// flutter run --dart-define=API_URL=https://api.petshop.ir
class AppConfig {
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    // defaultValue: 'http://10.0.2.2:3000', // Android emulator → host machine
    defaultValue: 'http://192.168.0.185:3000', // Android emulator → host machine
  );

  static const String apiPrefix = '/api/v1';

  /// Real-time features use short polling, per the no-WebSocket rule.
  static const Duration pollingInterval = Duration(seconds: 10);
}
