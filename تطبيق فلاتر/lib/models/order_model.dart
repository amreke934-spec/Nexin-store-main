/// نموذج عنصر الطلب (OrderItem Model)
class OrderItem {
  final String id;
  final String orderId;
  final dynamic productId;
  final String productName;
  final String? category;
  final int qty;
  final double price;
  final double total;
  final String currency;
  final Map<String, dynamic> dynamicFields;
  final String status; // 'completed' | 'processing' | 'pending' | 'failed' | 'refunded'
  final String createdAt;
  final String? customerName;
  final String? customerEmail;
  final String? notes;

  OrderItem({
    required this.id,
    required this.orderId,
    required this.productId,
    required this.productName,
    this.category,
    required this.qty,
    required this.price,
    required this.total,
    this.currency = 'SYP',
    required this.dynamicFields,
    required this.status,
    required this.createdAt,
    this.customerName,
    this.customerEmail,
    this.notes,
  });

  bool get isCompleted => status == 'completed' || status == 'success';
  bool get isProcessing => status == 'processing' || status == 'in_progress';
  bool get isPending => status == 'pending';
  bool get isFailed => status == 'failed' || status == 'error';
  bool get isRefunded => status == 'refunded';

  String get statusArabic {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'مكتمل بنجاح';
      case 'processing':
      case 'in_progress':
        return 'قيد المعالجة';
      case 'pending':
        return 'قيد الانتظار';
      case 'refunded':
        return 'مسترجع للرصيد';
      case 'failed':
      case 'error':
        return 'فشل التنفيذ';
      default:
        return status;
    }
  }

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> fields = {};
    if (json['dynamicFields'] != null && json['dynamicFields'] is Map) {
      fields = Map<String, dynamic>.from(json['dynamicFields']);
    }

    final priceVal = (json['price'] is num)
        ? (json['price'] as num).toDouble()
        : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0;

    final totalVal = (json['total'] is num)
        ? (json['total'] as num).toDouble()
        : (json['amount'] is num)
            ? (json['amount'] as num).toDouble()
            : double.tryParse(json['total']?.toString() ?? '0') ?? priceVal;

    final qtyVal = (json['qty'] is int)
        ? json['qty']
        : int.tryParse(json['qty']?.toString() ?? '1') ?? 1;

    return OrderItem(
      id: (json['id'] ?? json['orderId'] ?? '').toString(),
      orderId: (json['orderId'] ?? json['id'] ?? '').toString(),
      productId: json['productId'] ?? 0,
      productName: json['productName']?.toString() ?? 'طلب نيكسن',
      category: json['category']?.toString(),
      qty: qtyVal,
      price: priceVal,
      total: totalVal,
      currency: json['currency']?.toString() ?? 'SYP',
      dynamicFields: fields,
      status: json['status']?.toString() ?? 'processing',
      createdAt: json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
      customerName: json['customerName']?.toString(),
      customerEmail: json['customerEmail']?.toString() ?? json['userEmail']?.toString(),
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'orderId': orderId,
    'productId': productId,
    'productName': productName,
    'category': category,
    'qty': qty,
    'price': price,
    'total': total,
    'currency': currency,
    'dynamicFields': dynamicFields,
    'status': status,
    'createdAt': createdAt,
    'customerName': customerName,
    'customerEmail': customerEmail,
    'notes': notes,
  };
}
