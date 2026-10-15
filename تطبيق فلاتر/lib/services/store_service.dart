import '../constants/api_constants.dart';
import '../models/product_model.dart';
import '../models/banner_model.dart';
import 'api_service.dart';

class StoreService {
  final ApiService _api = ApiService();

  /// جلب كافة المنتجات والباقات الرقمية من السيرفر
  Future<List<Product>> fetchProducts() async {
    final response = await _api.get(ApiConstants.products);

    List<Product> products = [];
    if (response is Map && response['products'] is List) {
      for (var item in response['products']) {
        if (item is Map<String, dynamic>) {
          products.add(Product.fromJson(item));
        }
      }
    } else if (response is List) {
      for (var item in response) {
        if (item is Map<String, dynamic>) {
          products.add(Product.fromJson(item));
        }
      }
    }
    return products;
  }

  /// تجميع المنتجات حسب اللعبة أو الفئة لتسهيل العرض المبوب
  List<GameGroup> groupProductsByGame(List<Product> products) {
    final Map<String, List<Product>> groupsMap = {};

    for (var p in products) {
      final key = (p.gameName != null && p.gameName!.isNotEmpty)
          ? p.gameName!
          : p.category;
      groupsMap.putIfAbsent(key, () => []).add(p);
    }

    final List<GameGroup> result = [];
    groupsMap.forEach((gameName, items) {
      // فرز الباقات تصاعدياً حسب السعر
      items.sort((a, b) => a.price.compareTo(b.price));

      final minPrice = items.isNotEmpty ? items.first.price : 0.0;
      final maxPrice = items.isNotEmpty ? items.last.price : 0.0;
      final image = items.firstWhere((element) => element.image != null && element.image!.isNotEmpty, orElse: () => items.first).image;

      result.add(GameGroup(
        title: gameName,
        category: items.first.category,
        image: image,
        products: items,
        minPrice: minPrice,
        maxPrice: maxPrice,
      ));
    });

    return result;
  }

  /// جلب البانرات الترويجية
  Future<List<StoreBanner>> fetchBanners() async {
    try {
      final response = await _api.get('${ApiConstants.settings}/nexen_banners');
      if (response is Map && response['value'] != null) {
        final val = response['value'];
        if (val is List) {
          return val.map((b) => StoreBanner.fromJson(b)).toList();
        }
      }
    } catch (_) {
      // العودة للبانرات الافتراضية في حال عدم توفر اتصال
    }

    // البانرات الترويجية الأساسية لمتجر نيكسن
    return [
      StoreBanner(
        id: '1',
        title: 'شحن فوري ومضمون 100%',
        subtitle: 'شحن جواهر فري فاير وشدات ببجي بأرخص الأسعار في سوريا',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        badgeText: 'أفضل الأسعار',
      ),
      StoreBanner(
        id: '2',
        title: 'خدمات الكاش السريع',
        subtitle: 'شحن وتحويل فوري لمحفظة سيريتل كاش و MTN Cash',
        imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
        badgeText: 'حوالات فورية',
      ),
      StoreBanner(
        id: '3',
        title: 'بطاقات الهدايا والألعاب',
        subtitle: 'بلايستيشن، ستيم، ريزر جولد، وبطاقات أبل وجوجل بلاي',
        imageUrl: 'https://images.unsplash.com/photo-1612287232918-35686008b8b5?auto=format&fit=crop&w=1200&q=80',
        badgeText: 'تسليم فوري',
      ),
    ];
  }

  /// تنسيق العملة
  static String formatCurrency(double amount, [String currency = 'ل.س']) {
    final formatted = amount.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
    return '$formatted $currency';
  }
}
