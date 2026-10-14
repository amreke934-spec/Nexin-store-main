/// نموذج بيانات المستخدم (User Model)
class CustomerUser {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatar;
  final double balance;
  final String currency;
  final String role; // 'customer' | 'admin' | 'merchant'
  final Map<String, String> savedPlayerIds;
  final String createdAt;
  final String? token;

  CustomerUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatar,
    this.balance = 0.0,
    this.currency = 'SYP',
    this.role = 'customer',
    this.savedPlayerIds = const {},
    required this.createdAt,
    this.token,
  });

  bool get isAdmin => role == 'admin';

  factory CustomerUser.fromJson(Map<String, dynamic> json, {String? token}) {
    // Parse savedPlayerIds
    Map<String, String> parsedSavedIds = {};
    if (json['savedPlayerIds'] != null && json['savedPlayerIds'] is Map) {
      json['savedPlayerIds'].forEach((k, v) {
        parsedSavedIds[k.toString()] = v.toString();
      });
    }

    return CustomerUser(
      id: (json['id'] ?? json['userId'] ?? '').toString(),
      name: json['name']?.toString() ?? 'مستخدم نيكسن',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      avatar: json['avatar']?.toString(),
      balance: (json['balance'] is num)
          ? (json['balance'] as num).toDouble()
          : double.tryParse(json['balance']?.toString() ?? '0') ?? 0.0,
      currency: json['currency']?.toString() ?? 'SYP',
      role: json['role']?.toString() ?? 'customer',
      savedPlayerIds: parsedSavedIds,
      createdAt: json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
      token: token ?? json['token']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'avatar': avatar,
      'balance': balance,
      'currency': currency,
      'role': role,
      'savedPlayerIds': savedPlayerIds,
      'createdAt': createdAt,
      'token': token,
    };
  }

  CustomerUser copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? avatar,
    double? balance,
    String? currency,
    String? role,
    Map<String, String>? savedPlayerIds,
    String? createdAt,
    String? token,
  }) {
    return CustomerUser(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      avatar: avatar ?? this.avatar,
      balance: balance ?? this.balance,
      currency: currency ?? this.currency,
      role: role ?? this.role,
      savedPlayerIds: savedPlayerIds ?? this.savedPlayerIds,
      createdAt: createdAt ?? this.createdAt,
      token: token ?? this.token,
    );
  }
}
