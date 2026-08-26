import React, { useState } from 'react';
import {
  Settings,
  User,
  Mail,
  Phone,
  Hash,
  LogOut,
  LogIn,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Copy,
  Check,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { CustomerUser, MerchantInfo } from '../types';
import { ADMIN_AUTHORIZED_EMAIL } from './AdminDashboard';

interface SettingsPageProps {
  currentUser: CustomerUser | null;
  merchantInfo?: MerchantInfo | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: (newTheme: 'light' | 'dark') => void;
  onOpenAuth?: () => void;
  onLogout: () => void;
  onDeleteAccount?: () => void;
  onNavigateHome: () => void;
  onRefreshMerchant?: () => void;
  isLoadingMerchant?: boolean;
  onOpenAdmin?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onNavigateHome,
  onOpenAdmin,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check if current logged-in user is the authorized admin
  const isAdminUser =
    currentUser?.email?.toLowerCase().trim() === ADMIN_AUTHORIZED_EMAIL.toLowerCase().trim() ||
    currentUser?.role === 'admin';

  // Helper to copy text with quick feedback
  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleBrowseAsGuest = () => {
    if (currentUser) {
      onLogout();
    }
    onNavigateHome();
  };

  const isLoggedIn = !!currentUser && !!currentUser.id;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16">
      {/* 1. TOP HEADER & MAIN SETTINGS CARD */}
      <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-sm transition-colors space-y-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/70 dark:border-purple-800/40 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center shadow-xs shrink-0 mt-0.5">
            <Settings className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-[#7F00FF] dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-3 py-1 rounded-full uppercase tracking-wider border border-purple-100 dark:border-purple-800/40 inline-block mb-2">
              الإعدادات والحساب
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              الإعدادات والتفضيلات
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
              إدارة تفاصيل الحساب الشخصي، الصلاحيات الإدارية، وتسجيل الدخول.
            </p>
          </div>
        </div>

        {/* 2. USER ACCOUNT DETAILS (SHOWN ONLY IF LOGGED IN) */}
        {isLoggedIn ? (
          <div className="space-y-6 pt-2">
            {/* ADMIN EXCLUSIVE SECTION (Rendered only for m74321176@gmail.com) */}
            {isAdminUser && onOpenAdmin && (
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-[#7F00FF] to-indigo-800 text-white shadow-xl space-y-4 border border-purple-400/30 relative overflow-hidden animate-in fade-in duration-300">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center shadow-md shrink-0 backdrop-blur-md">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                          صلاحية المدير العام
                        </span>
                        <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {ADMIN_AUTHORIZED_EMAIL}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        لوحة تحكم المدير والإحصائيات
                      </h3>
                      <p className="text-xs text-purple-100 mt-0.5">
                        الإحصائيات، إدارة المستخدمين، الحساب التجاري، نسبة الربح الشاملة، والتحقق من الطلبات
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="open-admin-dashboard-btn"
                    onClick={onOpenAdmin}
                    className="px-5 py-3 rounded-2xl bg-white text-[#7F00FF] hover:bg-purple-50 active:scale-95 text-xs sm:text-sm font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>فتح لوحة التحكم</span>
                    <ArrowRight className="w-4 h-4 mr-0.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Logged in Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  تم تسجيل الدخول بنجاح
                </span>
              </div>
              <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/60">
                {isAdminUser ? 'حساب مدير النظام' : 'حساب عميل'}
              </span>
            </div>

            {/* Profile Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* User Name */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-medium">الاسم الكامل</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate block">
                      {currentUser?.name || 'مستخدم مسجل'}
                    </span>
                  </div>
                </div>
                {currentUser?.name && (
                  <button
                    type="button"
                    onClick={() => handleCopy(currentUser.name, 'name')}
                    className="text-slate-400 hover:text-[#7F00FF] transition-colors p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer shrink-0"
                    title="نسخ"
                  >
                    {copiedField === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* User Email */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-medium">البريد الإلكتروني</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate block font-mono">
                      {currentUser?.email || 'غير محدد'}
                    </span>
                  </div>
                </div>
                {currentUser?.email && (
                  <button
                    type="button"
                    onClick={() => handleCopy(currentUser.email, 'email')}
                    className="text-slate-400 hover:text-[#7F00FF] transition-colors p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer shrink-0"
                    title="نسخ"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* User Phone */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-medium">رقم الهاتف</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate block font-mono dir-ltr text-right">
                      {currentUser?.phone || 'غير مسجل'}
                    </span>
                  </div>
                </div>
                {currentUser?.phone && (
                  <button
                    type="button"
                    onClick={() => handleCopy(currentUser.phone || '', 'phone')}
                    className="text-slate-400 hover:text-[#7F00FF] transition-colors p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer shrink-0"
                    title="نسخ"
                  >
                    {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Account ID / Member Since */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-medium">معرف الحساب في قاعدة البيانات</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate block font-mono">
                      {currentUser?.id || 'NX-USER-000'}
                    </span>
                  </div>
                </div>
                {currentUser?.id && (
                  <button
                    type="button"
                    onClick={() => handleCopy(currentUser.id, 'id')}
                    className="text-slate-400 hover:text-[#7F00FF] transition-colors p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer shrink-0"
                    title="نسخ"
                  >
                    {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Creation date note */}
            {currentUser?.createdAt && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاريخ الانضمام للمتجر: {new Date(currentUser.createdAt).toLocaleDateString('ar-EG')}</span>
              </div>
            )}

            {/* Action Buttons for Logged In User */}
            <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row items-center gap-3.5">
              {/* Button: Logout */}
              <button
                type="button"
                id="logout-btn"
                onClick={onLogout}
                className="w-full sm:w-1/2 py-3.5 px-5 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer group"
              >
                <LogOut className="w-4 h-4 text-red-500 group-hover:-translate-x-0.5 transition-transform" />
                <span>تسجيل الخروج من الحساب</span>
              </button>

              {/* Button: Return to Store */}
              <button
                type="button"
                id="settings-back-store-btn"
                onClick={onNavigateHome}
                className="w-full sm:w-1/2 py-3.5 px-5 rounded-2xl bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>العودة للمتجر</span>
                <ArrowRight className="w-4 h-4 mr-0.5" />
              </button>
            </div>
          </div>
        ) : (
          /* 4. GUEST VIEW (NOT LOGGED IN) */
          <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/10">
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7F00FF] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-purple-950 dark:text-purple-200">
                  أنت تتصفح المتجر كـ زائر حالياً
                </h4>
                <p className="text-xs text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                  سجّل دخولك لحفظ مشترياتك في قاعدة البيانات، ومتابعة طلباتك، والوصول الفوري لمحفظتك.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              {/* Button: تسجيل الدخول أو إنشاء حساب */}
              {onOpenAuth && (
                <button
                  type="button"
                  id="settings-open-auth-btn"
                  onClick={onOpenAuth}
                  className="w-full sm:w-1/2 py-3.5 px-5 rounded-2xl bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول / إنشاء حساب</span>
                </button>
              )}

              {/* Button: تصفح كـ زائر والعودة للمتجر */}
              <button
                type="button"
                id="browse-as-guest-btn"
                onClick={handleBrowseAsGuest}
                className={`w-full ${onOpenAuth ? 'sm:w-1/2' : 'sm:w-full'} py-3.5 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-purple-50 hover:text-[#7F00FF] dark:hover:bg-purple-950/50 dark:hover:text-purple-300 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer group`}
              >
                <User className="w-4 h-4 text-slate-500 group-hover:text-[#7F00FF] dark:text-slate-400 dark:group-hover:text-purple-300 transition-colors" />
                <span>تصفح كـ زائر (العودة للمتجر)</span>
                <ArrowRight className="w-4 h-4 mr-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
