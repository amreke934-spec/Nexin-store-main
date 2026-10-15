import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../models/product_model.dart';
import '../providers/auth_provider.dart';
import '../services/store_service.dart';
import '../widgets/package_card.dart';
import '../widgets/custom_button.dart';
import 'checkout_screen.dart';
import 'auth_screen.dart';

class GamePackagesScreen extends StatefulWidget {
  final GameGroup gameGroup;

  const GamePackagesScreen({super.key, required this.gameGroup});

  @override
  State<GamePackagesScreen> createState() => _GamePackagesScreenState();
}

class _GamePackagesScreenState extends State<GamePackagesScreen> {
  late Product _selectedProduct;

  @override
  void initState() {
    super.initState();
    _selectedProduct = widget.gameGroup.products.first;
  }

  void _proceedToCheckout() {
    final auth = context.read<AuthProvider>();

    if (!auth.isAuthenticated) {
      showModalBottomSheet(
        context: context,
        backgroundColor: AppColors.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 18),
              const Icon(Icons.lock_outline_rounded, color: AppColors.secondary, size: 40),
              const SizedBox(height: 12),
              const Text(
                'تسجيل الدخول مطلوب للشحن',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 6),
              const Text(
                'يرجى تسجيل الدخول إلى حسابك للشحن المباشر من رصيد المحفظة وتتبع طلبك.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              CustomButton(
                text: 'تسجيل الدخول / إنشاء حساب',
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => AuthScreen(
                        onAuthSuccess: () {
                          _navigateToCheckout();
                        },
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _navigateToCheckout(); // المتابعة كزائر
                },
                child: const Text('المتابعة كزائر بدون حساب', style: TextStyle(color: AppColors.textMuted)),
              ),
            ],
          ),
        ),
      );
    } else {
      _navigateToCheckout();
    }
  }

  void _navigateToCheckout() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => CheckoutScreen(
          product: _selectedProduct,
          gameGroup: widget.gameGroup,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final savedId = auth.user?.savedPlayerIds[widget.gameGroup.title] ??
        auth.user?.savedPlayerIds[widget.gameGroup.category];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.gameGroup.title),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // رأس اللعبة مع الصورة
                Container(
                  height: 150,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.border),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (widget.gameGroup.image != null)
                        CachedNetworkImage(
                          imageUrl: widget.gameGroup.image!,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(color: AppColors.surfaceLight),
                          errorWidget: (_, __, ___) => Container(color: AppColors.surfaceLight),
                        ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.black.withValues(alpha: 0.9),
                              Colors.black.withValues(alpha: 0.3),
                            ],
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 14,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.gameGroup.title,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  widget.gameGroup.category,
                                  style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.4),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.primary),
                              ),
                              child: Text(
                                '${widget.gameGroup.packageCount} باقة متوفرة',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // تنبيه وجود آيدي محفوظ
                if (savedId != null && savedId.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'الآيدي المحفوظ لديك: $savedId (سيتم إدراجه تلقائياً)',
                            style: const TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),

                // عنوان اختيار الباقة
                const Text(
                  'اختر الباقة المراد شحنها:',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // قائمة الباقات
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: widget.gameGroup.products.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final pkg = widget.gameGroup.products[index];
                    final isSelected = pkg.productId == _selectedProduct.productId;

                    return PackageCard(
                      product: pkg,
                      isSelected: isSelected,
                      onTap: () {
                        setState(() {
                          _selectedProduct = pkg;
                        });
                      },
                    );
                  },
                ),
              ],
            ),
          ),

          // الشريط السفلي لتأكيد الاختيار
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: const Border(
                top: BorderSide(color: AppColors.border),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.4),
                  blurRadius: 14,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _selectedProduct.name,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          StoreService.formatCurrency(_selectedProduct.price, 'ل.س'),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: CustomButton(
                      text: 'متابعة الشحن',
                      icon: Icons.flash_on_rounded,
                      onPressed: _proceedToCheckout,
                    ),
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
