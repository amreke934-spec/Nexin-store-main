import React, { useEffect } from 'react';
import { 
  X, 
  LogIn, 
  Moon, 
  Sun, 
  Headphones, 
  Info, 
  Package, 
  LayoutGrid, 
  Settings, 
  LogOut, 
  Coins, 
  ShieldAlert, 
  ChevronLeft, 
  Sparkles,
  Phone,
  Send,
  User,
  RefreshCw
} from 'lucide-react';
import { CustomerUser, MerchantInfo } from '../types';
import { NexenLogo } from './NexenLogo';
import { ADMIN_AUTHORIZED_EMAIL } from './AdminDashboard';
import { formatCurrencyDisplay } from '../services/scStoreApi';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CustomerUser | null;
  merchantInfo: MerchantInfo | null;
  isLoadingMerchant?: boolean;
  onRefreshMerchant?: () => void;
  activeTab: string;
  onNavigate: (tab: 'products' | 'orders' | 'settings' | 'history' | 'auth' | 'admin' | 'support' | 'about') => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: (theme: 'light' | 'dark') => void;
  ordersCount: number;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = React.memo(({
  isOpen,
  onClose,
  currentUser,
  merchantInfo,
  isLoadingMerchant,
  onRefreshMerchant,
  activeTab,
  onNavigate,
  onOpenAuth,
  onLogout,
  theme,
  onToggleTheme,
  ordersCount,
}) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdmin = currentUser?.email === ADMIN_AUTHORIZED_EMAIL;
  const activeBalance = currentUser?.balance !== undefined 
    ? currentUser.balance 
    : (merchantInfo?.balance ?? 0);
  const activeCurrency = currentUser?.currency || merchantInfo?.currency || 'USD';

  const handleNavClick = (tab: 'products' | 'orders' | 'settings' | 'history' | 'auth' | 'admin' | 'support' | 'about') => {
    onNavigate(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer Container (Right side for RTL) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-10">
        <div className="w-screen max-w-xs sm:max-w-sm bg-white dark:bg-[#111524] text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 transition-all duration-300 animate-slideInRight">
          
          {/* 1. Header Section */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center p-1 shadow-xs">
                <NexenLogo size="sm" showText={false} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                    NEXEN <span className="text-[#7F00FF] dark:text-purple-400">STORE</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#7F00FF]/15 text-[#7F00FF] dark:text-purple-300 font-mono font-bold">
                    v2.0
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                  القائمة الرئيسية
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Conditional Auth Section */}
            {!currentUser ? (
              /* A) GUEST / NOT LOGGED IN VIEW */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50/50 to-purple-50 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-purple-200/90 dark:border-purple-800/60 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#7F00FF] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      مرحباً بك في المتجر
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      سجّل دخولك للطلب ومتابعة الرصيد
                    </p>
                  </div>
                </div>

                {/* Prominent Login Button for Guest */}
                <button
                  type="button"
                  id="sidebar-login-btn"
                  onClick={() => {
                    onOpenAuth('login');
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white text-xs font-bold transition-all shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول / إنشاء حساب</span>
                </button>
              </div>
            ) : (
              /* B) LOGGED IN USER PROFILE CARD */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 via-slate-50 to-indigo-50/80 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-purple-200/90 dark:border-purple-800/60 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#7F00FF] to-indigo-500 text-white flex items-center justify-center font-black text-base shadow-md shadow-[#7F00FF]/30 shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </h3>
                      {isAdmin && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500 text-white uppercase font-mono">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                {/* Live Balance in Sidebar */}
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500 animate-pulse" />
                    <div>
                      <span className="text-[9px] text-slate-400 block font-medium">الرصيد المتاح:</span>
                      <span className="text-xs font-black font-mono text-[#7F00FF] dark:text-purple-300">
                        {isLoadingMerchant ? '...' : formatCurrencyDisplay(activeBalance, activeCurrency)}
                      </span>
                    </div>
                  </div>

                  {onRefreshMerchant && (
                    <button
                      type="button"
                      onClick={onRefreshMerchant}
                      disabled={isLoadingMerchant}
                      title="تحديث الرصيد"
                      className="p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchant ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Menu Links */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-3 uppercase tracking-wider block mb-1">
                التصفح والخدمات
              </span>

              {/* 1. Home / Products */}
              <button
                type="button"
                onClick={() => handleNavClick('products')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-[#7F00FF] text-white shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="w-4 h-4" />
                  <span>الرئيسية (كافة المنتجات)</span>
                </div>
                <ChevronLeft className="w-4 h-4 opacity-70" />
              </button>

              {/* 2. Orders History */}
              <button
                type="button"
                onClick={() => handleNavClick('orders')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'orders' || activeTab === 'track'
                    ? 'bg-[#7F00FF] text-white shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4" />
                  <span>سجل الطلبات</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {ordersCount > 0 && (
                    <span className="bg-purple-100 dark:bg-purple-900/80 text-[#7F00FF] dark:text-purple-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {ordersCount}
                    </span>
                  )}
                  <ChevronLeft className="w-4 h-4 opacity-70" />
                </div>
              </button>

              {/* 3. Support Page Link (تواصل مع الدعم الفني) */}
              <button
                type="button"
                id="sidebar-support-btn"
                onClick={() => handleNavClick('support')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'support'
                    ? 'bg-[#7F00FF] text-white shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-emerald-500" />
                  <span>تواصل مع الدعم الفني</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-medium">
                    24/7
                  </span>
                  <ChevronLeft className="w-4 h-4 opacity-70" />
                </div>
              </button>

              {/* 4. About App Page Link (لمحة عن التطبيق) */}
              <button
                type="button"
                id="sidebar-about-btn"
                onClick={() => handleNavClick('about')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'about'
                    ? 'bg-[#7F00FF] text-white shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-sky-500" />
                  <span>لمحة عن التطبيق</span>
                </div>
                <ChevronLeft className="w-4 h-4 opacity-70" />
              </button>

              {/* 5. Settings (Only if logged in) */}
              {currentUser && (
                <button
                  type="button"
                  id="sidebar-settings-btn"
                  onClick={() => handleNavClick('settings')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-[#7F00FF] text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4" />
                    <span>إعدادات الحساب</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-70" />
                </button>
              )}

              {/* 6. Admin Dashboard (If admin) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>لوحة تحكم الإدارة</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-70" />
                </button>
              )}
            </div>

            {/* Quick Actions (Theme Mode Toggle) */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-3 uppercase tracking-wider block">
                مظهر التطبيق
              </span>

              {/* Dark / Light Mode Interactive Toggle */}
              <button
                type="button"
                id="sidebar-theme-toggle"
                onClick={() => onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all hover:border-[#7F00FF]/50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <span>المظهر: {theme === 'dark' ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>
                </div>

                <div className="w-11 h-6 bg-slate-300 dark:bg-purple-900 rounded-full p-0.5 flex items-center transition-colors">
                  <div 
                    className={`w-5 h-5 rounded-full bg-white dark:bg-[#7F00FF] shadow-md transform transition-transform flex items-center justify-center ${
                      theme === 'dark' ? 'translate-x-0' : '-translate-x-5'
                    }`}
                  >
                    {theme === 'dark' ? (
                      <Moon className="w-3 h-3 text-white" />
                    ) : (
                      <Sun className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Logout button (If logged in) */}
            {currentUser && (
              <div className="pt-2">
                <button
                  type="button"
                  id="sidebar-logout-btn"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج من الحساب</span>
                </button>
              </div>
            )}

          </div>

          {/* 3. Footer Section */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              جميع الحقوق محفوظة © {new Date().getFullYear()} NEXEN STORE
            </p>
          </div>

        </div>
      </div>
    </div>
  );
});

SidebarDrawer.displayName = 'SidebarDrawer';
