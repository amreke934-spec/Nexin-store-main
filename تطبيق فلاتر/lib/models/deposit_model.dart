/// نموذج طريقة الإيداع المتاحة (سيريتل كاش، MTN، بنك بيمو، USDT...)
class DepositMethod {
  final String id;
  final String name;
  final String currency;
  final double exchangeRateToSyp;
  final String depositAddress;
  final double minDeposit;
  final double maxDeposit;
  final String details;
  final String icon;
  final bool feeEnabled;
  final double feePercentage;
  final bool isActive;

  DepositMethod({
    required this.id,
    required this.name,
    required this.currency,
    required this.exchangeRateToSyp,
    required this.depositAddress,
    required this.minDeposit,
    required this.maxDeposit,
    required this.details,
    required this.icon,
    this.feeEnabled = false,
    this.feePercentage = 0.0,
    this.isActive = true,
  });

  factory DepositMethod.fromJson(Map<String, dynamic> json) {
    return DepositMethod(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      currency: json['currency']?.toString() ?? 'SYP',
      exchangeRateToSyp: (json['exchangeRateToSyp'] is num)
          ? (json['exchangeRateToSyp'] as num).toDouble()
          : double.tryParse(json['exchangeRateToSyp']?.toString() ?? '1') ?? 1.0,
      depositAddress: json['depositAddress']?.toString() ?? '',
      minDeposit: (json['minDeposit'] is num)
          ? (json['minDeposit'] as num).toDouble()
          : double.tryParse(json['minDeposit']?.toString() ?? '0') ?? 0.0,
      maxDeposit: (json['maxDeposit'] is num)
          ? (json['maxDeposit'] as num).toDouble()
          : double.tryParse(json['maxDeposit']?.toString() ?? '10000000') ?? 10000000.0,
      details: json['details']?.toString() ?? '',
      icon: json['icon']?.toString() ?? '',
      feeEnabled: json['feeEnabled'] == true,
      feePercentage: (json['feePercentage'] is num)
          ? (json['feePercentage'] as num).toDouble()
          : double.tryParse(json['feePercentage']?.toString() ?? '0') ?? 0.0,
      isActive: json['isActive'] != false,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'currency': currency,
    'exchangeRateToSyp': exchangeRateToSyp,
    'depositAddress': depositAddress,
    'minDeposit': minDeposit,
    'maxDeposit': maxDeposit,
    'details': details,
    'icon': icon,
    'feeEnabled': feeEnabled,
    'feePercentage': feePercentage,
    'isActive': isActive,
  };
}

/// نموذج طلب الإيداع المقدم من العميل
class DepositRequest {
  final String id;
  final String userId;
  final String userName;
  final String userEmail;
  final String? userPhone;
  final String methodId;
  final String methodName;
  final String depositCurrency;
  final double amountInDepositCurrency;
  final double exchangeRateUsed;
  final double expectedSypAmount;
  final double feeAmount;
  final double finalCreditedAmount;
  final String? txNumber;
  final String? receiptImage;
  final String status; // 'pending' | 'approved' | 'rejected'
  final String? notes;
  final String createdAt;

  DepositRequest({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userEmail,
    this.userPhone,
    required this.methodId,
    required this.methodName,
    required this.depositCurrency,
    required this.amountInDepositCurrency,
    required this.exchangeRateUsed,
    required this.expectedSypAmount,
    this.feeAmount = 0.0,
    required this.finalCreditedAmount,
    this.txNumber,
    this.receiptImage,
    required this.status,
    this.notes,
    required this.createdAt,
  });

  bool get isApproved => status == 'approved';
  bool get isPending => status == 'pending';
  bool get isRejected => status == 'rejected';

  String get statusArabic {
    switch (status) {
      case 'approved':
        return 'تم الإيداع بنجاح';
      case 'pending':
        return 'قيد التدقيق والمراجعة';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  }

  factory DepositRequest.fromJson(Map<String, dynamic> json) {
    return DepositRequest(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      userName: json['userName']?.toString() ?? '',
      userEmail: json['userEmail']?.toString() ?? '',
      userPhone: json['userPhone']?.toString(),
      methodId: json['methodId']?.toString() ?? '',
      methodName: json['methodName']?.toString() ?? '',
      depositCurrency: json['depositCurrency']?.toString() ?? 'SYP',
      amountInDepositCurrency: (json['amountInDepositCurrency'] is num)
          ? (json['amountInDepositCurrency'] as num).toDouble()
          : double.tryParse(json['amountInDepositCurrency']?.toString() ?? '0') ?? 0.0,
      exchangeRateUsed: (json['exchangeRateUsed'] is num)
          ? (json['exchangeRateUsed'] as num).toDouble()
          : double.tryParse(json['exchangeRateUsed']?.toString() ?? '1') ?? 1.0,
      expectedSypAmount: (json['expectedSypAmount'] is num)
          ? (json['expectedSypAmount'] as num).toDouble()
          : double.tryParse(json['expectedSypAmount']?.toString() ?? '0') ?? 0.0,
      feeAmount: (json['feeAmount'] is num)
          ? (json['feeAmount'] as num).toDouble()
          : double.tryParse(json['feeAmount']?.toString() ?? '0') ?? 0.0,
      finalCreditedAmount: (json['finalCreditedAmount'] is num)
          ? (json['finalCreditedAmount'] as num).toDouble()
          : double.tryParse(json['finalCreditedAmount']?.toString() ?? '0') ?? 0.0,
      txNumber: json['txNumber']?.toString(),
      receiptImage: json['receiptImage']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      notes: json['notes']?.toString(),
      createdAt: json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }
}
