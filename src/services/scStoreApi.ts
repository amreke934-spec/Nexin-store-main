import { MerchantInfo, Product, CreateOrderPayload, DynamicFieldConfig } from '../types';
import { getProductServiceType } from '../utils/productUtils';

export const DEFAULT_API_KEY = 'sc_xIfrLuz7-N0HT-8xsM-zwg6-iLbNBrEhKag2';

// Helper to assign reliable icons / art for game names if none provided in API
const getGameCover = (gameName: string, category: string, rawImage?: string): string => {
  if (rawImage) {
    if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
      return rawImage;
    }
    if (rawImage.startsWith('/')) {
      return `https://sc-store.top${rawImage}`;
    }
  }

  const name = (gameName || '').toLowerCase();
  
  if (name.includes('free fire') || name.includes('freefire')) {
    return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('pubg')) {
    return 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('jawaker')) {
    return 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('clash of clans') || name.includes('clash royale')) {
    return 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('blood strike') || name.includes('arena breakout') || name.includes('delta force')) {
    return 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('roblox')) {
    return 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('telegram')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('anghami') || name.includes('spotify') || name.includes('music')) {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('syriatel') || category === 'سيريتل') {
    return 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60';
  }
  if (name.includes('mtn') || category === 'MTN') {
    return 'https://images.unsplash.com/photo-1556742049-0a67e557b447?w=500&auto=format&fit=crop&q=60';
  }

  // Default clean gaming background
  return 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&auto=format&fit=crop&q=60';
};

// Section label translation to Arabic
const getSectionLabel = (sectionKey: string): string => {
  switch (sectionKey.toLowerCase()) {
    case 'games':
      return 'ألعاب رقمية';
    case 'apps':
      return 'تطبيقات ومحادثات';
    case 'mtn':
      return 'وحدات MTN';
    case 'syriatel':
      return 'وحدات سيريتل';
    case 'telegramservices':
      return 'خدمات تيليجرام';
    case 'subscriptions':
      return 'اشتراكات بريميوم';
    case 'cardandcodes':
      return 'بطاقات وأكواد';
    case 'cashbalances':
      return 'خدمات الكاش';
    default:
      return sectionKey;
  }
};

/**
 * Normalizes raw dynamic fields structure from API into DynamicFieldConfig array,
 * adapting labels and placeholders based on product domain (Cash vs Telecom vs Game vs Apps)
 */
