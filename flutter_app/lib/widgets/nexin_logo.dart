import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';

class NexinLogo extends StatelessWidget {
  final double size;
  final bool showText;
  final bool animate;

  const NexinLogo({
    super.key,
    this.size = 48,
    this.showText = true,
    this.animate = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // رمز الشعار الأيقوني (Glowing Diamond Prism)
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppColors.primaryGradient,
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.4),
                blurRadius: size * 0.4,
                spreadRadius: 1,
              ),
              BoxShadow(
                color: AppColors.secondary.withValues(alpha: 0.2),
                blurRadius: size * 0.6,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Center(
            child: Icon(
              Icons.flash_on_rounded,
              color: Colors.white,
              size: size * 0.58,
            ),
          ),
        ),
        if (showText) ...[
          const SizedBox(width: 10),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ShaderMask(
                shaderCallback: (bounds) => AppColors.primaryGradient.createShader(bounds),
                child: Text(
                  'NEXIN STORE',
                  style: GoogleFonts.orbitron(
                    fontSize: size * 0.38,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    color: Colors.white,
                  ),
                ),
              ),
              Text(
                'متجر نيكسن الرقمي',
                style: GoogleFonts.cairo(
                  fontSize: size * 0.24,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  height: 1.1,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
