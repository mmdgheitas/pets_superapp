import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_client.dart';
import '../../../shared/utils/persian.dart';
import '../auth_providers.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _nameController = TextEditingController();

  bool _otpSent = false;
  bool _busy = false;
  String? _error;
  String? _devCode;
  int _countdown = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _phoneController.dispose();
    _codeController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final phone = _phoneController.text.trim();
    if (!RegExp(r'^09\d{9}$').hasMatch(phone)) {
      setState(() => _error = 'شماره موبایل معتبر نیست (مثال: 09123456789)');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final devCode = await ref.read(authProvider.notifier).requestOtp(phone);
      setState(() {
        _otpSent = true;
        _devCode = devCode.isEmpty ? null : devCode;
        _countdown = 120;
      });
      _timer?.cancel();
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (_countdown <= 1) t.cancel();
        setState(() => _countdown = _countdown > 0 ? _countdown - 1 : 0);
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e, 'ارسال کد با خطا مواجه شد'));
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).verifyOtp(
            _phoneController.text.trim(),
            _codeController.text.trim(),
            fullName: _nameController.text.trim(),
          );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = apiErrorMessage(e, 'کد واردشده صحیح نیست'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ورود | ثبت‌نام')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('🐾', textAlign: TextAlign.center, style: TextStyle(fontSize: 56)),
                const SizedBox(height: 8),
                Text(
                  _otpSent
                      ? 'کد پیامک‌شده به ${toPersianDigits(_phoneController.text)} را وارد کنید'
                      : 'برای ورود، شماره موبایل خود را وارد کنید',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 24),
                if (_devCode != null)
                  Card(
                    color: Theme.of(context).colorScheme.secondaryContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(
                        'حالت توسعه — کد: $_devCode',
                        textAlign: TextAlign.center,
                        textDirection: TextDirection.ltr,
                      ),
                    ),
                  ),
                TextField(
                  controller: _phoneController,
                  enabled: !_otpSent && !_busy,
                  keyboardType: TextInputType.phone,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)],
                  decoration: const InputDecoration(labelText: 'شماره موبایل', hintText: '09xxxxxxxxx'),
                ),
                const SizedBox(height: 12),
                if (_otpSent) ...[
                  TextField(
                    controller: _codeController,
                    keyboardType: TextInputType.number,
                    textDirection: TextDirection.ltr,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                    decoration: InputDecoration(
                      labelText: 'کد تأیید',
                      helperText: _countdown > 0 ? 'انقضا تا ${toPersianDigits(_countdown)} ثانیه' : 'کد منقضی شد — مجدداً ارسال کنید',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'نام و نام خانوادگی (اختیاری)'),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error), textAlign: TextAlign.center),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _busy ? null : (_otpSent ? _verify : _requestOtp),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(_busy ? 'لطفاً صبر کنید…' : (_otpSent ? 'تأیید و ورود' : 'ارسال کد تأیید')),
                  ),
                ),
                if (_otpSent)
                  TextButton(
                    onPressed: _busy ? null : () => setState(() { _otpSent = false; _devCode = null; _timer?.cancel(); }),
                    child: const Text('تغییر شماره موبایل'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