const normalizeDynamicFields = (
  rawFields: any,
  context?: { category?: string; gameName?: string; name?: string; sectionKey?: string; isCash?: boolean }
): DynamicFieldConfig[] => {
  const serviceType = getProductServiceType(context);

  if (!rawFields || (Array.isArray(rawFields) && rawFields.length === 0)) {
    if (serviceType === 'cash') {
      return [
        {
          name: 'phone_number',
          label: 'رقم الهاتف المحمول (المحفظة / الكاش)',
          placeholder: 'مثال: 09xxxxxxxx أو رقم المحفظة',
          required: true,
          helperText: 'أدخل رقم الهاتف المسجل في خدمة الكاش (سيريتل كاش / MTN Cash) لتنفيذ التحويل الفوري',
        },
      ];
    }
    if (serviceType === 'telecom') {
      return [
        {
          name: 'phone_number',
          label: 'رقم خط الهاتف المحمول',
          placeholder: 'مثال: 09xxxxxxxx',
          required: true,
          helperText: 'أدخل رقم الخط السوري المراد تحويل الرصيد / الوحدات إليه مباشرة',
        },
      ];
    }
    if (serviceType === 'telegram') {
      return [
        {
          name: 'username',
          label: 'اسم المستخدم (@Username) أو رقم الهاتف',
          placeholder: 'مثال: @username أو +9639xxxxxxxx',
          required: true,
          helperText: 'أدخل يوزر التيليجرام أو الرقم المراد تفعيل الخدمة عليه',
        },
      ];
    }
    if (serviceType === 'subscription') {
      return [
        {
          name: 'account_email',
          label: 'البريد الإلكتروني / الحساب',
          placeholder: 'user@example.com أو اسم الحساب',
          required: true,
          helperText: 'أدخل البريد الإلكتروني أو الحساب المراد تفعيل الاشتراك عليه',
        },
      ];
    }
    return [
      {
        name: 'Player_ID',
        label: 'معرف اللاعب (Player ID)',
        placeholder: 'مثال: 1234567890',
        required: true,
        helperText: 'تأكد من كتابة الآيدي الخاص باللعبة بدقة دون مسافات',
      },
    ];
  }

  if (Array.isArray(rawFields)) {
    return rawFields.map((f: any) => {
      if (typeof f === 'string') {
        let label = f;
        let placeholder = `أدخل ${f}`;
        let helperText = '';

        if (serviceType === 'cash') {
          label = 'رقم الهاتف المحمول (المحفظة / الكاش)';
          placeholder = 'مثال: 09xxxxxxxx أو رقم المحفظة';
          helperText = 'أدخل رقم الهاتف المرتبط بمحفظة الكاش لاستلام الحوالة';
        } else if (serviceType === 'telecom') {
          label = 'رقم خط الهاتف المحمول';
          placeholder = 'مثال: 09xxxxxxxx';
          helperText = 'أدخل رقم الخط لشحن الرصيد / الوحدات';
        } else if (serviceType === 'telegram') {
          label = 'اسم المستخدم (@Username) أو رقم الهاتف';
          placeholder: 'مثال: @username أو +9639xxxxxxxx';
          helperText = 'أدخل معرف التيليجرام لتفعيل الخدمة';
        } else if (serviceType === 'subscription') {
          label = 'البريد الإلكتروني / الحساب';
          placeholder = 'user@example.com';
        } else if (f === 'Player_ID' || f === 'player_id' || f === 'id') {
          label = 'معرف اللاعب (Player ID)';
          placeholder = 'مثال: 1234567890';
          helperText = 'تأكد من كتابة الآيدي بدقة';
        }

        return {
          name: f,
          label,
          placeholder,
          required: true,
          helperText,
        };
      }
      if (typeof f === 'object' && f !== null) {
        let label = f.label || f.name || 'الحقل المطلوب';
        let placeholder = f.placeholder || '';
        let helperText = f.helperText;

        if (serviceType === 'cash' && (f.name === 'Player_ID' || f.name === 'id' || f.label?.includes('Player') || f.label?.includes('لاعب'))) {
          label = 'رقم الهاتف المحمول (سيريتل كاش / MTN كاش)';
          placeholder = 'مثال: 09xxxxxxxx أو رقم المحفظة';
          helperText = 'أدخل رقم الهاتف المرتبط بحساب الكاش';
        } else if (serviceType === 'telecom' && (f.name === 'Player_ID' || f.name === 'id' || f.label?.includes('Player') || f.label?.includes('لاعب'))) {
          label = 'رقم خط الهاتف المحمول';
          placeholder = 'مثال: 09xxxxxxxx';
          helperText = 'أدخل رقم الهاتف المراد شحنه';
        }

        return {
          name: f.name || 'field',
          label,
          placeholder,
          required: f.required !== false,
          type: f.type || 'text',
          helperText,
          options: f.options,
          min: f.min,
          max: f.max,
        };
      }
      return { name: 'field', label: 'البيانات المطلوبة', placeholder: '', required: true };
    });
  }

  return [{ name: 'field', label: 'البيانات المطلوبة', placeholder: '', required: true }];
};

import { convertToSyp, formatPriceSyp, formatSypNumber } from '../utils/currencyUtils';

/**
 * Formats balance or price with proper currency symbol (Syrian Pounds SYP / ل.س)
 */
export function formatCurrencyDisplay(amount: number, currency: string = 'USD'): string {
  const curr = (currency || 'USD').trim().toUpperCase();
  if (curr === 'SYP' || curr === 'ل.س' || curr === 'ليرة' || curr === 'SP') {
    return `${formatSypNumber(amount)} ل.س`;
  }
  // Convert USD to Syrian Pounds
  const sypAmount = convertToSyp(amount, currency);
  return `${formatSypNumber(sypAmount)} ل.س`;
}

/**
 * 1. Fetch Merchant Profile and Account Balance from real API (GET https://sc-store.top/api/v1/me)
 * Header: X-Api-Key: sc_xIfrLuz7-N0HT-8xsM-zwg6-iLbNBrEhKag2
 */
export async function fetchMerchantInfo(apiKey?: string): Promise<{ data: MerchantInfo | null; error?: string; raw?: any }> {
  try {
    const headers: Record<string, string> = {
      'X-Api-Key': apiKey || DEFAULT_API_KEY,
    };

    const res = await fetch('/api/sc/me', { headers });
    const json = await res.json().catch(() => null);

    if (res.ok && json && !json.error) {
      const user = json.user || json.data || json;
      
      // Parse raw balance from potential properties in SC Store API
      const rawBalance =
        user.balance !== undefined
          ? user.balance
          : user.credit !== undefined
          ? user.credit
          : user.wallet !== undefined
          ? user.wallet
          : user.balance_syp !== undefined
          ? user.balance_syp
          : user.balance_usd !== undefined
          ? user.balance_usd
          : 0;

      const parsedBalance = typeof rawBalance === 'number' ? rawBalance : parseFloat(String(rawBalance)) || 0;
      
      // Determine currency
      const rawCurrency =
        user.currency ||
        user.currency_symbol ||
        user.currency_code ||
        (user.balance_syp !== undefined ? 'SYP' : 'USD');

      const currency =
        rawCurrency === 'SYP' || rawCurrency === 'ل.س' || rawCurrency === 'ليرة'
          ? 'ل.س'
          : rawCurrency || 'USD';

      return {
        data: {
          id: user.id || 'SC-MERCHANT',
          name: user.name || user.username || 'تاجر Nexen Store',
          username: user.username || user.email || 'nexen_trader',
          email: user.email || 'support@nexenstore.com',
          balance: parsedBalance,
          currency: currency,
          status: 'نشط (متصل بالـ API)',
          role: user.role || 'merchant',
          storeName: user.store_name || user.storeName || 'Nexen Store - SC Top',
          lastUpdated: new Date().toLocaleTimeString('ar-EG'),
        },
        raw: json,
      };
    } else {
      const errorMsg = json?.message || json?.error || `HTTP ${res.status}: تعذر جلب بيانات الحساب والرصيد`;
      return {
        data: null,
        error: errorMsg,
        raw: json,
      };
    }
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'خطأ في الاتصال بخادم الـ API',
    };
  }
}

