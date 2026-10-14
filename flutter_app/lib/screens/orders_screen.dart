import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/order_model.dart';
import '../providers/auth_provider.dart';
import '../providers/order_provider.dart';
import '../widgets/order_item_card.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String _selectedFilter = 'الكل';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOrders();
    });
  }

  void _loadOrders() {
    final auth = context.read<AuthProvider>();
    if (auth.isAuthenticated) {
      context.read<OrderProvider>().loadUserOrders(auth.user!.id);
    }
  }

  List<OrderItem> _filterOrders(List<OrderItem> all) {
    if (_selectedFilter == 'الكل') return all;
    if (_selectedFilter == 'مكتمل') return all.where((o) => o.isCompleted).toList();
    if (_selectedFilter == 'قيد المعالجة') return all.where((o) => o.isProcessing).toList();
    if (_selectedFilter == 'قيد الانتظار') return all.where((o) => o.isPending).toList();
    if (_selectedFilter == 'مسترجع') return all.where((o) => o.isRefunded).toList();
    return all;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final orderProvider = context.watch<OrderProvider>();
    final filtered = _filterOrders(orderProvider.orders);

    final filters = ['الكل', 'مكتمل', 'قيد المعالجة', 'قيد الانتظار', 'مسترجع'];

    return Scaffold(
      appBar: AppBar(
        title: const Text('سجل طلباتي'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded, color: AppColors.secondary),
            tooltip: 'تحديث الطلبات',
            onPressed: _loadOrders,
          ),
        ],
      ),
      body: !auth.isAuthenticated
          ? const Center(
              child: Text(
                'يرجى تسجيل الدخول لمشاهدة طلباتك',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            )
          : Column(
              children: [
                // فلتر الحالات
                Container(
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: filters.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final f = filters[index];
                      final isSelected = _selectedFilter == f;

                      return ChoiceChip(
                        label: Text(f),
                        selected: isSelected,
                        onSelected: (_) => setState(() => _selectedFilter = f),
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : AppColors.textSecondary,
                        ),
                        backgroundColor: AppColors.surface,
                        selectedColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: isSelected ? AppColors.primaryLight : AppColors.border),
                        ),
                        showCheckmark: false,
                      );
                    },
                  ),
                ),
                const Divider(),

                // قائمة الطلبات
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.secondary,
                    backgroundColor: AppColors.surface,
                    onRefresh: () async => _loadOrders(),
                    child: orderProvider.isLoading && orderProvider.orders.isEmpty
                        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                        : filtered.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.receipt_long_outlined, size: 56, color: AppColors.textMuted),
                                    const SizedBox(height: 12),
                                    Text(
                                      _selectedFilter == 'الكل'
                                          ? 'لا توجد طلبات سابقة حتى الآن'
                                          : 'لا توجد طلبات بحالة "$_selectedFilter"',
                                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: filtered.length,
                                itemBuilder: (context, index) {
                                  return OrderItemCard(
                                    order: filtered[index],
                                    onTap: () {
                                      // فتح تفاصيل الطلب
                                    },
                                  );
                                },
                              ),
                  ),
                ),
              ],
            ),
    );
  }
}
