import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_colors.dart';
import '../constants/api_constants.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/store_service.dart';
import '../widgets/custom_button.dart';
import 'auth_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showServerSettingsDialog(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    final currentUrl = prefs.getString(ApiConstants.prefsCustomBaseUrl) ?? ApiService().baseUrl;
    final controller = TextEditingController(text: currentUrl);

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: AppColors.border)),
        title: const Text('إعدادات اتصال السيرفر (API)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'يمكنك ضبط رابط الخادم المباشر هنا لربط التطبيق بسيرفرك المحلي أو السحابي:',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              style: const TextStyle(fontSize: 13, color: Colors.white),
              decoration: const InputDecoration(
                hintText: 'https://...',
                prefixIcon: Icon(Icons.link_rounded, color: AppColors.secondary, size: 20),
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
            onPressed: () async {
              final newUrl = controller.text.trim();
              if (newUrl.isNotEmpty) {
                ApiService().setBaseUrl(newUrl);
                await prefs.setString(ApiConstants.prefsCustomBaseUrl, newUrl);
                if (ctx.mounted) Navigator.pop(ctx);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم تحديث رابط السيرفر بنجاح')),
                  );
                }
              }
            },
            child: const Text('حفظ التغييرات'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('حسابي والإعدادات'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // كرت الملف الشخصي
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: user == null
                ? Column(
                    children: [
                      const Icon(Icons.account_circle_outlined, size: 64, color: AppColors.textMuted),
                      const SizedBox(height: 12),
                      const Text(
                        'أنت تتصفح كزائر حالياً',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'قم بتسجيل الدخول للاحتفاظ برصيدك وسجل طلباتك',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 16),
                      CustomButton(
                        text: 'تسجيل الدخول / حساب جديد',
                        icon: Icons.login_rounded,
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (context) => const AuthScreen()),
                          );
                        },
                      ),
                    ],
                  )
                : Row(
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: const BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            user.name.isNotEmpty ? user.name[0].toUpperCase() : 'N',
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user.name,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              user.email,
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'الرصيد: ${StoreService.formatCurrency(user.balance, 'ل.س')}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.secondary),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 20),

          // قسم الآيديات المحفوظة
          if (user != null && user.savedPlayerIds.isNotEmpty) ...[
            const Text(
              'معرفات اللاعبين المحفوظة (Player IDs):',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: user.savedPlayerIds.length,
                separatorBuilder: (_, __) => const Divider(),
                itemBuilder: (context, index) {
                  final entry = user.savedPlayerIds.entries.elementAt(index);
                  return ListTile(
                    leading: const Icon(Icons.gamepad_rounded, color: AppColors.secondary),
                    title: Text(entry.key, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                    subtitle: Text(entry.value, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'monospace')),
                    trailing: IconButton(
                      icon: const Icon(Icons.copy_rounded, size: 18, color: AppColors.textMuted),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: entry.value));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('تم نسخ الآيدي')),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 20),
          ],

          // قائمة الإعدادات والخدمات
          const Text(
            'الدعم والإعدادات:',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 10),

          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.support_agent_rounded, color: AppColors.success),
                  title: const Text('الدعم الفني عبر واتساب', style: TextStyle(color: Colors.white, fontSize: 14)),
                  trailing: const Icon(Icons.chevron_left_rounded, color: AppColors.textMuted),
                  onTap: () => _launchUrl('https://wa.me/963900000000'),
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.send_rounded, color: AppColors.info),
                  title: const Text('قناة تيليجرام الرسمية', style: TextStyle(color: Colors.white, fontSize: 14)),
                  trailing: const Icon(Icons.chevron_left_rounded, color: AppColors.textMuted),
                  onTap: () => _launchUrl('https://t.me/nexin_store'),
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.dns_rounded, color: AppColors.warning),
                  title: const Text('عنوان السيرفر (API Server URL)', style: TextStyle(color: Colors.white, fontSize: 14)),
                  subtitle: Text(ApiService().baseUrl, style: const TextStyle(fontSize: 11, color: AppColors.textMuted), maxLines: 1),
                  trailing: const Icon(Icons.settings_rounded, color: AppColors.textMuted),
                  onTap: () => _showServerSettingsDialog(context),
                ),
                if (user != null) ...[
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.logout_rounded, color: AppColors.error),
                    title: const Text('تسجيل الخروج', style: TextStyle(color: AppColors.error, fontSize: 14, fontWeight: FontWeight.bold)),
                    onTap: () async {
                      await auth.logout();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('تم تسجيل الخروج بنجاح')),
                        );
                      }
                    },
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
