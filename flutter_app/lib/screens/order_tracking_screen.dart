import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/order_model.dart';
import '../providers/order_provider.dart';
import '../services/store_service.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String? initialOrderId;
  const OrderTrackingScreen({super.key, this.initialOrderId});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  final TextEditingController _orderIdController = TextEditingController();
  bool _searched = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialOrderId != null) {
      _orderIdController.text = widget.initialOrderId!;
      _track();
    }
  }

  @override
  void dispose() {
    _orderIdController.dispose();
    super.dispose();
  }

  void _track() {
    final id = _orderIdController.text.trim();
    if (id.isEmpty) return;
    setState(() => _searched = true);
    context.read<OrderProvider>().trackOrderById(id);
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = context.watch<OrderProvider>();
    final tracked = orderProvider.trackedOrder;

    return Scaffold(
      appBar: AppBar(
        title: const Text('تتبع حالة الطلب المباشر'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'أدخل رقم الطلب للتحقق من حالته وتفاصيل التنفيذ:',
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 12),
                CustomTextField(
                  controller: _orderIdController,
                  label: 'رقم الطلب (Order ID)',
                  hintText: 'مثال: 123456 أو SC-7890',
                  prefixIcon: Icons.tag_rounded,
                ),
                const SizedBox(height: 14),
                CustomButton(
                  text: 'تتبع الطلب الآن',
                  icon: Icons.search_rounded,
                  isLoading: orderProvider.isTracking,
                  onPressed: _track,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // عرض نتيجة التتبع
          if (orderProvider.isTracking)
            const Center(child: CircularProgressIndicator(color: AppColors.primary))
          else if (_searched && tracked == null)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: const Column(
                children: [
                  Icon(Icons.search_off_rounded, size: 48, color: AppColors.textMuted),
                  SizedBox(height: 10),
                  Text(
                    'لم يتم العثور على طلب بهذا الرقم',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'يرجى التأكد من كتابة رقم الطلب بصورة صحيحة بدون مسافات إضافية.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            )
          else if (tracked != null)
            _buildOrderDetailsCard(tracked),
        ],
      ),
    );
  }

  Widget _buildOrderDetailsCard(OrderItem order) {
    Color statusColor = AppColors.info;
    if (order.isCompleted) statusColor = AppColors.success;
    if (order.isPending) statusColor = AppColors.warning;
    if (order.isRefunded) statusColor = const Color(0xFF8B5CF6);
    if (order.isFailed) statusColor = AppColors.error;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: statusColor.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: statusColor.withValues(alpha: 0.1),
            blurRadius: 16,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'طلب #${order.orderId}',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  fontFamily: 'monospace',
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                ),
                child: Text(
                  order.statusArabic,
                  style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          _buildInfoRow('المنتج / الباقة', order.productName),
          const SizedBox(height: 10),
          _buildInfoRow('المبلغ الإجمالي', StoreService.formatCurrency(order.total, 'ل.س')),
          const SizedBox(height: 10),
          _buildInfoRow('الكمية', '${order.qty}'),
          if (order.dynamicFields.isNotEmpty) ...[
            const SizedBox(height: 10),
            ...order.dynamicFields.entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: _buildInfoRow(e.key, e.value.toString()),
                )),
          ],
          if (order.notes != null && order.notes!.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildInfoRow('ملاحظات المورد', order.notes!),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
          ),
        ),
      ],
    );
  }
}
