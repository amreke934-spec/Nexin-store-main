/// ثوابت الـ API وإعدادات الاتصال بالسيرفر
class ApiConstants {
  // عنوان السيرفر الأساسي (يمكن تغييره إلى عنوان النطاق المباشر أو الـ localhost أثناء التجربة)
  // للأجهزة الفعلية Android: 10.0.2.2 لمحاكي الأندرويد، أو رابط السيرفر المباشر
  static const String defaultBaseUrl = 'https://ais-dev-xqhbxjkvar2djmuf77afzq-725716638615.europe-west2.run.app';
  
  // مسارات المصادقة والمستخدمين
  static const String register = '/api/auth/register';
  static const String login = '/api/auth/login';
  static const String verifyOtp = '/api/auth/verify-email-otp';
  static const String userProfile = '/api/users/profile';
  static const String savePlayerId = '/api/users/save-player-id';

  // مسارات المنتجات والمتجر
  static const String products = '/api/sc/products';
  static const String merchantInfo = '/api/sc/merchant-info';

  // مسارات الطلبات
  static const String createOrder = '/api/sc/orders/create';
  static const String saveOrder = '/api/orders/save';
  static const String userOrders = '/api/orders/user';
  static const String trackOrder = '/api/sc/orders/track';
  static const String checkProcessing = '/api/sc/orders/check-processing';

  // مسارات الإيداع وطرق الدفع
  static const String depositMethods = '/api/deposits/methods';
  static const String submitDeposit = '/api/deposits/request';
  static const String userDeposits = '/api/deposits/user';

  // مسارات الإعدادات
  static const String settings = '/api/settings';
  
  // مفاتيح التخزين المحلي (SharedPreferences)
  static const String prefsUserToken = 'nexin_auth_token';
  static const String prefsUserData = 'nexin_user_data';
  static const String prefsSavedIds = 'nexin_saved_player_ids';
  static const String prefsCustomBaseUrl = 'nexin_custom_base_url';
}
