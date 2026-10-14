import '../constants/api_constants.dart';
import '../models/deposit_model.dart';
import 'api_service.dart';

class DepositService {
  final ApiService _api = ApiService();

  /// جلب طرق الإيداع المتاحة وتفاصيل الحسابات وسعر الصرف
  Future<List<DepositMethod>> fetchDepositMethods() async {
    final response = await _api.get(ApiConstants.depositMethods);

    List<DepositMethod> methods = [];
    if (response is Map && response['methods'] is List) {
      for (var item in response['methods']) {
        if (item is Map<String, dynamic>) {
          methods.add(DepositMethod.fromJson(item));
        }
      }
    } else if (response is List) {
      for (var item in response) {
        if (item is Map<String, dynamic>) {
          methods.add(DepositMethod.fromJson(item));
        }
      }
    }
    return methods;
  }

  /// إرسال طلب إيداع رصيد جديد
  Future<Map<String, dynamic>> submitDepositRequest({
    required String userId,
    required String userName,
    required String userEmail,
    String? userPhone,
    required String methodId,
    required String methodName,
    required String depositCurrency,
    required double amountInDepositCurrency,
    required double exchangeRateUsed,
    required double expectedSypAmount,
    double feeAmount = 0.0,
    required double finalCreditedAmount,
    required String txNumber,
    String? receiptImage,
    String? notes,
  }) async {
    final payload = {
      'userId': userId,
      'userName': userName,
      'userEmail': userEmail,
      'userPhone': userPhone,
      'methodId': methodId,
      'methodName': methodName,
      'depositCurrency': depositCurrency,
      'amountInDepositCurrency': amountInDepositCurrency,
      'exchangeRateUsed': exchangeRateUsed,
      'expectedSypAmount': expectedSypAmount,
      'feeAmount': feeAmount,
      'finalCreditedAmount': finalCreditedAmount,
      'txNumber': txNumber,
      'receiptImage': receiptImage,
      'notes': notes,
    };

    final response = await _api.post(ApiConstants.submitDeposit, body: payload);

    if (response is Map && (response['success'] == true || response['deposit'] != null)) {
      return Map<String, dynamic>.from(response);
    } else {
      throw ApiException(response['error']?.toString() ?? 'فشل تقديم طلب الإيداع');
    }
  }

  /// جلب سجل إيداعات المستخدم
  Future<List<DepositRequest>> fetchUserDeposits(String userId) async {
    final response = await _api.get('${ApiConstants.userDeposits}/$userId');

    List<DepositRequest> deposits = [];
    if (response is Map && response['deposits'] is List) {
      for (var item in response['deposits']) {
        if (item is Map<String, dynamic>) {
          deposits.add(DepositRequest.fromJson(item));
        }
      }
    } else if (response is List) {
      for (var item in response) {
        if (item is Map<String, dynamic>) {
          deposits.add(DepositRequest.fromJson(item));
        }
      }
    }
    return deposits;
  }
}