/**
 * 2. Fetch and parse 100% real products from https://sc-store.top/api/v1/products
 * Strictly NO fallback, mock, or fake items.
 */
export async function fetchProducts(apiKey?: string): Promise<{ products: Product[]; error?: string; rawCount?: number }> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const res = await fetch('/api/sc/products', { headers });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json || json.error) {
      const errMsg = json?.message || json?.error || `فشل جلب المنتجات من الـ API (كود: ${res.status})`;
      return { products: [], error: errMsg };
    }

    const rawContainer = json.products || json.data || json;
    const normalizedProducts: Product[] = [];

    // Case A: products is an object containing sections: games, apps, mtn, syriatel, telegramservices, subscriptions, cardandcodes, cashbalances
    if (typeof rawContainer === 'object' && rawContainer !== null && !Array.isArray(rawContainer)) {
      
      // 1. Direct products arrays: games, apps, mtn, syriatel
      const directSections = ['games', 'apps', 'mtn', 'syriatel'];
      for (const sec of directSections) {
        if (Array.isArray(rawContainer[sec])) {
          const catLabel = getSectionLabel(sec);
          for (const item of rawContainer[sec]) {
            const rawId = item.id !== undefined ? item.id : item.productId;
            const gameName = item.gameName || (sec === 'mtn' ? 'MTN' : sec === 'syriatel' ? 'سيريتل' : catLabel);
            const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
            const pricePerUnit = typeof item.pricePerUnit === 'number' ? item.pricePerUnit : undefined;

            normalizedProducts.push({
              id: String(rawId),
              productId: rawId,
              name: item.name || `${gameName} - باقة #${rawId}`,
              category: catLabel,
              gameName: gameName,
              sectionKey: sec,
              price: price,
              originalPrice: price > 0 ? Number((price * 1.1).toFixed(2)) : undefined,
              pricePerUnit: pricePerUnit,
              currency: item.currency || 'USD',
              image: getGameCover(gameName, catLabel, item.image),
              description: item.gameName ? `شحن فوري لباقة ${item.name} الخاصة بـ ${item.gameName}` : `شحن مباشر فوري وسريع.`,
              dynamicFields: normalizeDynamicFields(item.dynamicFields, {
                category: catLabel,
                gameName: gameName,
                name: item.name,
                sectionKey: sec,
              }),
              inStock: item.inStock !== false,
              isAmount: item.isAmount,
              minQty: item.minQty,
              maxQty: item.maxQty,
              badge: item.isAmount ? 'حسب الكمية' : undefined,
            });
          }
        }
      }

      // 2. Nested packages: telegramservices, subscriptions, cardandcodes
      const nestedSections = ['telegramservices', 'subscriptions', 'cardandcodes'];
      for (const sec of nestedSections) {
        if (Array.isArray(rawContainer[sec])) {
          const catLabel = getSectionLabel(sec);
          for (const group of rawContainer[sec]) {
            const groupGameName = group.gameName || group.name || catLabel;
            const groupImage = group.image;

            if (Array.isArray(group.packages)) {
              for (const pkg of group.packages) {
                const rawId = pkg.id !== undefined ? pkg.id : pkg.productId;
                const price = typeof pkg.price === 'number' ? pkg.price : parseFloat(pkg.price) || 0;

                normalizedProducts.push({
                  id: String(rawId),
                  productId: rawId,
                  name: pkg.name || `${groupGameName} - باقة #${rawId}`,
                  category: catLabel,
                  gameName: groupGameName,
                  sectionKey: sec,
                  price: price,
                  originalPrice: price > 0 ? Number((price * 1.1).toFixed(2)) : undefined,
                  pricePerUnit: pkg.pricePerUnit,
                  currency: pkg.currency || 'USD',
                  image: getGameCover(groupGameName, catLabel, groupImage),
                  description: `باقة رقمية أصلية لـ ${groupGameName} مع تفعيل وتسليم فوري.`,
                  dynamicFields: normalizeDynamicFields(pkg.dynamicFields, {
                    category: catLabel,
                    gameName: groupGameName,
                    name: pkg.name,
                    sectionKey: sec,
                  }),
                  inStock: pkg.inStock !== false,
                  minQty: pkg.minQty,
                  maxQty: pkg.maxQty,
                  isAmount: pkg.isAmount,
                });
              }
            }
          }
        }
      }

      // 3. Cash balances
      if (Array.isArray(rawContainer.cashbalances)) {
        const catLabel = getSectionLabel('cashbalances');
        for (const cash of rawContainer.cashbalances) {
          const id = cash.type || `cash_${cash.label || 'service'}`;
          normalizedProducts.push({
            id: id,
            productId: id,
            name: cash.label || 'خدمة كاش سريعة',
            category: catLabel,
            gameName: cash.label || 'تحويل رصيد كاش',
            sectionKey: 'cashbalances',
            price: cash.minAmount || 0,
            currency: 'SYP',
            image: getGameCover(cash.label, catLabel, cash.image),
            description: cash.note || `شحن وتحويل رصيد كاش فوري. عمولة الخدمة ${((cash.feeRate || 0) * 100).toFixed(0)}%.`,
            dynamicFields: normalizeDynamicFields(cash.fields, {
              category: catLabel,
              gameName: cash.label,
              name: cash.label,
              sectionKey: 'cashbalances',
              isCash: true,
            }),
            inStock: true,
            isCash: true,
            cashType: cash.type,
            feeRate: cash.feeRate,
            note: cash.note,
            minQty: cash.minAmount,
            maxQty: cash.maxAmount,
            badge: 'كاش مباشر',
          });
        }
      }
    } else if (Array.isArray(rawContainer)) {
      // Case B: products is already a flat array
      for (const item of rawContainer) {
        const rawId = item.id !== undefined ? item.id : item.productId;
        const gameName = item.gameName || item.category || 'خدمات رقمية';
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;

        normalizedProducts.push({
          id: String(rawId),
          productId: rawId,
          name: item.name || `منتج #${rawId}`,
          category: item.category || 'عام',
          gameName: gameName,
          price: price,
          currency: item.currency || 'USD',
          image: getGameCover(gameName, item.category || '', item.image),
          description: item.description || `شحن رقمي مباشر وفوري.`,
          dynamicFields: normalizeDynamicFields(item.dynamicFields, {
            category: item.category,
            gameName: gameName,
            name: item.name,
          }),
          inStock: item.inStock !== false,
          minQty: item.minQty,
          maxQty: item.maxQty,
          isAmount: item.isAmount,
        });
      }
    }

    if (normalizedProducts.length === 0) {
      return {
        products: [],
        error: 'لم تُرجع استجابة الـ API أي منتجات متاحة حالياً.',
        rawCount: 0,
      };
    }

    return {
      products: normalizedProducts,
      rawCount: normalizedProducts.length,
    };
  } catch (err: any) {
    return {
      products: [],
      error: err.message || 'فشل الاتصال بالـ API لجلب المنتجات',
    };
  }
}

