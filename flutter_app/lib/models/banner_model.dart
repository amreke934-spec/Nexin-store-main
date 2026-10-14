/// نموذج البانر الإعلاني في الواجهة الرئيسية
class StoreBanner {
  final String id;
  final String title;
  final String? subtitle;
  final String imageUrl;
  final String? linkUrl;
  final String actionType; // 'url' | 'category' | 'none'
  final String? targetCategory;
  final String? badgeText;
  final bool isActive;

  StoreBanner({
    required this.id,
    required this.title,
    this.subtitle,
    required this.imageUrl,
    this.linkUrl,
    this.actionType = 'none',
    this.targetCategory,
    this.badgeText,
    this.isActive = true,
  });

  factory StoreBanner.fromJson(Map<String, dynamic> json) {
    return StoreBanner(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'عرض خاص',
      subtitle: json['subtitle']?.toString(),
      imageUrl: json['imageUrl']?.toString() ?? '',
      linkUrl: json['linkUrl']?.toString(),
      actionType: json['actionType']?.toString() ?? 'none',
      targetCategory: json['targetCategory']?.toString(),
      badgeText: json['badgeText']?.toString(),
      isActive: json['isActive'] != false,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'subtitle': subtitle,
    'imageUrl': imageUrl,
    'linkUrl': linkUrl,
    'actionType': actionType,
    'targetCategory': targetCategory,
    'badgeText': badgeText,
    'isActive': isActive,
  };
}
