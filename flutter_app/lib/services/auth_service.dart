import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';
import '../models/user_model.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api = ApiService();

  /// تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
  Future<CustomerUser> login(String email, String password) async {
    final response = await _api.post(
      ApiConstants.login,
      body: {
        'email': email.trim().toLowerCase(),
        'password': password,
      },
    );

    if (response is Map && response['success'] == true && response['user'] != null) {
      final token = response['token']?.toString();
      final user = CustomerUser.fromJson(response['user'], token: token);

      await saveUserSession(user, token);
      return user;
    } else {
      throw ApiException(response['error']?.toString() ?? 'فشل تسجيل الدخول');
    }
  }

  /// إنشاء حساب جديد
  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final response = await _api.post(
      ApiConstants.register,
      body: {
        'name': name.trim(),
        'email': email.trim().toLowerCase(),
        'password': password,
        'phone': phone?.trim(),
      },
    );

    return Map<String, dynamic>.from(response);
  }

  /// التحقق من كود الـ OTP المرسل للبريد
  Future<CustomerUser> verifyOtp(String email, String otp) async {
    final response = await _api.post(
      ApiConstants.verifyOtp,
      body: {
        'email': email.trim().toLowerCase(),
        'otp': otp.trim(),
      },
    );

    if (response is Map && response['success'] == true && response['user'] != null) {
      final token = response['token']?.toString();
      final user = CustomerUser.fromJson(response['user'], token: token);
      await saveUserSession(user, token);
      return user;
    } else {
      throw ApiException(response['error']?.toString() ?? 'كود التحقق غير صحيح');
    }
  }

  /// جلب الملف الشخصي والبيانات الحديثة للمستخدم
  Future<CustomerUser?> getProfile(String idOrEmail) async {
    try {
      final response = await _api.get('${ApiConstants.userProfile}/${Uri.encodeComponent(idOrEmail)}');
      if (response is Map && response['user'] != null) {
        return CustomerUser.fromJson(response['user'], token: _api.authToken);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// حفظ معرف اللاعب للعبة معينة
  Future<bool> savePlayerId(String userId, String category, String playerId) async {
    try {
      final response = await _api.post(
        ApiConstants.savePlayerId,
        body: {
          'userId': userId,
          'category': category,
          'playerId': playerId,
        },
      );
      return response is Map && response['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// حفظ بيانات الجلسة محلياً
  Future<void> saveUserSession(CustomerUser user, String? token) async {
    final prefs = await SharedPreferences.getInstance();
    if (token != null) {
      _api.setAuthToken(token);
      await prefs.setString(ApiConstants.prefsUserToken, token);
    }
    await prefs.setString(ApiConstants.prefsUserData, jsonEncode(user.toJson()));
  }

  /// استعادة الجلسة المحفوظة
  Future<CustomerUser?> getSavedUserSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(ApiConstants.prefsUserToken);
    final userJson = prefs.getString(ApiConstants.prefsUserData);

    if (token != null) {
      _api.setAuthToken(token);
    }

    if (userJson != null) {
      try {
        final map = jsonDecode(userJson);
        final user = CustomerUser.fromJson(map, token: token);

        // جلب أحدث رصيد وبيانات من السيرفر في الخلفية
        final fresh = await getProfile(user.id);
        if (fresh != null) {
          await saveUserSession(fresh, token);
          return fresh;
        }
        return user;
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  /// تسجيل الخروج وحذف البيانات
  Future<void> logout() async {
    _api.setAuthToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(ApiConstants.prefsUserToken);
    await prefs.remove(ApiConstants.prefsUserData);
  }
}
