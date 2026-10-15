import 'package:flutter/material.dart';
import '../models/order_model.dart';
import '../services/order_service.dart';

class OrderProvider extends ChangeNotifier {
  final OrderService _orderService = OrderService();

  List<OrderItem> _orders = [];
  bool _isLoading = false;
  String? _errorMessage;

  OrderItem? _trackedOrder;
  bool _isTracking = false;

  List<OrderItem> get orders => _orders;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  OrderItem? get trackedOrder => _trackedOrder;
  bool get isTracking => _isTracking;

  /// تحميل سجل طلبات المستخدم
  Future<void> loadUserOrders(String userId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _orders = await _orderService.fetchUserOrders(userId);
      // فرز الطلبات من الأحدث إلى الأقدم
      _orders.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      _isLoading = false;
      notifyListeners();

      // فحص ومزامنة الطلبات التي لا تزال قيد المعالجة تلقائياً
      _syncProcessing(userId);
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// مزامنة الطلبات قيد المعالجة في الخلفية
  Future<void> _syncProcessing(String userId) async {
    final processingIds = _orders
        .where((o) => o.isProcessing || o.isPending)
        .map((o) => o.orderId)
        .toList();

    if (processingIds.isNotEmpty) {
      final res = await _orderService.checkProcessingOrders(
        orderIds: processingIds,
        userId: userId,
      );
      if (res['updatedCount'] != null && res['updatedCount'] > 0) {
        // إعادة تحميل القائمة بعد التحديث
        final updated = await _orderService.fetchUserOrders(userId);
        _orders = updated;
        _orders.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        notifyListeners();
      }
    }
  }

  /// إرسال طلب جديد وإضافته للسجل
  Future<OrderItem> submitOrder({
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
    final order = await _orderService.createOrder(
      productId: productId,
      productName: productName,
      qty: qty,
      price: price,
      dynamicFields: dynamicFields,
      userId: userId,
      userEmail: userEmail,
      customerName: customerName,
      category: category,
    );

    // إضافة الطلب في أول القائمة
    _orders.insert(0, order);
    notifyListeners();

    return order;
  }

  /// تتبع طلب برقم المعرف
  Future<OrderItem?> trackOrderById(String orderId) async {
    _isTracking = true;
    _trackedOrder = null;
    notifyListeners();

    try {
      final order = await _orderService.trackOrder(orderId);
      _trackedOrder = order;
      _isTracking = false;
      notifyListeners();
      return order;
    } catch (_) {
      _isTracking = false;
      notifyListeners();
      return null;
    }
  }
}
