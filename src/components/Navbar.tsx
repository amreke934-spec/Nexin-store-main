import React, { useState } from 'react';
import { Settings, Package, LayoutGrid, Menu, Info, LogIn, Wallet, RefreshCw, Lock, AlertTriangle } from 'lucide-react';
import { MerchantInfo, CustomerUser } from '../types';

interface NavbarProps {
  merchantInfo: MerchantInfo | null;
  isLoadingMerchant: boolean;
  onRefreshMerchant: () => void;
  currentUser: CustomerUser | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenUserOrders: () => void;
  onOpenSettings?: () => void;
  onOpenSidebar: () => void;
  onOpenDeposit?: () => void;
  onPullRefresh?: () => void;
  isRefreshing?: boolean;
  activeTab: 'products' | 'orders' | 'track' | 'settings' | 'history' | 'auth' | 'admin' | 'about' | string;
  setActiveTab: (tab: 'products' | 'orders' | 'settings' | 'history' | 'auth' | 'admin' | 'about') => void;
  ordersCount: number;
  theme?: 'light' | 'dark';
  onToggleTheme?: (newTheme: 'light' | 'dark') => void;
  isMaintenanceActive?: boolean;
  isAdmin?: boolean;
  onNavigateAdminMaintenance?: () => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  currentUser,
  onOpenAuth,
  onOpenSidebar,
  onOpenDeposit,
  onPullRefresh,
  isRefreshing,
  activeTab,
  setActiveTab,
  ordersCount,
  isMaintenanceActive = false,
  isAdmin = false,
  onNavigateAdminMaintenance,
}) => {
  const [maintenanceToast, setMaintenanceToast] = useState(false);

  const handleDepositClick = () => {
    if (isMaintenanceActive && !isAdmin) {
      setMaintenanceToast(true);
      setTimeout(() => setMaintenanceToast(false), 2600);
      return;
    }
    onOpenDeposit?.();
  };

  return (
    <header className="sticky top-0 z-40 glass-header shadow-xs transition-colors">
      {/* Admin Maintenance Notice Banner */}
      {isMaintenanceActive && isAdmin && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-6 text-center font-bold flex items-center justify-center gap-2 shadow-sm border-b border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-bounce" />
          <span>وضع الصيانة مفعّل حالياً للزوار والمستخدمين (أنت تعمل بكامل صلاحيات الأدمن)</span>
          {onNavigateAdminMaintenance && (
            <button
              type="button"
              onClick={onNavigateAdminMaintenance}
              className="mr-2 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all active:scale-95"
            >
              إدارة الصيانة
            </button>
          )}
        </div>
      )}

      {/* Floating toast if non-admin clicks locked action */}
      {maintenanceToast && (
        <div className="bg-amber-500 text-slate-950 font-bold text-xs py-1 px-4 text-center flex items-center justify-center gap-1.5 animate-in fade-in">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>الموقع في وضع الصيانة حالياً - عمليات الإيداع متوقفة مؤقتاً</span>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 1. Sidebar Trigger & Store Name (Clean & Minimalist, No Logo) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button
              id="sidebar-drawer-trigger"
              type="button"
              onClick={onOpenSidebar}
              className="p-2 sm:p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-white transition-all cursor-pointer shadow-xs active:scale-95 group flex items-center justify-center shrink-0"
              title="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5 text-[#7F00FF] dark:text-purple-400 group-hover:scale-110 transition-transform" />
            </button>

            <span 
              onClick={() => setActiveTab('products')} 
              className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white select-none cursor-pointer transition-opacity hover:opacity-90"
            >
              NEXEN <span className="text-[#7F00FF] dark:text-purple-400">STORE</span>
            </span>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                id="nav-products-tab"
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'products'
                    ? 'bg-white dark:bg-[#7F00FF] text-[#7F00FF] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
              </button>

              <button
                id="nav-orders-tab"
                onClick={() => {
                  if (isMaintenanceActive && !isAdmin) {
                    setMaintenanceToast(true);
                    setTimeout(() => setMaintenanceToast(false), 2600);
                    return;
                  }
                  setActiveTab('orders');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'orders' || activeTab === 'track'
                    ? 'bg-white dark:bg-[#7F00FF] text-[#7F00FF] dark:text-white shadow-xs'
                    : isMaintenanceActive && !isAdmin
                    ? 'text-slate-400 dark:text-slate-600'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isMaintenanceActive && !isAdmin ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Package className="w-3.5 h-3.5" />}
                <span>سجل الطلبات</span>
                {ordersCount > 0 && !isMaintenanceActive && (
                  <span className="bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {ordersCount}
                  </span>
                )}
              </button>

              <button
                id="nav-about-tab"
                onClick={() => setActiveTab('about')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'about'
                    ? 'bg-white dark:bg-[#7F00FF] text-[#7F00FF] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-sky-500" />
                <span>عن التطبيق</span>
              </button>

              {currentUser && (
                <button
                  id="nav-settings-tab"
                  onClick={() => {
                    if (isMaintenanceActive && !isAdmin) {
                      setMaintenanceToast(true);
                      setTimeout(() => setMaintenanceToast(false), 2600);
                      return;
                    }
                    setActiveTab('settings');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'settings'
                      ? 'bg-white dark:bg-[#7F00FF] text-[#7F00FF] dark:text-white shadow-xs'
                      : isMaintenanceActive && !isAdmin
                      ? 'text-slate-400 dark:text-slate-600'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isMaintenanceActive && !isAdmin ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Settings className="w-3.5 h-3.5" />}
                  <span>الإعدادات</span>
                </button>
              )}
            </nav>
          </div>

          {/* 2. RIGHT: Clean Quick Action (Login / Profile if needed, or simple direct indicator) */}
          <div className="flex items-center gap-2">
            {onPullRefresh && (
              <button
                id="nav-quick-refresh-btn"
                type="button"
                onClick={onPullRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer ${
                  isRefreshing ? 'opacity-60 cursor-wait' : 'active:scale-95'
                }`}
                title="تحديث البيانات (يدعم أيضاً السحب للأسفل من أعلى الشاشة)"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#7F00FF] dark:text-purple-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {onOpenDeposit && (
                  <button
                    id="nav-deposit-btn"
                    type="button"
                    onClick={handleDepositClick}
                    className={`flex items-center gap-1.5 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap ${
                      isMaintenanceActive && !isAdmin
                        ? 'bg-slate-700 opacity-60'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-[#7F00FF] hover:brightness-110 active:scale-98 shadow-emerald-600/20'
                    }`}
                    title={isMaintenanceActive && !isAdmin ? 'الإيداع متوقف أثناء الصيانة' : 'إيداع وشحن الرصيد'}
                  >
                    {isMaintenanceActive && !isAdmin ? (
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                    ) : (
                      <Wallet className="w-3.5 h-3.5" />
                    )}
                    <span>إيداع</span>
                  </button>
                )}

                <button
                  id="user-profile-btn"
                  onClick={onOpenSidebar}
                  title="فتح القائمة الشخصية"
                  className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/40 hover:bg-purple-100/60 dark:hover:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[#7F00FF] text-white flex items-center justify-center text-[11px] font-bold">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[80px] sm:max-w-[110px] truncate hidden sm:inline">{currentUser.name}</span>
                </button>
              </div>
            ) : (
              <button
                id="auth-login-btn"
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shadow-[#7F00FF]/20 cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
