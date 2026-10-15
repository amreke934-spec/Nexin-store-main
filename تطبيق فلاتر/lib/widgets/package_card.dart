import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';
import '../models/product_model.dart';
import '../services/store_service.dart';

class PackageCard extends StatelessWidget {
  final Product product;
  final bool isSelected;
  final VoidCallback onTap;

  const PackageCard({
    super.key,
    required this.product,
    this.isSelected = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isSelected ? AppColors.primary.withValues(alpha: 0.12) : AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSelected ? AppColors.secondary : AppColors.border,
          width: isSelected ? 1.8 : 1,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: AppColors.secondary.withValues(alpha: 0.2),
                  blurRadius: 10,
                  spreadRadius: 1,
                )
              ]
            : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                // أيقونة الباقة
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Icon(
                      product.isCash
                          ? Icons.account_balance_wallet_rounded
                          : Icons.diamond_rounded,
                      color: isSelected ? Colors.white : AppColors.secondary,
                      size: 22,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                // اسم الباقة والتفاصيل
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              product.name,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (product.badge != null && product.badge!.isNotEmpty)
                            Container(
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.warning.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                product.badge!,
                                style: const TextStyle(
                                  color: AppColors.warning,
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        StoreService.formatCurrency(product.price, 'ل.س'),
                        style: GoogleFonts.cairo(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: isSelected ? AppColors.secondary : AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                // زر الاختيار الراديو
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? AppColors.secondary : AppColors.textMuted,
                      width: 2,
                    ),
                    color: isSelected ? AppColors.secondary : Colors.transparent,
                  ),
                  child: isSelected
                      ? const Center(
                          child: Icon(Icons.check, size: 14, color: Colors.black),
                        )
                      : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
