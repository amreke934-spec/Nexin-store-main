import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../constants/app_colors.dart';
import '../models/order_model.dart';
import '../services/store_service.dart';

class OrderItemCard extends StatelessWidget {
  final OrderItem order;
  final VoidCallback? onTap;

  const OrderItemCard({
    super.key,
    required this.order,
    this.onTap,
  });

  Color _getStatusColor() {
    if (order.isCompleted) return AppColors.success;
    if (order.isProcessing) return AppColors.info;
    if (order.isPending) return AppColors.warning;
    if (order.isRefunded) return const Color(0xFF8B5CF6);
    return AppColors.error;
  }

  IconData _getStatusIcon() {
    if (order.isCompleted) return Icons.check_circle_rounded;
    if (order.isProcessing) return Icons.sync_rounded;
    if (order.isPending) return Icons.hourglass_top_rounded;
    if (order.isRefunded) return Icons.replay_rounded;
    return Icons.error_outline_rounded;
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('yyyy/MM/dd - hh:mm a').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // الرأس: رقم الطلب وحالة التنفيذ
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          '#${order.orderId}',
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.secondary,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 14, color: AppColors.textMuted),
                          constraints: const BoxConstraints(),
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: order.orderId));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('تم نسخ رقم الطلب إلى الحافظة'),
                                duration: Duration(seconds: 2),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_getStatusIcon(), size: 12, color: statusColor),
                          const SizedBox(width: 4),
                          Text(
                            order.statusArabic,
                            style: TextStyle(
                              color: statusColor,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(height: 20),
                // تفاصيل المنتج والمبلغ
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.sports_esports_rounded, color: AppColors.primary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            order.productName,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (order.dynamicFields.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              order.dynamicFields.entries.map((e) => '${e.key}: ${e.value}').join(' | '),
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          StoreService.formatCurrency(order.total, 'ل.س'),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          'الكمية: ${order.qty}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // التاريخ
                Text(
                  _formatDate(order.createdAt),
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
