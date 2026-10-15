import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/product_model.dart';
import '../models/order_model.dart';
import '../providers/auth_provider.dart';
import '../providers/order_provider.dart';
import '../services/store_service.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import 'deposit_screen.dart';

class CheckoutScreen extends StatefulWidget {
  final Product product;
  final GameGroup? gameGroup;

  const CheckoutScreen({
    super.key,
    required this.product,
    this.gameGroup,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};

  int _qty = 1;
  bool _saveIdForFuture = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _qty = widget.product.minQty;

    final auth = context.read<AuthProvider>();
    final savedIds = auth.user?.savedPlayerIds ?? {};
    final gameTitle = widget.gameGroup?.title ?? widget.product.gameName ?? widget.product.category;

    // تهيئة المتحكمات للحقول المطلوبة
    for (var field in widget.product.dynamicFields) {
      final ctrl = TextEditingController();
      // إذا كان الحقل للآيدي وتوجد قيمة محفوظة مسبقاً، ندرجها تلقائياً
      if ((field.name.toLowerCase().contains('id') || field.name.toLowerCase().contains('player')) &&
          savedIds.containsKey(gameTitle)) {
        ctrl.text = savedIds[gameTitle]!;
      }
      _controllers[field.name] = ctrl;
    }
  }

  @override
  void dispose() {
    for (var ctrl in _controllers.values) {
      ctrl.dispose();
    }
    super.dispose();
  }

  double get _totalPrice => widget.product.price * _qty;

  Future<void> _submitOrder() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final orderProvider = context.read<OrderProvider>();

    // 1. فحص الرصيد إذا كان المستخدم مسجلاً
    if (auth.isAuthenticated && auth.balance < _totalPrice) {
      _showInsufficientBalanceDialog(auth.balance, _totalPrice);
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final Map<String, dynamic> fieldsMap = {};
      _controllers.forEach((key, ctrl) {
        fieldsMap[key] = ctrl.text.trim();
      });

      final order = await orderProvider.submitOrder(
        productId: widget.product.productId,
        productName: widget.product.name,
        qty: _qty,
        price: widget.product.price,
        dynamicFields: fieldsMap,
        userId: auth.user?.id,
        userEmail: auth.user?.email,
        customerName: auth.user?.name,
        category: widget.product.category,
      );

      // 2. تحديث الرصيد وحفظ الآيدي للمرات القادمة
      if (auth.isAuthenticated) {
        final newBalance = (auth.balance - _totalPrice).clamp(0.0, double.infinity);
        auth.updateLocalBalance(newBalance);

        if (_saveIdForFuture && fieldsMap.isNotEmpty) {
          final firstVal = fieldsMap.values.first.toString();
          final gameTitle = widget.gameGroup?.title ?? widget.product.category;
          auth.savePlayerId(gameTitle, firstVal);
        }
      }

      if (mounted) {
        setState(() => _isSubmitting = false);
        _showOrderSuccessDialog(order);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showInsufficientBalanceDialog(double current, double required) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: AppColors.border)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 28),
            SizedBox(width: 10),
            Text('الرصيد غير كافٍ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'رصيدك الحالي في المحفظة لا يكفي لإتمام هذا الطلب.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('الرصيد المتوفر:', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Text(StoreService.formatCurrency(current, 'ل.س'), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('المبلغ المطلوب:', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Text(StoreService.formatCurrency(required, 'ل.س'), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.secondary, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const DepositScreen()),
              );
            },
            child: const Text('إيداع رصيد الآن'),
          ),
        ],
      ),
    );
  }

  void _showOrderSuccessDialog(OrderItem order) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: AppColors.border)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 40),
            ),
            const SizedBox(height: 16),
            const Text(
              'تم استلام طلبك بنجاح!',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 6),
            const Text(
              'الطلب قيد التنفيذ المباشر من خلال مزود الخدمة.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('رقم الطلب:', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Row(
                        children: [
                          Text(order.orderId, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.secondary, fontFamily: 'monospace')),
                          IconButton(
                            icon: const Icon(Icons.copy_rounded, size: 14, color: AppColors.textSecondary),
                            constraints: const BoxConstraints(),
                            padding: const EdgeInsets.only(right: 6),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: order.orderId));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('تم نسخ رقم الطلب')),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('الباقة:', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Text(order.productName, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('المبلغ المدفوع:', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Text(StoreService.formatCurrency(order.total, 'ل.س'), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            CustomButton(
              text: 'تم والعودة للرئيسية',
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('تأكيد الطلب والشحن'),
      ),
      body: Column(
        children: [
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // كرت معلومات الباقة
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.flash_on_rounded, color: AppColors.secondary, size: 28),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.product.name,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                widget.product.category,
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          StoreService.formatCurrency(widget.product.price, 'ل.س'),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.secondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // الحقول الديناميكية (Player ID / Phone / Email)
                  const Text(
                    'بيانات الحساب للشحن المباشر:',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 12),

                  ...widget.product.dynamicFields.map((field) {
                    final ctrl = _controllers[field.name]!;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: CustomTextField(
                        controller: ctrl,
                        label: field.label,
                        hintText: field.placeholder ?? 'أدخل ${field.label}',
                        helperText: field.helperText,
                        prefixIcon: field.name.toLowerCase().contains('phone')
                            ? Icons.phone_android_rounded
                            : Icons.badge_rounded,
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.content_paste_rounded, size: 18, color: AppColors.secondary),
                          tooltip: 'لصق',
                          onPressed: () async {
                            final data = await Clipboard.getData('text/plain');
                            if (data?.text != null) {
                              ctrl.text = data!.text!.trim();
                            }
                          },
                        ),
                        validator: (val) {
                          if (field.required && (val == null || val.trim().isEmpty)) {
                            return 'يرجى إدخال ${field.label}';
                          }
                          return null;
                        },
                      ),
                    );
                  }),

                  // حفظ المعرف مستقبلاً
                  if (auth.isAuthenticated)
                    CheckboxListTile(
                      value: _saveIdForFuture,
                      onChanged: (val) => setState(() => _saveIdForFuture = val ?? true),
                      title: const Text(
                        'حفظ المعرف في حسابي للشحن التلقائي مستقبلاً',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      activeColor: AppColors.primary,
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                    ),

                  const SizedBox(height: 16),

                  // محدد الكمية
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'الكمية:',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        Row(
                          children: [
                            IconButton(
                              onPressed: _qty > widget.product.minQty
                                  ? () => setState(() => _qty--)
                                  : null,
                              icon: const Icon(Icons.remove_circle_outline_rounded, color: AppColors.secondary),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '$_qty',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                            IconButton(
                              onPressed: _qty < widget.product.maxQty
                                  ? () => setState(() => _qty++)
                                  : null,
                              icon: const Icon(Icons.add_circle_outline_rounded, color: AppColors.secondary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // الشريط السفلي لتأكيد الطلب
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: const Border(top: BorderSide(color: AppColors.border)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('الإجمالي المستحق:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      Text(
                        StoreService.formatCurrency(_totalPrice, 'ل.س'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  CustomButton(
                    text: 'تأكيد الطلب والشحن الفوري',
                    icon: Icons.check_circle_outline_rounded,
                    isLoading: _isSubmitting,
                    onPressed: _isSubmitting ? null : _submitOrder,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
