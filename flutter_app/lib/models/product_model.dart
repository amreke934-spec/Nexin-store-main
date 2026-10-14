/// تكوين الحقول الديناميكية للطلب (مثل Player ID، اسم الحساب، رقم الهاتف)
class DynamicFieldConfig {
  final String name;
  final String label;
  final String type; // 'text' | 'number' | 'email' | 'select'
  final String? placeholder;
  final bool required;
  final List<String>? options;
  final String? helperText;

  DynamicFieldConfig({
    required this.name,
    required this.label,
    this.type = 'text',
    this.placeholder,
    this.required = true,
    this.options,
    this.helperText,
  });

  factory DynamicFieldConfig.fromJson(Map<String, dynamic> json) {
    return DynamicFieldConfig(
      name: json['name']?.toString() ?? 'field',
      label: json['label']?.toString() ?? json['name']?.toString() ?? 'البيان',
      type: json['type']?.toString() ?? 'text',
      placeholder: json['placeholder']?.toString(),
      required: json['required'] == true,
      options: (json['options'] as List?)?.map((e) => e.toString()).toList(),
      helperText: json['helperText']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'label': label,
    'type': type,
    'placeholder': placeholder,
    'required': required,
    'options': options,
    'helperText': helperText,
  };
}

/// نموذج المنتج / الباقة في متجر نيكسن
class Product {
  final dynamic id;
  final dynamic productId;
  final String name;
  final String category;
  final String? gameName;
  final String? sectionKey;
  final double price;
  final double? originalPrice;
  final double? supplierPrice;
  final String currency;
  final String? image;
  final String? description;
  final List<DynamicFieldConfig> dynamicFields;
  final bool inStock;
  final int? stockCount;
  final String? badge;
  final bool popular;
  final int minQty;
  final int maxQty;
  final bool isCash;
  final String? cashType;

  Product({
    required this.id,
    required this.productId,
    required this.name,
    required this.category,
    this.gameName,
    this.sectionKey,
    required this.price,
    this.originalPrice,
    this.supplierPrice,
    this.currency = 'SYP',
    this.image,
    this.description,
    this.dynamicFields = const [],
    this.inStock = true,
    this.stockCount,
    this.badge,
    this.popular = false,
    this.minQty = 1,
    this.maxQty = 100,
    this.isCash = false,
    this.cashType,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    // Parse dynamic fields which can be strings or maps
    List<DynamicFieldConfig> parsedFields = [];
    if (json['dynamicFields'] != null && json['dynamicFields'] is List) {
      for (var f in json['dynamicFields']) {
        if (f is Map<String, dynamic>) {
          parsedFields.add(DynamicFieldConfig.fromJson(f));
        } else if (f is String) {
          parsedFields.add(DynamicFieldConfig(
            name: f,
            label: _getHumanLabel(f),
            placeholder: 'أدخل $f',
            required: true,
          ));
        }
      }
    }

    if (parsedFields.isEmpty) {
      // Default to Player ID
      parsedFields.add(DynamicFieldConfig(
        name: 'Player_ID',
        label: 'معرف اللاعب (Player ID)',
        placeholder: 'مثال: 1234567890',
        required: true,
      ));
    }

    return Product(
      id: json['id'] ?? json['productId'] ?? 0,
      productId: json['productId'] ?? json['id'] ?? 0,
      name: json['name']?.toString() ?? 'باقة بدون اسم',
      category: json['category']?.toString() ?? 'ألعاب رقمية',
      gameName: json['gameName']?.toString() ?? json['category']?.toString(),
      sectionKey: json['sectionKey']?.toString(),
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      originalPrice: (json['originalPrice'] is num) ? (json['originalPrice'] as num).toDouble() : null,
      supplierPrice: (json['supplierPrice'] is num) ? (json['supplierPrice'] as num).toDouble() : null,
      currency: json['currency']?.toString() ?? 'SYP',
      image: json['image']?.toString(),
      description: json['description']?.toString(),
      dynamicFields: parsedFields,
      inStock: json['inStock'] != false,
      stockCount: json['stockCount'] is int ? json['stockCount'] : null,
      badge: json['badge']?.toString(),
      popular: json['popular'] == true,
      minQty: (json['minQty'] is int) ? json['minQty'] : 1,
      maxQty: (json['maxQty'] is int) ? json['maxQty'] : 100,
      isCash: json['isCash'] == true || json['sectionKey'] == 'cashbalances',
      cashType: json['cashType']?.toString(),
    );
  }

  static String _getHumanLabel(String fieldName) {
    switch (fieldName.toLowerCase()) {
      case 'player_id':
      case 'playerid':
      case 'id':
        return 'معرف اللاعب (Player ID)';
      case 'phone_number':
      case 'phone':
        return 'رقم الهاتف / المحفظة';
      case 'username':
        return 'اسم المستخدم';
      case 'account_email':
      case 'email':
        return 'البريد الإلكتروني';
      default:
        return fieldName;
    }
  }
}

/// مجموعة تجمع المنتجات التابعة للعبة واحدة (مثل Free Fire أو PUBG)
class GameGroup {
  final String title;
  final String category;
  final String? image;
  final List<Product> products;
  final double minPrice;
  final double maxPrice;

  GameGroup({
    required this.title,
    required this.category,
    this.image,
    required this.products,
    required this.minPrice,
    required this.maxPrice,
  });

  int get packageCount => products.length;
}
