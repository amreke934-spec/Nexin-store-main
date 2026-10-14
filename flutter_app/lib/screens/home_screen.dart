import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/auth_provider.dart';
import '../providers/store_provider.dart';
import '../widgets/nexin_logo.dart';
import '../widgets/balance_card.dart';
import '../widgets/banner_slider.dart';
import '../widgets/game_card.dart';
import 'game_packages_screen.dart';
import 'auth_screen.dart';
import 'order_tracking_screen.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback onNavigateToDeposit;
  final VoidCallback onNavigateToOrders;

  const HomeScreen({
    super.key,
    required this.onNavigateToDeposit,
    required this.onNavigateToOrders,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  final List<String> _categories = [
    'الكل',
    'ألعاب رقمية',
    'بطاقات',
    'كاش',
    'تطبيقات',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final store = context.watch<StoreProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const NexinLogo(size: 34),
        actions: [
          IconButton(
            icon: const Icon(Icons.track_changes_rounded, color: AppColors.secondary),
            tooltip: 'تتبع الطلب',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const OrderTrackingScreen()),
              );
            },
          ),
          if (!auth.isAuthenticated)
            TextButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (context) => const AuthScreen()),
                );
              },
              icon: const Icon(Icons.login_rounded, size: 16, color: Colors.white),
              label: const Text('دخول', style: TextStyle(color: Colors.white, fontSize: 13)),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.secondary,
        backgroundColor: AppColors.surface,
        onRefresh: () async {
          await Future.wait([
            store.loadStoreData(),
            auth.refreshProfile(),
          ]);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // بطاقة الرصيد والمحفظة
                    BalanceCard(
                      user: auth.user,
                      onDepositTap: widget.onNavigateToDeposit,
                      onLoginTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (context) => const AuthScreen()),
                        );
                      },
                    ),
                    const SizedBox(height: 16),

                    // سلايدر البانرات الإعلانية
                    if (store.banners.isNotEmpty) ...[
                      BannerSlider(
                        banners: store.banners,
                        onBannerTap: (banner) {
                          if (banner.targetCategory != null) {
                            store.setCategory(banner.targetCategory!);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                    ],

                    // شريط البحث السريع
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) => store.setSearchQuery(val),
                        style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'ابحث عن لعبة أو بطاقة أو باقة (ببجي، فري فاير...)...',
                          prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted, size: 20),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear_rounded, size: 18, color: AppColors.textMuted),
                                  onPressed: () {
                                    _searchController.clear();
                                    store.clearSearch();
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: false,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // شريط تصفية الفئات (Category Pills)
                    SizedBox(
                      height: 40,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _categories.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final cat = _categories[index];
                          final isSelected = store.selectedCategory == cat;

                          return ChoiceChip(
                            label: Text(cat),
                            selected: isSelected,
                            onSelected: (_) => store.setCategory(cat),
                            labelStyle: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white : AppColors.textSecondary,
                            ),
                            backgroundColor: AppColors.surface,
                            selectedColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(
                                color: isSelected ? AppColors.primaryLight : AppColors.border,
                              ),
                            ),
                            showCheckmark: false,
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),

                    // عنوان قسم المنتجات
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 4,
                              height: 18,
                              decoration: BoxDecoration(
                                color: AppColors.secondary,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'الألعاب والخدمات المتاحة',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '${store.filteredGameGroups.length} خدمة',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // شبكة الألعاب والمنتجات
            if (store.isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (store.filteredGameGroups.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.search_off_rounded, size: 54, color: AppColors.textMuted),
                      const SizedBox(height: 12),
                      const Text(
                        'لم يتم العثور على ألعاب مطابقة للبحث',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () {
                          _searchController.clear();
                          store.clearSearch();
                          store.setCategory('الكل');
                        },
                        child: const Text('إعادة ضبط البحث', style: TextStyle(color: AppColors.secondary)),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 14,
                    childAspectRatio: 0.78,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final group = store.filteredGameGroups[index];
                      return GameCard(
                        gameGroup: group,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => GamePackagesScreen(gameGroup: group),
                            ),
                          );
                        },
                      );
                    },
                    childCount: store.filteredGameGroups.length,
                  ),
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }
}