/**
 * 3. Create Real Order on SC Store API
 */
export async function createNewOrder(
  payload: CreateOrderPayload,
  apiKey?: string
): Promise<{ success: boolean; data?: any; error?: string; orderId?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const res = await fetch('/api/sc/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (res.ok && json && !json.error) {
      const orderId = json.orderId || json.id || json.data?.orderId || json.data?.id || `ORD-${Date.now()}`;
      return {
        success: true,
        data: json,
        orderId: String(orderId),
      };
    } else {
      const errorMsg = json?.message || json?.error || `فشل إنشاء الطلب (كود الرد: ${res.status})`;
      return {
        success: false,
        error: errorMsg,
        data: json,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'تعذر الاتصال بخادم تنفيذ الطلبات',
    };
  }
}

/**
 * 4. Check Order Status from SC Store API
 */
export async function checkOrdersStatus(
  orderIds: string,
  apiKey?: string
): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    const cleanIds = orderIds.trim();
    if (!cleanIds) {
      return { success: false, error: 'يرجى إدخال رقم الطلب للاستعلام' };
    }

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const res = await fetch(`/api/sc/orders/${encodeURIComponent(cleanIds)}`, { headers });
    const json = await res.json().catch(() => null);

    if (res.ok && json && !json.error) {
      return { success: true, results: json };
    } else {
      return {
        success: false,
        error: json?.message || json?.error || `لم يتم العثور على بيانات الطلب #${cleanIds}`,
        results: json,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'خطأ أثناء الاستعلام عن حالة الطلب',
    };
  }
}
