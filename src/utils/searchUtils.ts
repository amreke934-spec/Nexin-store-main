import { Product } from '../types';

/**
 * Normalizes Arabic text for tolerant search matching:
 * - Unifies alef forms (أ, إ, آ -> ا)
 * - Unifies yaa / alef maqsura (ى -> ي)
 * - Unifies taa marbuta / haa (ة -> ه)
 * - Removes tashkeel / diacritics
 * - Trims and lowercases
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Tashkeel / harakat
    .replace(/[\-_]/g, ' ')
    .trim();
}

/**
 * Normalizes a Syrian phone number to 09XXXXXXXX format.
 * Converts:
 *  +963933123456 -> 0933123456
 *  00963933123456 -> 0933123456
 *  933123456 -> 0933123456
 *  0933-123-456 -> 0933123456
 */
export function normalizeSyrianPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+963')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('00963')) {
    cleaned = '0' + cleaned.slice(5);
  } else if (cleaned.length === 9 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

/**
 * Detects Syrian mobile network operator:
 * Syriatel: 093, 098, 099
 * MTN: 094, 095, 096
 */
export function detectSyrianNetwork(phone: string): 'syriatel' | 'mtn' | 'unknown' {
  const norm = normalizeSyrianPhoneNumber(phone);
  if (!norm.startsWith('09') || norm.length < 3) return 'unknown';
  const prefix = norm.substring(0, 3);
  if (prefix === '093' || prefix === '098' || prefix === '099') {
    return 'syriatel';
  }
  if (prefix === '094' || prefix === '095' || prefix === '096') {
    return 'mtn';
  }
  return 'unknown';
}

/**
 * Checks if search query matches a product with rich Syrian telecom and cash synonyms:
 * - "سريتيل" <-> "سيريتل" <-> "syriatel"
 * - "ام تي ان" <-> "ام تي إن" <-> "mtn"
 * - "تحويل رصيد" / "رصيد" / "شحن رصيد" / "تعبئة رصيد" -> matches Syriatel and MTN units & cash
 * - "كاش" / "تحويل كاش" -> matches Syriatel Cash and MTN Cash
 */
export function isProductSearchMatch(product: Product, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const query = normalizeArabicText(rawQuery);
  const prodName = normalizeArabicText(product.name || '');
  const gameName = normalizeArabicText(product.gameName || '');
  const category = normalizeArabicText(product.category || '');
  const sectionKey = (product.sectionKey || '').toLowerCase();
  const prodId = String(product.productId || product.id || '');

  // Direct keyword or ID match
  if (
    prodName.includes(query) ||
    gameName.includes(query) ||
    category.includes(query) ||
    prodId.includes(query)
  ) {
    return true;
  }

  // Syriatel synonyms (handling typo "سريتيل" with yaa before taa)
  const isSyriatelRelated =
    sectionKey === 'syriatel' ||
    category.includes('سيريتل') ||
    category.includes('سريتيل') ||
    gameName.includes('سيريتل') ||
    gameName.includes('سريتيل') ||
    prodName.includes('syriatel') ||
    prodName.includes('سيريتل') ||
    prodName.includes('سريتيل');

  // MTN synonyms
  const isMtnRelated =
    sectionKey === 'mtn' ||
    category.includes('mtn') ||
    category.includes('ام تي ان') ||
    gameName.includes('mtn') ||
    gameName.includes('ام تي ان') ||
    prodName.includes('mtn');

  // Cash related
  const isCashRelated =
    product.isCash ||
    sectionKey === 'cashbalances' ||
    category.includes('كاش') ||
    gameName.includes('كاش') ||
    prodName.includes('كاش') ||
    Boolean((product as any).cashType);

  // Match: Syriatel queries (e.g., "سريتيل", "سيريتل", "syriatel")
  if (
    query.includes('سريتيل') ||
    query.includes('سيريتل') ||
    query.includes('syriatel')
  ) {
    if (isSyriatelRelated) return true;
  }

  // Match: MTN queries (e.g., "mtn", "ام تي ان", "ام تي ان", "امتيان")
  if (
    query.includes('mtn') ||
    query.includes('ام تي ان') ||
    query.includes('امتيان')
  ) {
    if (isMtnRelated) return true;
  }

  // Match: Balance / recharge / units queries (e.g., "تحويل رصيد", "رصيد", "وحدات", "شحن رصيد", "تعبئة رصيد")
  const isBalanceQuery =
    query.includes('رصيد') ||
    query.includes('تحويل رصيد') ||
    query.includes('شحن رصيد') ||
    query.includes('تعبئه رصيد') ||
    query.includes('تعبئة رصيد') ||
    query.includes('وحدات') ||
    query.includes('units');

  if (isBalanceQuery) {
    // If searching specifically "رصيد سيريتل" or "تحويل رصيد سريتيل"
    if (
      query.includes('سريتيل') ||
      query.includes('سيريتل') ||
      query.includes('syriatel')
    ) {
      return isSyriatelRelated;
    }
    // If searching specifically "رصيد mtn" or "تحويل رصيد mtn" or "رصيد ام تي ان"
    if (
      query.includes('mtn') ||
      query.includes('ام تي ان')
    ) {
      return isMtnRelated;
    }
    // General "تحويل رصيد" matches all telecom (Syriatel & MTN) and cash balance services
    if (isSyriatelRelated || isMtnRelated || isCashRelated) {
      return true;
    }
  }

  // Match: Cash queries (e.g., "كاش", "تحويل كاش", "كاشات", "محفظه")
  const isCashQuery =
    query.includes('كاش') ||
    query.includes('cash') ||
    query.includes('محفظه') ||
    query.includes('محفظة');

  if (isCashQuery) {
    if (
      query.includes('سريتيل') ||
      query.includes('سيريتل') ||
      query.includes('syriatel')
    ) {
      return isCashRelated && isSyriatelRelated;
    }
    if (
      query.includes('mtn') ||
      query.includes('ام تي ان')
    ) {
      return isCashRelated && isMtnRelated;
    }
    return isCashRelated;
  }

  return false;
}

/**
 * Checks if a game/group matches the search query
 */
export function isGameSearchMatch(
  gameName: string,
  packages: Product[],
  rawQuery: string
): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;
  const q = normalizeArabicText(rawQuery);
  const normGame = normalizeArabicText(gameName);

  if (normGame.includes(q)) return true;

  // Check any package in the game
  return packages.some((p) => isProductSearchMatch(p, rawQuery));
}
