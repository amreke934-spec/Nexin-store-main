import 'package:flutter/material.dart';

/// نظام الألوان الرسمي لمتجر نيكسن (Nexin Store Design System)
class AppColors {
  // الألوان الأساسية للخلفية والأسطح
  static const Color background = Color(0xFF0B0F19);
  static const Color surface = Color(0xFF121624);
  static const Color surfaceLight = Color(0xFF1A2234);
  static const Color card = Color(0xFF131827);
  static const Color cardElevated = Color(0xFF181F33);

  // ألوان هوية نيكسن (Neon Violet & Electric Cyan)
  static const Color primary = Color(0xFF7F00FF);
  static const Color primaryLight = Color(0xFF9D4EDD);
  static const Color primaryGlow = Color(0x667F00FF);
  static const Color secondary = Color(0xFF00F0FF);
  static const Color secondaryDark = Color(0xFF0284C7);

  // ألوان الحالات والعمليات
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // النصوص
  static const Color textPrimary = Color(0xFFF1F5F9);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  // الحدود والخطوط
  static const Color border = Color(0x1AFFFFFF);
  static const Color borderStrong = Color(0x33FFFFFF);

  // تدرجات لونية (Gradients)
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF7F00FF), Color(0xFF00F0FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient purpleGradient = LinearGradient(
    colors: [Color(0xFF7F00FF), Color(0xFF5A00B8)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF181F33), Color(0xFF121624)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
