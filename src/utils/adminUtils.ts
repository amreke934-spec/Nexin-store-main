import { CustomerUser, MaintenanceSettings } from '../types';

export const ADMIN_EMAILS: string[] = [
  'm74321176@gmail.com',
  'amreke934@gmail.com',
];

/**
 * Checks if a given user has full admin privileges.
 */
export function isUserAdmin(user: CustomerUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const email = (user.email || '').toLowerCase().trim();
  if (!email) return false;
  return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === email);
}

export const DEFAULT_MAINTENANCE_SETTINGS: MaintenanceSettings = {
  isEnabled: false,
  title: 'الموقع قيد الصيانة والتطوير حالياً',
  message: 'نقوم حالياً بإجراء تحديثات وتحسينات دورية على خوادم وخدمات المتجر لتقديم أفضل تجربة شحن وأعلى سرعة تنفيذ. جميع خدمات المتجر والطلبات متوقفة مؤقتاً وسنعود للعمل فور اكتمال التحديثات.',
  endTime: '',
  allowLogin: true,
  contactWhatsapp: '',
  contactTelegram: '',
};
