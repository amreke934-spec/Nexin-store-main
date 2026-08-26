import { Product, DynamicFieldConfig } from '../types';

export type ProductServiceType = 'cash' | 'telecom' | 'game' | 'telegram' | 'subscription' | 'generic';

/**
 * Accurately classifies any product into its dedicated category domain
 * to prevent gaming fields (Player ID) from leaking into Cash & Payment services.
 */
export function getProductServiceType(product?: {
  category?: string;
  gameName?: string;
  name?: string;
  sectionKey?: string;
  isCash?: boolean;
} | null): ProductServiceType {
  if (!product) return 'game';

  const cat = (product.category || '').toLowerCase();
  const gName = (product.gameName || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  const sec = (product.sectionKey || '').toLowerCase();

  // 1. Cash & Wallet Services (MTN Cash, Syriatel Cash, Cash Balances, money transfers, etc.)
  if (
    product.isCash ||
    sec === 'cashbalances' ||
    cat.includes('كاش') ||
    cat.includes('cash') ||
    name.includes('كاش') ||
    name.includes('cash') ||
    gName.includes('كاش') ||
    gName.includes('cash') ||
    name.includes('محفظة') ||
    name.includes('تحويل') ||
    name.includes('حوالة') ||
    name.includes('الهرم') ||
    name.includes('الفؤاد') ||
    name.includes('شام كاش') ||
    name.includes('sham cash') ||
    name.includes('دفع نقدي') ||
    name.includes('سحب نقدي') ||
    cat.includes('دفع')
  ) {
    return 'cash';
  }

  // 2. Mobile Telecom Units & Recharge (MTN units, Syriatel units, credit lines)
  if (
    sec === 'mtn' ||
    sec === 'syriatel' ||
    cat.includes('وحدات') ||
    cat.includes('رصيد') ||
    cat.includes('سيريتل') ||
    cat.includes('mtn') ||
    name.includes('وحدات') ||
    name.includes('تعبئة خط') ||
    name.includes('رصيد سيريتل') ||
    name.includes('رصيد mtn')
  ) {
    return 'telecom';
  }

  // 3. Telegram Services
  if (
    sec === 'telegramservices' ||
    cat.includes('تيليجرام') ||
    cat.includes('telegram') ||
    name.includes('تيليجرام') ||
    name.includes('telegram') ||
    gName.includes('تيليجرام') ||
    gName.includes('telegram')
  ) {
    return 'telegram';
  }

  // 4. Subscriptions & Digital Accounts (Spotify, Netflix, Shahid, Anghami, etc.)
  if (
    sec === 'subscriptions' ||
    cat.includes('اشتراكات') ||
    name.includes('اشتراك') ||
    name.includes('spotify') ||
    name.includes('netflix') ||
    name.includes('shahid') ||
    name.includes('anghami') ||
    name.includes('chatgpt')
  ) {
    return 'subscription';
  }

  // 5. Digital Games (Free Fire, PUBG, Roblox, Clash, Jawaker, etc.)
  if (
    sec === 'games' ||
    cat.includes('ألعاب') ||
    cat.includes('لعبة') ||
    cat.includes('game') ||
    name.includes('free fire') ||
    name.includes('pubg') ||
    name.includes('roblox') ||
    name.includes('jawaker') ||
    name.includes('جواكر') ||
    name.includes('ببجي') ||
    name.includes('فري فاير') ||
    name.includes('clash') ||
    name.includes('blood strike') ||
    name.includes('arena breakout') ||
    name.includes('delta force') ||
    name.includes('brawl stars') ||
    name.includes('call of duty') ||
    name.includes('cod')
  ) {
    return 'game';
  }

  return 'generic';
}

/**
 * Returns customized UI metadata based on the specific product service type
 */
export function getProductFieldMetadata(product?: Product | null) {
  const serviceType = getProductServiceType(product);

  switch (serviceType) {
    case 'cash':
      return {
        serviceType: 'cash',
        sectionTitle: 'بيانات تحويل الكاش والمحفظة',
        sectionSubtitle: 'أدخل رقم الهاتف المحمول المرتبط بالمحفظة النقدية لتنفيذ عملية التحويل الفوري',
        fieldLabel: 'رقم الهاتف المحمول (سيريتل كاش / MTN كاش)',
        inputPlaceholder: 'مثال: 09xxxxxxxx أو رقم حساب المحفظة',
        helperText: 'تأكد من كتابة رقم الهاتف المسجل في خدمة الكاش بدقة لتحويل الرصيد مباشرة',
        badgeText: 'تحويل كاش فوري',
        submitButtonText: 'تأكيد تحويل الكاش',
        iconType: 'wallet' as const,
        primaryFieldName: 'phone_number',
      };

    case 'telecom':
      return {
        serviceType: 'telecom',
        sectionTitle: 'بيانات خط الهاتف والرصيد',
        sectionSubtitle: 'أدخل رقم خط الهاتف المحمول المراد شحن الوحدات / الرصيد إليه',
        fieldLabel: 'رقم خط الهاتف المحمول',
        inputPlaceholder: 'مثال: 09xxxxxxxx',
        helperText: 'أدخل رقم الهاتف المكون من 10 أرقام (سيريتل أو MTN)',
        badgeText: 'تعبئة وحدات فورية',
        submitButtonText: 'تأكيد شحن الرصيد',
        iconType: 'phone' as const,
        primaryFieldName: 'phone_number',
      };

    case 'telegram':
      return {
        serviceType: 'telegram',
        sectionTitle: 'بيانات حساب تيليجرام',
        sectionSubtitle: 'أدخل اسم المستخدم (@Username) أو رقم الهاتف المرتبط بالحساب',
        fieldLabel: 'اسم المستخدم في تيليجرام أو رقم الهاتف',
        inputPlaceholder: 'مثال: @username أو +9639xxxxxxxx',
        helperText: 'تأكد من كتابة اليوزر نيم مسبوقاً بـ @ أو رقم الهاتف لتفعيل الخدمة',
        badgeText: 'تفعيل تيليجرام فوري',
        submitButtonText: 'تأكيد تفعيل الخدمة',
        iconType: 'send' as const,
        primaryFieldName: 'username',
      };

    case 'subscription':
      return {
        serviceType: 'subscription',
        sectionTitle: 'بيانات الحساب والاشتراك',
        sectionSubtitle: 'أدخل البريد الإلكتروني أو الحساب المراد تفعيل الاشتراك عليه',
        fieldLabel: 'البريد الإلكتروني / اسم الحساب',
        inputPlaceholder: 'user@example.com أو اسم الحساب',
        helperText: 'سيتم إرسال وتفعيل الاشتراك على هذا البريد / الحساب فوراً',
        badgeText: 'اشتراك بريميوم رسمي',
        submitButtonText: 'تأكيد الاشتراك الفوري',
        iconType: 'mail' as const,
        primaryFieldName: 'email_or_account',
      };

    case 'game':
    default:
      return {
        serviceType: 'game',
        sectionTitle: 'بيانات الشحن ومعرف اللاعب',
        sectionSubtitle: 'أدخل معرف حسابك (Player ID) لتنفيذ الشحن الفوري للباقة المختارة',
        fieldLabel: 'معرف اللاعب (Player ID) / الآيدي',
        inputPlaceholder: 'مثال: 1234567890',
        helperText: 'تأكد من كتابة الآيدي الخاص بحسابك في اللعبة بدقة دون مسافات',
        badgeText: 'شحن فوري بالـ ID',
        submitButtonText: 'تأكيد الشحن الفوري',
        iconType: 'gamepad' as const,
        primaryFieldName: 'Player_ID',
      };
  }
}
