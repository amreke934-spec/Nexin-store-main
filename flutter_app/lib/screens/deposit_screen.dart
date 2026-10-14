import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/deposit_model.dart';
import '../providers/auth_provider.dart';
import '../services/deposit_service.dart';
import '../services/store_service.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';

class DepositScreen extends StatefulWidget {
  const DepositScreen({super.key});

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  final DepositService _depositService = DepositService();
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _txController = TextEditingController();

  List<DepositMethod> _methods = [];
  List<DepositRequest> _userDeposits = [];
  DepositMethod? _selectedMethod;

  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _txController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthProvider>();

    try {
      final methods = await _depositService.fetchDepositMethods();
      List<DepositRequest> deposits = [];
      if (auth.isAuthenticated) {
        deposits = await _depositService.fetchUserDeposits(auth.user!.id);
      }

      setState(() {
        _methods = methods.where((m) => m.isActive).toList();
        if (_methods.isNotEmpty) {
          _selectedMethod = _methods.first;
        }
        _userDeposits = deposits;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  double get _enteredAmount => double.tryParse(_amountController.text.trim()) ?? 0.0;
  double get _calculatedSyp {
    if (_selectedMethod == null) return 0.0;
    return _enteredAmount * _selectedMethod!.exchangeRateToSyp;
  }
  double get _feeAmount {
    if (_selectedMethod == null || !_selectedMethod!.feeEnabled) return 0.0;
    return _calculatedSyp * (_selectedMethod!.feePercentage / 100.0);
  }
  double get _finalCredited => (_calculatedSyp - _feeAmount).clamp(0.0, double.infinity);

  Future<void> _submitDeposit() async {
    if (!_formKey.currentState!.validate() || _selectedMethod == null) return;
    final auth = context.read<AuthProvider>();

    if (!auth.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى تسجيل الدخول أولاً لتقديم طلب إيداع')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await _depositService.submitDepositRequest(
        userId: auth.user!.id,
        userName: auth.user!.name,
        userEmail: auth.user!.email,
        userPhone: auth.user!.phone,
        methodId: _selectedMethod!.id,
        methodName: _selectedMethod!.name,
        depositCurrency: _selectedMethod!.currency,
        amountInDepositCurrency: _enteredAmount,
        exchangeRateUsed: _selectedMethod!.exchangeRateToSyp,
        expectedSypAmount: _calculatedSyp,
        feeAmount: _feeAmount,
        finalCreditedAmount: _finalCredited,
        txNumber: _txController.text.trim(),
      );

      _amountController.clear();
      _txController.clear();
      setState(() => _isSubmitting = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم رفع طلب الإيداع بنجاح، سيتم تدقيقه وشحن رصيدك فوراً!'),
            backgroundColor: AppColors.success,
          ),
        );
        _loadData();
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('شحن وإيداع الرصيد'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              color: AppColors.secondary,
              backgroundColor: AppColors.surface,
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // بطاقة الرصيد الحالي
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: AppColors.purpleGradient,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.3),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'الرصيد المتاح حالياً',
                              style: TextStyle(color: Colors.white70, fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              StoreService.formatCurrency(auth.balance, 'ل.س'),
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        const Icon(Icons.account_balance_wallet_rounded, size: 38, color: Colors.white),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // اختيار طريقة الإيداع
                  const Text(
                    'اختر طريقة التحويل المناسبة:',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 12),

                  SizedBox(
                    height: 100,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _methods.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        final method = _methods[index];
                        final isSelected = method.id == _selectedMethod?.id;

                        return GestureDetector(
                          onTap: () => setState(() => _selectedMethod = method),
                          child: Container(
                            width: 140,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSelected ? AppColors.secondary : AppColors.border,
                                width: isSelected ? 1.8 : 1,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Icon(
                                      Icons.payments_rounded,
                                      color: isSelected ? AppColors.secondary : AppColors.textMuted,
                                      size: 22,
                                    ),
                                    Text(
                                      method.currency,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: isSelected ? AppColors.secondary : AppColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  method.name,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 20),

                  // تفاصيل الحساب المختار ورقم التحويل
                  if (_selectedMethod != null) ...[
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
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'بيانات حساب ${_selectedMethod!.name}',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.secondary, fontSize: 14),
                              ),
                              if (_selectedMethod!.exchangeRateToSyp != 1.0)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceLight,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '1 ${_selectedMethod!.currency} = ${StoreService.formatCurrency(_selectedMethod!.exchangeRateToSyp, 'ل.س')}',
                                    style: const TextStyle(fontSize: 10, color: AppColors.warning, fontWeight: FontWeight.bold),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // رقم الحساب مع زر النسخ
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    _selectedMethod!.depositAddress,
                                    style: const TextStyle(
                                      fontFamily: 'monospace',
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.copy_rounded, color: AppColors.secondary, size: 20),
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: _selectedMethod!.depositAddress));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('تم نسخ رقم الحساب/المحفظة بنجاح')),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                          if (_selectedMethod!.details.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Text(
                              _selectedMethod!.details,
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // نموذج تقديم الإيداع
                    Form(
                      key: _formKey,
                      child: Container(
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
                              'تأكيد تفاصيل الإيداع:',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 14),
                            CustomTextField(
                              controller: _amountController,
                              label: 'المبلغ المحول (${_selectedMethod!.currency})',
                              hintText: 'مثال: 50000',
                              keyboardType: TextInputType.number,
                              prefixIcon: Icons.attach_money_rounded,
                              onChanged: (_) => setState(() {}),
                              validator: (val) {
                                final n = double.tryParse(val ?? '');
                                if (n == null || n <= 0) return 'أدخل مبلغ صالح';
                                if (n < _selectedMethod!.minDeposit) {
                                  return 'أقل مبلغ للإيداع هو ${_selectedMethod!.minDeposit} ${_selectedMethod!.currency}';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                            CustomTextField(
                              controller: _txController,
                              label: 'رقم العملية / رقم إشعار التحويل (Tx ID)',
                              hintText: 'أدخل رقم المعاملة للتحقق الفوري',
                              prefixIcon: Icons.receipt_rounded,
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) return 'يرجى إدخال رقم العملية';
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // الحساب التقديري للرصيد
                            if (_enteredAmount > 0)
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('الرصيد المضاف لمحفظتك:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                                    Text(
                                      StoreService.formatCurrency(_finalCredited, 'ل.س'),
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppColors.success),
                                    ),
                                  ],
                                ),
                              ),

                            const SizedBox(height: 18),
                            CustomButton(
                              text: 'إرسال طلب الإيداع',
                              icon: Icons.send_rounded,
                              isLoading: _isSubmitting,
                              onPressed: _submitDeposit,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  // سجل الإيداعات السابقة
                  if (_userDeposits.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Text(
                      'سجل عمليات الإيداع السابقة:',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 12),
                    ..._userDeposits.map((dep) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    dep.methodName,
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    StoreService.formatCurrency(dep.finalCreditedAmount, 'ل.س'),
                                    style: const TextStyle(color: AppColors.secondary, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: dep.isApproved
                                      ? AppColors.success.withValues(alpha: 0.15)
                                      : dep.isRejected
                                          ? AppColors.error.withValues(alpha: 0.15)
                                          : AppColors.warning.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  dep.statusArabic,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: dep.isApproved
                                        ? AppColors.success
                                        : dep.isRejected
                                            ? AppColors.error
                                            : AppColors.warning,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )),
                  ],
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }
}
