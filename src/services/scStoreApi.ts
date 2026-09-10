import { MerchantInfo, Product, CreateOrderPayload, DynamicFieldConfig, OrderItem } from '../types';
import { getProductServiceType } from '../utils/productUtils';

export const DEFAULT_API_KEY = 'sc_c2zhyaCv-3FtC-H7ds-XNLD-6ndNSUaZIpdf';

// Helper to assign reliable real SC Store icons for products and games
export const getGameCover = (gameName: string, category: string, rawImage?: string): string => {
  if (rawImage && typeof rawImage === 'string') {
    const clean = rawImage.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    if (clean.startsWith('/')) {
      return `https://sc-store.top${clean}`;
    }
  }

  const name = (gameName || '').toLowerCase();
  
  if (name.includes('pubg') || name.includes('ببجي')) {
    if (name.includes('code') || name.includes('كود') || name.includes('pin') || category.includes('بطاق') || category.includes('أكواد')) {
      return 'https://sc-store.top/api/icons/cards/51';
    }
    return 'https://sc-store.top/api/icons/game-charge/13';
  }
  if (name.includes('free fire') || name.includes('freefire') || name.includes('فاير')) {
    if (name.includes('code') || name.includes('كود') || name.includes('pin') || category.includes('بطاق') || category.includes('أكواد')) {
      return 'https://sc-store.top/api/icons/cards/52';
    }
    if (name.includes('عضو') || name.includes('member')) {
      return 'https://sc-store.top/api/icons/game-charge/15';
    }
    return 'https://sc-store.top/api/icons/game-charge/14';
  }
  if (name.includes('blood strike') || name.includes('bloodstrike') || name.includes('بلود سترايك')) {
    return 'https://sc-store.top/api/icons/game-charge/39';
  }
  if (name.includes('clash') || name.includes('royal') || name.includes('كلاش')) {
    return 'https://sc-store.top/api/icons/game-charge/67';
  }
  if (name.includes('bigo') || name.includes('بيجو')) {
    return 'https://sc-store.top/api/icons/app-charge/17';
  }
  if (name.includes('meyo') || name.includes('ميو')) {
    return 'https://sc-store.top/api/icons/app-charge/26';
  }
  if (name.includes('olamet') || name.includes('اولاميت')) {
    return 'https://sc-store.top/api/icons/app-charge/78';
  }
  if (name.includes('party') || name.includes('بارتي')) {
    return 'https://sc-store.top/api/icons/app-charge/19';
  }
  if (name.includes('poppo') || name.includes('بوبو')) {
    return 'https://sc-store.top/api/icons/app-charge/18';
  }
  if (name.includes('pota') || name.includes('بوتا')) {
    return 'https://sc-store.top/api/icons/app-charge/200';
  }
  if (name.includes('soul') || name.includes('سول')) {
    return 'https://sc-store.top/api/icons/app-charge/16';
  }
  if (name.includes('mtn') || category.includes('MTN')) {
    return 'https://sc-store.top/logos/mtn.png';
  }
  if (name.includes('syriatel') || category.includes('سيريتل')) {
    return 'https://sc-store.top/logos/syriatel.png';
  }
  if (name.includes('كاش') || category.includes('كاش')) {
    return 'https://sc-store.top/logos/syriatel-cash.png';
  }

  // Default to authentic SC Store section icon
  if (category.includes('تطبيق') || category.includes('محادث')) {
    return 'https://sc-store.top/logos/app-charge.png';
  }
  if (category.includes('بطاق') || category.includes('كود')) {
    return 'https://sc-store.top/api/icons/cards/51';
  }
  return 'https://sc-store.top/logos/game-charge.png';
};

// Section label translation to Arabic for authentic SC Store API sections
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
 * Header: X-Api-Key: sc_c2zhyaCv-3FtC-H7ds-XNLD-6ndNSUaZIpdf
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
          emailVerified: user.emailVerified !== undefined ? Boolean(user.emailVerified) : true,
          identityVerified: user.identityVerified !== undefined ? Boolean(user.identityVerified) : true,
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

export interface FetchProductsResult {
  products: Product[];
  error?: string;
  rawCount?: number;
  isFallback?: boolean;
  apiStatus?: number;
  apiMessage?: string;
}

/**
 * 2. Fetch and parse products from SC Store API
 * Includes authentic data caching and image support
 */
