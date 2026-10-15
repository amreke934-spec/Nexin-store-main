import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/auth_provider.dart';
import '../widgets/nexin_logo.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';

class AuthScreen extends StatefulWidget {
  final VoidCallback? onAuthSuccess;

  const AuthScreen({super.key, this.onAuthSuccess});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final _loginFormKey = GlobalKey<FormState>();
  final _registerFormKey = GlobalKey<FormState>();

  // Login controllers
  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();

  // Register controllers
  final _regNameController = TextEditingController();
  final _regEmailController = TextEditingController();
  final _regPhoneController = TextEditingController();
  final _regPasswordController = TextEditingController();

  // OTP controller
  final _otpController = TextEditingController();
  bool _showOtpStep = false;
  String _pendingEmail = '';

  bool _obscureLoginPassword = true;
  bool _obscureRegPassword = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginEmailController.dispose();
    _loginPasswordController.dispose();
    _regNameController.dispose();
    _regEmailController.dispose();
    _regPhoneController.dispose();
    _regPasswordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_loginFormKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();

    final success = await auth.login(
      _loginEmailController.text.trim(),
      _loginPasswordController.text,
    );

    if (success && mounted) {
      widget.onAuthSuccess?.call();
      Navigator.pop(context);
    }
  }

  Future<void> _handleRegister() async {
    if (!_registerFormKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();

    try {
      final res = await auth.register(
        name: _regNameController.text.trim(),
        email: _regEmailController.text.trim(),
        password: _regPasswordController.text,
        phone: _regPhoneController.text.trim(),
      );

      if (res['requireOtp'] == true || res['status'] == 'verification_required') {
        setState(() {
          _showOtpStep = true;
          _pendingEmail = _regEmailController.text.trim();
        });
      } else if (auth.isAuthenticated) {
        if (mounted) {
          widget.onAuthSuccess?.call();
          Navigator.pop(context);
        }
      }
    } catch (_) {}
  }

  Future<void> _handleVerifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.length < 4) return;
    final auth = context.read<AuthProvider>();

    final success = await auth.verifyOtp(_pendingEmail, otp);
    if (success && mounted) {
      widget.onAuthSuccess?.call();
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('المصادقة وتأكيد الحساب'),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const NexinLogo(size: 60),
                  const SizedBox(height: 24),

                  if (auth.errorMessage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              auth.errorMessage!,
                              style: const TextStyle(color: AppColors.error, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),

                  if (_showOtpStep)
                    _buildOtpSection(auth)
                  else ...[
                    // تبويبات الدخول وإنشاء حساب
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: TabBar(
                        controller: _tabController,
                        indicatorSize: TabBarIndicatorSize.tab,
                        indicator: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        labelColor: Colors.white,
                        unselectedLabelColor: AppColors.textSecondary,
                        tabs: const [
                          Tab(text: 'تسجيل الدخول'),
                          Tab(text: 'حساب جديد'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // محتوى التبويبات
                    SizedBox(
                      height: 380,
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildLoginForm(auth),
                          _buildRegisterForm(auth),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm(AuthProvider auth) {
    return Form(
      key: _loginFormKey,
      child: Column(
        children: [
          CustomTextField(
            controller: _loginEmailController,
            label: 'البريد الإلكتروني',
            hintText: 'user@example.com',
            keyboardType: TextInputType.emailAddress,
            prefixIcon: Icons.email_outlined,
            validator: (v) => (v == null || !v.contains('@')) ? 'أدخل بريد صالح' : null,
          ),
          const SizedBox(height: 14),
          CustomTextField(
            controller: _loginPasswordController,
            label: 'كلمة المرور',
            hintText: '••••••••',
            obscureText: _obscureLoginPassword,
            prefixIcon: Icons.lock_outline_rounded,
            suffixIcon: IconButton(
              icon: Icon(
                _obscureLoginPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                color: AppColors.textMuted,
              ),
              onPressed: () => setState(() => _obscureLoginPassword = !_obscureLoginPassword),
            ),
            validator: (v) => (v == null || v.length < 6) ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : null,
          ),
          const SizedBox(height: 24),
          CustomButton(
            text: 'تسجيل الدخول',
            icon: Icons.login_rounded,
            isLoading: auth.isLoading,
            onPressed: _handleLogin,
          ),
        ],
      ),
    );
  }

  Widget _buildRegisterForm(AuthProvider auth) {
    return Form(
      key: _registerFormKey,
      child: SingleChildScrollView(
        child: Column(
          children: [
            CustomTextField(
              controller: _regNameController,
              label: 'الاسم الكامل',
              hintText: 'أحمد السوري',
              prefixIcon: Icons.person_outline_rounded,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'أدخل اسمك' : null,
            ),
            const SizedBox(height: 12),
            CustomTextField(
              controller: _regEmailController,
              label: 'البريد الإلكتروني',
              hintText: 'user@example.com',
              keyboardType: TextInputType.emailAddress,
              prefixIcon: Icons.email_outlined,
              validator: (v) => (v == null || !v.contains('@')) ? 'أدخل بريد إلكتروني صالح' : null,
            ),
            const SizedBox(height: 12),
            CustomTextField(
              controller: _regPhoneController,
              label: 'رقم الهاتف (اختياري)',
              hintText: '09xxxxxxxx',
              keyboardType: TextInputType.phone,
              prefixIcon: Icons.phone_android_rounded,
            ),
            const SizedBox(height: 12),
            CustomTextField(
              controller: _regPasswordController,
              label: 'كلمة المرور',
              hintText: '••••••••',
              obscureText: _obscureRegPassword,
              prefixIcon: Icons.lock_outline_rounded,
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureRegPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: AppColors.textMuted,
                ),
                onPressed: () => setState(() => _obscureRegPassword = !_obscureRegPassword),
              ),
              validator: (v) => (v == null || v.length < 6) ? 'كلمة المرور 6 أحرف على الأقل' : null,
            ),
            const SizedBox(height: 20),
            CustomButton(
              text: 'إنشاء حساب جديد',
              icon: Icons.person_add_rounded,
              isLoading: auth.isLoading,
              onPressed: _handleRegister,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOtpSection(AuthProvider auth) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          const Icon(Icons.mark_email_unread_rounded, size: 48, color: AppColors.secondary),
          const SizedBox(height: 12),
          const Text(
            'تأكيد رمز التحقق (OTP)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            'تم إرسال كود التحقق المكون من 6 أرقام إلى: $_pendingEmail',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 20),
          CustomTextField(
            controller: _otpController,
            label: 'رمز التحقق',
            hintText: '123456',
            keyboardType: TextInputType.number,
            prefixIcon: Icons.key_rounded,
          ),
          const SizedBox(height: 20),
          CustomButton(
            text: 'تأكيد ودخول',
            isLoading: auth.isLoading,
            onPressed: _handleVerifyOtp,
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: () => setState(() => _showOtpStep = false),
            child: const Text('العودة للتسجيل', style: TextStyle(color: AppColors.textMuted)),
          ),
        ],
      ),
    );
  }
}
