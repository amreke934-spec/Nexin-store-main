import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final LinearGradient? gradient;
  final Color? backgroundColor;
  final Color? textColor;
  final double height;
  final double borderRadius;
  final bool isOutlined;

  const CustomButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.gradient,
    this.backgroundColor,
    this.textColor,
    this.height = 50,
    this.borderRadius = 14,
    this.isOutlined = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isOutlined) {
      return SizedBox(
        height: height,
        child: OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.primary, width: 1.5),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(borderRadius),
            ),
          ),
          child: _buildContent(context, AppColors.primary),
        ),
      );
    }

    final effectiveGradient = gradient ?? (backgroundColor == null ? AppColors.primaryGradient : null);

    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: effectiveGradient,
        color: effectiveGradient == null ? (backgroundColor ?? AppColors.primary) : null,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: onPressed == null
            ? []
            : [
                BoxShadow(
                  color: (effectiveGradient != null ? AppColors.primary : (backgroundColor ?? AppColors.primary))
                      .withValues(alpha: 0.35),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Center(
            child: _buildContent(context, textColor ?? Colors.white),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Color color) {
    if (isLoading) {
      return SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          valueColor: AlwaysStoppedAnimation<Color>(color),
        ),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
        ],
        Text(
          text,
          style: TextStyle(
            color: color,
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
