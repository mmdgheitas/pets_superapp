import 'package:intl/intl.dart';

const _faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

String toPersianDigits(Object input) {
  return input.toString().replaceAllMapped(
        RegExp(r'\d'),
        (m) => _faDigits[int.parse(m[0]!)],
      );
}

/// IRR ریال → تومان with thousand separators and Persian digits.
String formatToman(num irr) {
  final toman = (irr / 10).round();
  final grouped = NumberFormat('#,###', 'en_US').format(toman).replaceAll(',', '٬');
  return '${toPersianDigits(grouped)} تومان';
}

String formatDate(String iso) {
  try {
    // fa-IR date via intl
    return DateFormat.yMMMMd('fa').add_Hm().format(DateTime.parse(iso));
  } catch (_) {
    return iso;
  }
}
