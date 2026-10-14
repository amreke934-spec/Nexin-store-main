import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  CustomerUser? _user;
  bool _isLoading = false;
  String? _errorMessage;

  CustomerUser? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  double get balance => _user?.balance ?? 0.0;

  /// تهيئة الجلسة واسترجاع الحساب المحفوظ
  Future<void> initSession() async {
    _isLoading = true;
    notifyListeners();
    try {
      _user = await _authService.getSavedUserSession();
    } catch (_) {} finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// تسجيل الدخول
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _user = await _authService.login(email, password);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// إنشاء حساب
  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _authService.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
      );
      _isLoading = false;
      notifyListeners();
      return res;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// تأكيد رمز الـ OTP
  Future<bool> verifyOtp(String email, String otp) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _user = await _authService.verifyOtp(email, otp);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// تحديث بيانات الملف الشخصي والرصيد الحالي
  Future<void> refreshProfile() async {
    if (_user == null) return;
    try {
      final fresh = await _authService.getProfile(_user!.id);
      if (fresh != null) {
        _user = fresh;
        notifyListeners();
      }
    } catch (_) {}
  }

  /// تحديث الرصيد محلياً فوراً (بعد عملية شراء مثلاً)
  void updateLocalBalance(double newBalance) {
    if (_user != null) {
      _user = _user!.copyWith(balance: newBalance);
      notifyListeners();
    }
  }

  /// حفظ معرف اللاعب
  Future<void> savePlayerId(String category, String playerId) async {
    if (_user == null) return;
    final updatedMap = Map<String, String>.from(_user!.savedPlayerIds);
    updatedMap[category] = playerId;
    _user = _user!.copyWith(savedPlayerIds: updatedMap);
    notifyListeners();

    await _authService.savePlayerId(_user!.id, category, playerId);
  }

  /// تسجيل الخروج
  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }
}