export async function fetchProducts(apiKey?: string): Promise<FetchProductsResult> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const res = await fetch('/api/sc/products', { headers });
    const json = await res.json().catch(() => null);

    if (!json || (!json.products && (json.error || !res.ok))) {
      const errMsg = json?.message || json?.error || `فشل جلب المنتجات من الـ API (كود: ${res.status})`;
      return { products: [], error: errMsg };
    }

    const rawContainer = json.products || json.data || json;
    const normalizedProducts: Product[] = [];

    // Case A: products is an object containing categorized sections: games, apps, cards, subscriptions, mtn, syriatel, cashbalances, etc.
    if (typeof rawContainer === 'object' && rawContainer !== null && !Array.isArray(rawContainer)) {
      
      for (const [secKey, secValue] of Object.entries(rawContainer)) {
        if (!Array.isArray(secValue)) continue;

        // 1. Cash Balances
        if (secKey.toLowerCase() === 'cashbalances') {
          const catLabel = getSectionLabel('cashbalances');
          for (const cash of secValue) {
            const id = cash.type || `cash_${cash.label || 'service'}`;
            const minAmt = cash.minAmount || 5000;
            const maxAmt = cash.maxAmount || 5000000;
            const cashImage = cash.image_url || cash.Image_url || cash.image;

            normalizedProducts.push({
              id: id,
              productId: id,
              name: cash.label || 'خدمة كاش سريعة',
              category: catLabel,
              gameName: cash.label || 'تحويل رصيد كاش',
              sectionKey: 'cashbalances',
              price: minAmt,
              currency: 'SYP',
              image: getGameCover(cash.label, catLabel, cashImage),
              description: cash.note || `شحن وتحويل رصيد كاش فوري. عمولة الخدمة ${((cash.feeRate || 0.02) * 100).toFixed(0)}%. الحدود: ${minAmt.toLocaleString()} إلى ${maxAmt.toLocaleString()} ل.س`,
              dynamicFields: [
                {
                  name: 'wallet',
                  label: 'رقم محفظة الكاش / هاتف المستلم',
                  placeholder: 'مثال: 0912345678',
                  required: true,
                },
                {
                  name: 'amount',
                  label: `المبلغ المطلوب بالليرة السورية (${minAmt.toLocaleString()} - ${maxAmt.toLocaleString()})`,
                  placeholder: `أدخل مبلغ بين ${minAmt.toLocaleString()} و ${maxAmt.toLocaleString()}`,
                  required: true,
                },
              ],
              inStock: true,
              minQty: minAmt,
              maxQty: maxAmt,
              isAmount: true,
              isCash: true,
              cashType: cash.type,
              feeRate: cash.feeRate,
              badge: 'كاش فوري',
            });
          }
          continue;
        }

        // 2. Products Sections (games, apps, cards, subscriptions, mtn, syriatel, etc.)
        const catLabel = getSectionLabel(secKey);

        for (const item of secValue) {
          // If item contains a nested packages array (e.g. grouped services)
          if (Array.isArray(item.packages) && item.packages.length > 0) {
            const groupGameName = item.gameName || item.name || catLabel;
            const groupImage = item.image_url || item.Image_url || item.image;

            for (const pkg of item.packages) {
              const rawId = pkg.id !== undefined ? pkg.id : pkg.productId;
              const price = typeof pkg.price === 'number' ? pkg.price : parseFloat(pkg.price) || 0;

              normalizedProducts.push({
                id: String(rawId),
                productId: rawId,
                name: pkg.name || `${groupGameName} - باقة #${rawId}`,
                category: catLabel,
                gameName: groupGameName,
                sectionKey: secKey,
                price: price,
                supplierPrice: price,
                originalPrice: undefined,
                pricePerUnit: pkg.pricePerUnit,
                currency: pkg.currency || 'SYP',
                image: getGameCover(groupGameName, catLabel, pkg.image_url || pkg.Image_url || pkg.image || groupImage),
                description: `باقة رقمية أصلية لـ ${groupGameName} مع تفعيل وتسليم فوري.`,
                dynamicFields: normalizeDynamicFields(pkg.dynamicFields, {
                  category: catLabel,
                  gameName: groupGameName,
                  name: pkg.name,
                  sectionKey: secKey,
                }),
                inStock: pkg.inStock !== false,
                minQty: pkg.minQty,
                maxQty: pkg.maxQty,
                isAmount: pkg.isAmount,
              });
            }
          } else {
            // Direct product item (Standard SC Store format)
            const rawId = item.id !== undefined ? item.id : item.productId;
            const defaultNameForSec = secKey === 'mtn' ? 'MTN' : secKey === 'syriatel' ? 'سيريتل' : catLabel;
            const gameName = item.gameName || item.serviceName || defaultNameForSec;
            const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
            const pricePerUnit = typeof item.pricePerUnit === 'number' ? item.pricePerUnit : undefined;

            normalizedProducts.push({
              id: String(rawId),
              productId: rawId,
              name: item.name || `${gameName} - باقة #${rawId}`,
              category: catLabel,
              gameName: gameName,
              sectionKey: secKey,
              price: price,
              supplierPrice: price,
              originalPrice: undefined,
              pricePerUnit: pricePerUnit,
              currency: item.currency || 'SYP',
              image: getGameCover(gameName, catLabel, item.image_url || item.Image_url || item.image),
              description: item.gameName ? `شحن فوري لباقة ${item.name} الخاصة بـ ${item.gameName}` : `شحن مباشر فوري وسريع.`,
              dynamicFields: normalizeDynamicFields(item.dynamicFields, {
                category: catLabel,
                gameName: gameName,
                name: item.name,
                sectionKey: secKey,
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
          currency: item.currency || 'SYP',
          image: getGameCover(gameName, item.category || 'عام', item.image_url || item.Image_url || item.image),
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
      isFallback: json?.isFallback,
      apiStatus: json?.apiStatus,
      apiMessage: json?.apiMessage,
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
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  supplierError?: string;
  isApiKeyError?: boolean;
  suggestedAction?: string;
  isManualQueue?: boolean;
  orderId?: string;
  user?: { id: string; balance: number; currency: string };
  isDuplicate?: boolean;
}> {
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
      const orderId =
        json.order?.orderId ||
        json.orderId ||
        json.id ||
        json.data?.orderId ||
        json.data?.id ||
        `ORD-${Date.now()}`;
      return {
        success: true,
        data: json,
        orderId: String(orderId),
        user: json.user,
        isManualQueue: !!json.isManualQueue,
      };
    } else {
      const errorMsg = json?.error || json?.message || `فشل إنشاء الطلب (كود الرد: ${res.status})`;
      return {
        success: false,
        error: errorMsg,
        supplierError: json?.supplierError,
        isApiKeyError: !!json?.isApiKeyError,
        suggestedAction: json?.suggestedAction,
        data: json,
        isDuplicate: !!json?.isDuplicate,
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

/**
 * Helper to determine if an order status is considered "processing" / "pending"
 */
export function isProcessingStatus(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === 'processing' ||
    s === 'pending' ||
    s === 'in_progress' ||
    s === 'in-progress' ||
    s.includes('معالجة') ||
    s.includes('تنفيذ') ||
    s.includes('انتظار')
  );
}

export interface CheckProcessingOrdersResult {
  success: boolean;
  totalChecked: number;
  updatedCount: number;
  completedCount: number;
  stillProcessingCount: number;
  rejectedCount: number;
  orders: any[];
  message: string;
  error?: string;
}

/**
 * 5. Check Only Processing Orders (تحقق من الطلبات التي قيد المعالجة فقط)
 * Filters orders strictly for status === 'processing' or 'pending' and checks them via API.
 */
export async function checkProcessingOrdersOnly(
  ordersOrIds: Array<OrderItem | string>,
  options?: { apiKey?: string; userId?: string }
): Promise<CheckProcessingOrdersResult> {
  try {
    // 1. Filter strictly for processing orders
    const candidateIds: string[] = [];

    for (const item of ordersOrIds) {
      if (typeof item === 'string') {
        if (item.trim()) candidateIds.push(item.trim());
      } else if (item && typeof item === 'object') {
        if (isProcessingStatus(item.status)) {
          const id = item.orderId || item.id;
          if (id) candidateIds.push(String(id).trim());
        }
      }
    }

    const uniqueIds = Array.from(new Set(candidateIds));

    // If no candidate orders are in processing status, return immediately without unneeded API calls
    if (uniqueIds.length === 0) {
      return {
        success: true,
        totalChecked: 0,
        updatedCount: 0,
        completedCount: 0,
        stillProcessingCount: 0,
        rejectedCount: 0,
        orders: [],
        message: 'لا توجد أي طلبات قيد المعالجة حالياً. جميع طلباتك مكتملة أو نهائية.',
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options?.apiKey) {
      headers['X-Api-Key'] = options.apiKey;
    }

    const res = await fetch('/api/sc/orders/check-processing', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        orderIds: uniqueIds,
        userId: options?.userId,
      }),
    });

    const json = await res.json().catch(() => null);

    if (res.ok && json && json.success !== false) {
      return {
        success: true,
        totalChecked: json.totalChecked ?? uniqueIds.length,
        updatedCount: json.updatedCount ?? 0,
        completedCount: json.completedCount ?? 0,
        stillProcessingCount: json.stillProcessingCount ?? 0,
        rejectedCount: json.rejectedCount ?? 0,
        orders: json.orders || [],
        message: json.message || `تم التحقق من ${uniqueIds.length} طلب قيد المعالجة بنجاح.`,
      };
    } else {
      return {
        success: false,
        totalChecked: uniqueIds.length,
        updatedCount: 0,
        completedCount: 0,
        stillProcessingCount: uniqueIds.length,
        rejectedCount: 0,
        orders: [],
        message: json?.error || json?.message || 'تعذر التحقق من الطلبات قيد المعالجة',
        error: json?.error,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      totalChecked: 0,
      updatedCount: 0,
      completedCount: 0,
      stillProcessingCount: 0,
      rejectedCount: 0,
      orders: [],
      message: err.message || 'خطأ أثناء فحص الطلبات قيد المعالجة',
      error: err.message,
    };
  }
}

/**
 * 6. Get Active SC Store API Key info (masked)
 */
export async function getScApiKeyStatus(): Promise<{
  hasCustomKey: boolean;
  isDefault: boolean;
  maskedKey: string;
  keyLength: number;
  prefix: string;
  allowManualOrders?: boolean;
}> {
  try {
    const res = await fetch('/api/sc/api-key');
    const data = await res.json();
    return data;
  } catch {
    return { hasCustomKey: false, isDefault: true, maskedKey: 'غير متوفر', keyLength: 0, prefix: '', allowManualOrders: false };
  }
}

/**
 * 7. Update and test SC Store API Key live
 */
export async function updateScApiKey(apiKey: string): Promise<{
  success: boolean;
  message: string;
  maskedKey?: string;
  merchant?: any;
  detail?: string;
  status?: number;
}> {
  try {
    const res = await fetch('/api/sc/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || 'فشل الاتصال بالخادم' };
  }
}

/**
 * 8. Product & Price Sync Settings and Controls
 */
export interface SyncSettingsData {
  intervalMinutes: number;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'fallback' | 'error' | 'idle';
  lastSyncMessage: string;
  lastSyncStats: {
    total: number;
    games: number;
    apps: number;
    cards: number;
    telecom: number;
    cash: number;
  } | null;
  nextSyncAt: string | null;
  isSyncing: boolean;
}

export interface TriggerSyncResponse {
  success: boolean;
  isLive?: boolean;
  isFallback?: boolean;
  message: string;
  timestamp?: string;
  settings?: SyncSettingsData;
  stats?: {
    total: number;
    games: number;
    apps: number;
    cards: number;
    telecom: number;
    cash: number;
  };
  error?: string;
}

/**
 * Fetch current sync configuration & status
 */
export async function getScSyncSettings(): Promise<SyncSettingsData> {
  try {
    const res = await fetch('/api/sc/sync/status');
    const data = await res.json();
    return {
      intervalMinutes: data.intervalMinutes ?? 60,
      autoSyncEnabled: data.autoSyncEnabled ?? true,
      lastSyncAt: data.lastSyncAt ?? null,
      lastSyncStatus: data.lastSyncStatus ?? 'idle',
      lastSyncMessage: data.lastSyncMessage ?? '',
      lastSyncStats: data.lastSyncStats ?? null,
      nextSyncAt: data.nextSyncAt ?? null,
      isSyncing: Boolean(data.isSyncing),
    };
  } catch {
    return {
      intervalMinutes: 60,
      autoSyncEnabled: true,
      lastSyncAt: null,
      lastSyncStatus: 'idle',
      lastSyncMessage: 'تعذر الاتصال بالخادم',
      lastSyncStats: null,
      nextSyncAt: null,
      isSyncing: false,
    };
  }
}

/**
 * Save new sync interval (in minutes) and auto-sync toggle
 */
export async function saveScSyncSettings(payload: {
  intervalMinutes?: number;
  autoSyncEnabled?: boolean;
}): Promise<{ success: boolean; message: string; settings?: SyncSettingsData; error?: string }> {
  try {
    const res = await fetch('/api/sc/sync/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.error || 'فشل حفظ إعدادات المزامنة' };
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || 'خطأ في الاتصال بالخادم' };
  }
}

/**
 * Trigger immediate product and price sync from supplier
 */
export async function triggerScSyncNow(): Promise<TriggerSyncResponse> {
  try {
    const res = await fetch('/api/sc/sync/now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'فشل تنفيذ المزامنة الفورية',
      error: err.message,
    };
  }
}

