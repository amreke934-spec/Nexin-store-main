import { Product } from '../types';

export interface GiftCardDetails {
  tokenAmount: string;
  badgeLabel: string;
  subTitle: string;
  isSpecialVIP: boolean;
}

/**
 * Extracts and formats the primary token/currency/denomination value from a product name
 * to display prominently as a Gift Card face value (e.g. "230K VIP", "50,000 Tokens", "100 Diamonds").
 */
export function extractGiftCardDetails(product: Product, gameName?: string): GiftCardDetails {
  const name = product.name || '';
  const gName = gameName || product.gameName || product.category || '';

  // Clean name without game prefix if repeated
  let cleanName = name;
  if (gName && cleanName.toLowerCase().startsWith(gName.toLowerCase())) {
    cleanName = cleanName.slice(gName.length).trim();
    // remove leading dashes or colons
    cleanName = cleanName.replace(/^[-:–—\s]+/, '');
  }

  const isTelecom =
    product.sectionKey === 'mtn' ||
    product.sectionKey === 'syriatel' ||
    product.category?.includes('وحدات') ||
    product.category?.includes('MTN') ||
    product.category?.includes('سيريتل') ||
    /units|وحدات|mtn|syriatel|سيريتل/i.test(name);

  if (isTelecom) {
    const isMtn = /mtn/i.test(name) || product.sectionKey === 'mtn' || (product.category && product.category.includes('MTN'));
    const networkName = isMtn ? 'MTN' : 'سيريتل';
    const numMatch = name.match(/(\d+[\d,\.]*)/);
    const unitCount = numMatch ? numMatch[1] : '';
    const tokenAmount = unitCount ? `${unitCount} وحدة ${networkName}` : name;

    return {
      tokenAmount,
      badgeLabel: `رصيد ${networkName}`,
      subTitle: `تعبئة رصيد وحدات ${networkName} فوري`,
      isSpecialVIP: false,
    };
  }

  const isSpecialVIP = /vip/i.test(name) || /pass/i.test(name) || /عضوية/i.test(name);

  // Pattern 1: Token patterns like "230K VIP", "50,000 Tokens", "100 + 10 Diamonds", "1000 CP", "5000 كاش"
  // Look for numbers followed by modifiers (K, M, +, etc.) and optional units
  const tokenMatch = cleanName.match(
    /(\d+[\d,\.]*\s*(?:[kKmMbB]|\+|\-)?\s*\d*[\d,\.]*\s*(?:VIP|Tokens|Diamonds?|Diamonds|UC|CP|Coins|Points|Stars|Robux|Cash|توكنز|جوهرة|شدات|كوينز|دولار|\$|IQD|USD)?)/i
  );

  let tokenAmount = tokenMatch ? tokenMatch[0].trim() : '';

  // If match was too short or generic, fallback to cleanName or product name
  if (!tokenAmount || tokenAmount.length < 2) {
    tokenAmount = cleanName || name;
  }

  // Determine badge label
  let badgeLabel = 'بطاقة رقمية';
  if (product.isCash) {
    badgeLabel = 'تحويل كاش';
  } else if (isSpecialVIP) {
    badgeLabel = 'باقة VIP';
  } else if (/tokens|توكنز/i.test(name)) {
    badgeLabel = 'توكنز فوري';
  } else if (/diamonds?|جواهر|جوهرة/i.test(name)) {
    badgeLabel = 'جواهر مباشرة';
  } else if (/pass|رويال/i.test(name)) {
    badgeLabel = 'تذكرة موسمية';
  }

  return {
    tokenAmount,
    badgeLabel,
    subTitle: name,
    isSpecialVIP,
  };
}
