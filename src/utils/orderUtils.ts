/**
 * Order Utilities: Unique Order IDs & Charged Account Extraction
 */

export interface ChargedAccountInfo {
  type: 'phone' | 'id' | 'account';
  label: string;
  value: string;
  isPhone: boolean;
}

/**
 * Generate a clean, unique order ID for each operation
 * Format: NX-YYMMDD-XXXXX (e.g. NX-260911-48291)
 */
export function generateUniqueOrderId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `NX-${yy}${mm}${dd}-${rand}`;
}

/**
 * Extract the charged account (phone number or ID / Player ID) from dynamicFields or order data
 */
export function extractChargedAccount(
  dynamicFields?: Record<string, any> | string | null,
  fallback?: string
): ChargedAccountInfo {
  let fields: Record<string, any> = {};

  if (typeof dynamicFields === 'string') {
    try {
      fields = JSON.parse(dynamicFields);
    } catch {
      fields = {};
    }
  } else if (dynamicFields && typeof dynamicFields === 'object') {
    fields = dynamicFields;
  }

  // 1. Check priority Phone fields (سيريتل كاش، MTN كاش، رصيد، واتساب)
  const phoneKeys = [
    'phone',
    'phone_number',
    'phoneNumber',
    'mobile',
    'wallet',
    'phone_no',
    'recipient_phone',
    'syriatel_number',
    'mtn_number',
  ];
  for (const key of phoneKeys) {
    if (fields[key] !== undefined && fields[key] !== null && String(fields[key]).trim() !== '') {
      return {
        type: 'phone',
        label: 'رقم الهاتف المشحون',
        value: String(fields[key]).trim(),
        isPhone: true,
      };
    }
  }

  // 2. Check priority Player ID / Account ID fields (ببجي، فري فاير، تيك توك، معرف اللاعب)
  const idKeys = [
    'Player_ID',
    'player_id',
    'playerId',
    'User_ID',
    'user_id',
    'userId',
    'account_id',
    'accountId',
    'id',
    'account',
  ];
  for (const key of idKeys) {
    if (fields[key] !== undefined && fields[key] !== null && String(fields[key]).trim() !== '') {
      return {
        type: 'id',
        label: 'معرّف الحساب (ID)',
        value: String(fields[key]).trim(),
        isPhone: false,
      };
    }
  }

  // 3. Check any key matching phone or id substring
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val).trim();
    if (!strVal) continue;

    const k = key.toLowerCase();
    if (k.includes('phone') || k.includes('mobile') || k.includes('هاتف') || k.includes('جوال') || k.includes('رقم')) {
      return {
        type: 'phone',
        label: 'رقم الهاتف المشحون',
        value: strVal,
        isPhone: true,
      };
    }
    if (
      k.includes('player') ||
      k.includes('user') ||
      k.includes('id') ||
      k.includes('معرف') ||
      k.includes('حساب') ||
      k.includes('لاعب')
    ) {
      return {
        type: 'id',
        label: 'معرّف الحساب (ID)',
        value: strVal,
        isPhone: false,
      };
    }
  }

  // 4. If any non-empty field exists in dynamicFields
  const entries = Object.entries(fields).filter(
    ([_, v]) => v !== undefined && v !== null && String(v).trim() !== ''
  );
  if (entries.length > 0) {
    const [firstKey, firstVal] = entries[0];
    const str = String(firstVal).trim();
    const isLikelyPhone = /^[0-9+]{8,15}$/.test(str.replace(/[\s-]/g, ''));
    return {
      type: isLikelyPhone ? 'phone' : 'id',
      label: isLikelyPhone ? 'رقم الهاتف المشحون' : 'الحساب المشحون (ID)',
      value: str,
      isPhone: isLikelyPhone,
    };
  }

  // 5. Fallback check
  if (fallback && String(fallback).trim() !== '') {
    const str = String(fallback).trim();
    const isLikelyPhone = /^[0-9+]{8,15}$/.test(str.replace(/[\s-]/g, ''));
    return {
      type: isLikelyPhone ? 'phone' : 'account',
      label: isLikelyPhone ? 'رقم الهاتف المشحون' : 'الحساب المشحون (ID)',
      value: str,
      isPhone: isLikelyPhone,
    };
  }

  return {
    type: 'account',
    label: 'الحساب المشحون (ID / هاتف)',
    value: 'غير متوفر',
    isPhone: false,
  };
}

/**
 * Status mapping for uniform display
 */
export function getUniformOrderStatus(status?: string): {
  key: 'completed' | 'processing' | 'failed';
  label: string;
  badgeClass: string;
  textClass: string;
} {
  const s = String(status || '').toLowerCase().trim();

  if (s.includes('complete') || s.includes('success') || s.includes('تم') || s.includes('مكتمل')) {
    return {
      key: 'completed',
      label: 'مكتملة',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      textClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }

  if (s.includes('fail') || s.includes('reject') || s.includes('cancel') || s.includes('مرفوض') || s.includes('فشل') || s.includes('غير مكتمل')) {
    return {
      key: 'failed',
      label: 'غير مكتملة',
      badgeClass: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60',
      textClass: 'text-red-600 dark:text-red-400',
    };
  }

  return {
    key: 'processing',
    label: 'قيد المعالجة',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    textClass: 'text-blue-600 dark:text-blue-400',
  };
}
