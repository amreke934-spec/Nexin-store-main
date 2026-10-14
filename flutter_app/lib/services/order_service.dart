import '../constants/api_constants.dart';
import '../models/order_model.dart';
import 'api_service.dart';

class OrderService {
  final ApiService _api = ApiService();

  /// إرسال طلب شحن جديد
  Future<OrderItem> createOrder({
    required dynamic productId,
    required String productName,
    required int qty,
    required double price,
    required Map<String, dynamic> dynamicFields,
    String? userId,
    String? userEmail,
    String? customerName,
    String? category,
  }) async {
    final payload = {
      'productId': productId,
      'productName': productName,
      'qty': qty,
      'price': price,
      'dynamicFields': dynamicFields,
      'userId': userId,
      'userEmail': userEmail,
      'customerName': customerName,
      'category': category,
    };

    final response = await _api.post(ApiConstants.createOrder, body: payload);

    if (response is Map) {
      if (response['success'] == true || response['order'] != null || response['orderId'] != null) {
        final orderMap = response['order'] ?? response;
        final item = OrderItem.fromJson(orderMap);

        // حفظ نسخة من الطلب في قاعدة البيانات أيضاً للمستخدم
        if (userId != null && userId.isNotEmpty) {
          try {
            await saveOrderToDb(item);
          } catch (_) {}
        }
        return item;
      } else {
        throw ApiException(response['error']?.toString() ?? 'فشل إنشاء الطلب');
      }
    } else {
      throw ApiException('استجابة غير صالحة من خادم الطلبات');
    }
  }

  /// حفظ تفاصيل الطلب في قاعدة البيانات
  Future<bool> saveOrderToDb(OrderItem order) async {
    try {
      final response = await _api.post(
        ApiConstants.saveOrder,
        body: {'order': order.toJson()},
      );
      return response is Map && response['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// جلب سجل طلبات المستخدم
  Future<List<OrderItem>> fetchUserOrders(String userId) async {
    final response = await _api.get('${ApiConstants.userOrders}/$userId');

    List<OrderItem> orders = [];
    if (response is Map && response['orders'] is List) {
      for (var item in response['orders']) {
        if (item is Map<String, dynamic>) {
          orders.add(OrderItem.fromJson(item));
        }
      }
    } else if (response is List) {
      for (var item in response) {
        if (item is Map<String, dynamic>) {
          orders.add(OrderItem.fromJson(item));
        }
      }
    }
    return orders;
  }

  /// تتبع حالة طلب برقم المعرف
  Future<OrderItem?> trackOrder(String orderId) async {
    final response = await _api.get(
      ApiConstants.trackOrder,
      queryParams: {'orderId': orderId.trim()},
    );

    if (response is Map && response['order'] != null) {
      return OrderItem.fromJson(response['order']);
    } else if (response is Map && response['id'] != null) {
      return OrderItem.fromJson(Map<String, dynamic>.from(response));
    }
    return null;
  }

  /// مزامنة وتحديث حالة الطلبات قيد المعالجة
  Future<Map<String, dynamic>> checkProcessingOrders({List<String>? orderIds, String? userId}) async {
    try {
      final response = await _api.post(
        ApiConstants.checkProcessing,
        body: {
          'orderIds': orderIds,
          'userId': userId,
        },
      );
      return response is Map ? Map<String, dynamic>.from(response) : {};
    } catch (_) {
      return {};
    }
  }
}
