import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../models/banner_model.dart';
import '../services/store_service.dart';

class StoreProvider extends ChangeNotifier {
  final StoreService _storeService = StoreService();

  List<Product> _allProducts = [];
  List<GameGroup> _allGameGroups = [];
  List<StoreBanner> _banners = [];

  String _selectedCategory = 'الكل';
  String _searchQuery = '';
  bool _isLoading = false;
  String? _errorMessage;

  List<Product> get allProducts => _allProducts;
  List<GameGroup> get allGameGroups => _allGameGroups;
  List<StoreBanner> get banners => _banners;
  String get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// تصفية المجموعات بحسب الفئة المحددة والبحث
  List<GameGroup> get filteredGameGroups {
    return _allGameGroups.where((group) {
      // 1. فلترة الفئة
      if (_selectedCategory != 'الكل') {
        final matchesCategory = group.category.toLowerCase().contains(_selectedCategory.toLowerCase()) ||
            group.title.toLowerCase().contains(_selectedCategory.toLowerCase());
        if (!matchesCategory) return false;
      }

      // 2. فلترة البحث
      if (_searchQuery.trim().isNotEmpty) {
        final query = _searchQuery.trim().toLowerCase();
        final matchesTitle = group.title.toLowerCase().contains(query);
        final matchesCategory = group.category.toLowerCase().contains(query);
        final matchesAnyProduct = group.products.any((p) => p.name.toLowerCase().contains(query));
        return matchesTitle || matchesCategory || matchesAnyProduct;
      }

      return true;
    }).toList();
  }

  /// تحميل بيانات المتجر الأولية
  Future<void> loadStoreData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final bannersFuture = _storeService.fetchBanners();
      final productsFuture = _storeService.fetchProducts();

      final results = await Future.wait([bannersFuture, productsFuture]);

      _banners = results[0] as List<StoreBanner>;
      _allProducts = results[1] as List<Product>;
      _allGameGroups = _storeService.groupProductsByGame(_allProducts);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'تعذر تحميل المنتجات: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void clearSearch() {
    _searchQuery = '';
    notifyListeners();
  }
}
