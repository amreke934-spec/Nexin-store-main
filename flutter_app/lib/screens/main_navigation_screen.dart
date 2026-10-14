import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/auth_provider.dart';
import 'home_screen.dart';
import 'orders_screen.dart';
import 'deposit_screen.dart';
import 'profile_screen.dart';
import 'order_tracking_screen.dart';
import 'auth_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final int initialIndex;
  const MainNavigationScreen({super.key, this.initialIndex = 0});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void _onTabSelected(int index) {
    final auth = context.read<AuthProvider>();

    // حماية التبويبات التي تتطلب تسجيل الدخول (طلباتي وإيداع)
    if ((index == 1 || index == 2) && !auth.isAuthenticated) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => AuthScreen(
            onAuthSuccess: () {
              setState(() => _currentIndex = index);
            },
          ),
        ),
      );
      return;
    }

    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      HomeScreen(
        onNavigateToDeposit: () => _onTabSelected(2),
        onNavigateToOrders: () => _onTabSelected(1),
      ),
      const OrdersScreen(),
      const DepositScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: const Border(
            top: BorderSide(color: AppColors.border, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabSelected,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.storefront_rounded),
              activeIcon: Icon(Icons.storefront_rounded, color: AppColors.secondary),
              label: 'المتجر',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_rounded),
              activeIcon: Icon(Icons.receipt_long_rounded, color: AppColors.secondary),
              label: 'طلباتي',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_rounded),
              activeIcon: Icon(Icons.account_balance_wallet_rounded, color: AppColors.secondary),
              label: 'إيداع رصيد',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_rounded),
              activeIcon: Icon(Icons.person_rounded, color: AppColors.secondary),
              label: 'حسابي',
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        mini: true,
        backgroundColor: AppColors.surfaceLight,
        elevation: 3,
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (context) => const OrderTrackingScreen()),
          );
        },
        child: const Icon(Icons.search_rounded, color: AppColors.secondary, size: 22),
      ),
    );
  }
}
