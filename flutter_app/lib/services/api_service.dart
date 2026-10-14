import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic details;

  ApiException(this.message, {this.statusCode, this.details});

  @override
  String toString() => message;
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String _baseUrl = ApiConstants.defaultBaseUrl;
  String? _authToken;

  String get baseUrl => _baseUrl;
  String? get authToken => _authToken;

  /// تهيئة الخدمة وقراءة التوكن المحفوظ
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString(ApiConstants.prefsUserToken);
    final customUrl = prefs.getString(ApiConstants.prefsCustomBaseUrl);
    if (customUrl != null && customUrl.isNotEmpty) {
      _baseUrl = customUrl;
    }
  }

  void setBaseUrl(String url) {
    _baseUrl = url;
  }

  void setAuthToken(String? token) {
    _authToken = token;
  }

  Map<String, String> _buildHeaders([Map<String, String>? extra]) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (_authToken != null && _authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_authToken';
    }

    if (extra != null) {
      headers.addAll(extra);
    }
    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$_baseUrl$normalizedPath';
    return Uri.parse(fullUrl).replace(
      queryParameters: queryParams?.map((key, value) => MapEntry(key, value.toString())),
    );
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParams, Map<String, String>? headers}) async {
    try {
      final uri = _buildUri(path, queryParams);
      final response = await http.get(uri, headers: _buildHeaders(headers)).timeout(const Duration(seconds: 25));
      return _processResponse(response);
    } on SocketException {
      throw ApiException('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.');
    } on http.ClientException {
      throw ApiException('خطأ في طلب الشبكة.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('حدث خطأ غير متوقع: $e');
    }
  }

  Future<dynamic> post(String path, {dynamic body, Map<String, String>? headers}) async {
    try {
      final uri = _buildUri(path);
      final response = await http
          .post(
            uri,
            headers: _buildHeaders(headers),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 35));
      return _processResponse(response);
    } on SocketException {
      throw ApiException('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('حدث خطأ غير متوقع: $e');
    }
  }

  dynamic _processResponse(http.Response response) {
    final bodyString = response.body;
    dynamic data;
    try {
      data = jsonDecode(bodyString);
    } catch (_) {
      data = {'raw': bodyString};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      String errorMessage = 'حدث خطأ في معالجة الطلب (${response.statusCode})';
      if (data is Map && data['error'] != null) {
        errorMessage = data['error'].toString();
      } else if (data is Map && data['message'] != null) {
        errorMessage = data['message'].toString();
      }
      throw ApiException(errorMessage, statusCode: response.statusCode, details: data);
    }
  }
}
