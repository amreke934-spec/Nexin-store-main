import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'constants/app_colors.dart';
import 'constants/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/store_provider.dart';
import 'providers/order_provider.dart';
import 'services/api_service.dart';
import 'screens/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ضبط أشرطة النظام للشفافية وتناسب نمط الألعاب المظلم
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors.surface,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // تهيئة إعدادات الاتصال والتوكن المحفوظ
  await ApiService().init();

  runApp(const NexinStoreApp());
}

class NexinStoreApp extends StatelessWidget {
  const NexinStoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => StoreProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
      ],
      child: MaterialApp(
        title: 'متجر نيكسن - Nexin Store',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark,

        // إعدادات اللغة العربية ودعم الاتجاه من اليمين إلى اليسار (RTL)
        locale: const Locale('ar', 'SY'),
        supportedLocales: const [
          Locale('ar', 'SY'),
          Locale('ar'),
          Locale('en', 'US'),
        ],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],

        // الشاشة الافتتاحية
        home: const SplashScreen(),
      ),
    );
  }
}
