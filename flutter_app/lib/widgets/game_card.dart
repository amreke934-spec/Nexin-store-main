import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../constants/app_colors.dart';
import '../models/product_model.dart';
import '../services/store_service.dart';

class GameCard extends StatelessWidget {
  final GameGroup gameGroup;
  final VoidCallback onTap;

  const GameCard({
    super.key,
    required this.gameGroup,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          splashColor: AppColors.primary.withValues(alpha: 0.15),
          highlightColor: AppColors.primary.withValues(alpha: 0.05),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // صورة الغلاف والأيقونة
              Expanded(
                flex: 12,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (gameGroup.image != null && gameGroup.image!.isNotEmpty)
                      CachedNetworkImage(
                        imageUrl: gameGroup.image!,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: AppColors.surfaceLight,
                          child: const Center(
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                            ),
                          ),
                        ),
                        errorWidget: (context, url, error) => _buildPlaceholder(),
                      )
                    else
                      _buildPlaceholder(),
                    // تدرج ظل سفلي
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.75),
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ),
                    // شارة عدد الباقات
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.layers_rounded, size: 12, color: AppColors.secondary),
                            const SizedBox(width: 4),
                            Text(
                              '${gameGroup.packageCount} باقة',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // اسم اللعبة والأسعار
              Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      gameGroup.title,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'يبدأ من',
                          style: TextStyle(
                            fontSize: 10,
                            color: AppColors.textMuted,
                          ),
                        ),
                        Text(
                          StoreService.formatCurrency(gameGroup.minPrice, 'ل.س'),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: AppColors.secondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.cardGradient),
      child: const Center(
        child: Icon(Icons.videogame_asset_rounded, size: 36, color: AppColors.textMuted),
      ),
    );
  }
}
