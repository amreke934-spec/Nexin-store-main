import React, { useState } from 'react';
import { Home, Package, User, LogIn, Lock } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'products' | 'orders' | 'track' | 'settings' | 'history' | 'auth' | 'admin' | string;
  authMode?: 'login' | 'register';
  onNavigateHome: () => void;
  onNavigateOrders: () => void;
  onOpenSettings: () => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  ordersCount: number;
  isLoggedIn: boolean;
  isMaintenanceLocked?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = React.memo(({
  activeTab,
  onNavigateHome,
  onNavigateOrders,
  onOpenSettings,
  onNavigateLogin,
  ordersCount,
  isLoggedIn,
  isMaintenanceLocked = false,
}) => {
  const isOrdersActive = activeTab === 'orders' || activeTab === 'track';
  const [showLockToast, setShowLockToast] = useState(false);

  const triggerLockedNotice = () => {
    setShowLockToast(true);
    setTimeout(() => setShowLockToast(false), 2600);
  };

  const handleHomeClick = () => {
    onNavigateHome();
  };

  const handleOrdersClick = () => {
    if (isMaintenanceLocked) {
      triggerLockedNotice();
      return;
    }
    onNavigateOrders();
  };

  const handleAccountClick = () => {
    if (isLoggedIn) {
      if (isMaintenanceLocked) {
        triggerLockedNotice();
        return;
      }
      onOpenSettings();
    } else {
      onNavigateLogin?.();
    }
  };

  return (
    <>
      {/* Toast Notice when attempting locked action */}
      {showLockToast && (
        <div className="fixed bottom-20 z-50 left-1/2 transform -translate-x-1/2 px-4 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-bottom-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>الموقع في وضع الصيانة حالياً - الإجراءات والخدمات مقفلة مؤقتاً</span>
        </div>
      )}

      <nav
        id="bottom-navigation-bar"
        aria-label="شريط التنقل السفلي"
        dir="rtl"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
        className={`fixed bottom-3 sm:bottom-4 z-40 w-[92%] max-w-sm glass-nav rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-2xl border backdrop-blur-xl transition-all ${
          isMaintenanceLocked
            ? 'border-amber-500/40 bg-slate-900/90 shadow-amber-500/10'
            : 'border-slate-200/90 dark:border-slate-800/90'
        }`}
      >
        <div className="grid grid-cols-3 gap-1 sm:gap-2 items-center">
          {/* 1. Home / Store (Always allowed to view maintenance screen) */}
          <button
            id="bottom-nav-home-btn"
            type="button"
            onClick={handleHomeClick}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer select-none group relative ${
              activeTab === 'products'
                ? isMaintenanceLocked
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-bold scale-[1.03]'
                  : 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/30 font-bold scale-[1.03]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
            }`}
          >
            <Home className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="text-[10px] sm:text-xs mt-1 font-medium tracking-tight">الرئيسية</span>
            {activeTab === 'products' && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          {/* 2. Orders History (Locked during maintenance) */}
          <button
            id="bottom-nav-orders-btn"
            type="button"
            onClick={handleOrdersClick}
            aria-disabled={isMaintenanceLocked}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer select-none group relative ${
              isMaintenanceLocked
                ? 'opacity-40 hover:opacity-70 text-slate-400 dark:text-slate-500'
                : isOrdersActive
                ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/30 font-bold scale-[1.03]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
            }`}
          >
            <div className="relative">
              {isMaintenanceLocked ? (
                <Lock className="w-4 h-4 text-amber-500" />
              ) : (
                <Package className="w-5 h-5 transition-transform group-hover:scale-110" />
              )}
              {!isMaintenanceLocked && ordersCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono border-2 border-white dark:border-slate-900 shadow-xs">
                  {ordersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs mt-1 font-medium tracking-tight flex items-center gap-1">
              {isMaintenanceLocked && <span className="text-[9px] text-amber-500">🔒</span>}
              الطلبات
            </span>
            {isOrdersActive && !isMaintenanceLocked && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          {/* 3. User Account / Settings / Auth (Locked actions during maintenance) */}
          <button
            id="bottom-nav-auth-btn"
            type="button"
            onClick={handleAccountClick}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer select-none group relative ${
              isMaintenanceLocked && isLoggedIn
                ? 'opacity-40 hover:opacity-70 text-slate-400 dark:text-slate-500'
                : activeTab === 'auth' || activeTab === 'settings'
                ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/30 font-bold scale-[1.03]'
                : 'text-slate-600 dark:text-slate-400 hover:text-[#7F00FF] dark:hover:text-purple-300 hover:bg-slate-100/70 dark:hover:bg-white/5'
            }`}
          >
            <div className="relative">
              {isMaintenanceLocked && isLoggedIn ? (
                <Lock className="w-4 h-4 text-amber-500" />
              ) : isLoggedIn ? (
                <>
                  <User className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-900" />
                </>
              ) : (
                <LogIn className="w-5 h-5 transition-transform group-hover:scale-110" />
              )}
            </div>
            <span className="text-[10px] sm:text-xs mt-1 font-medium tracking-tight flex items-center gap-1">
              {isMaintenanceLocked && isLoggedIn && <span className="text-[9px] text-amber-500">🔒</span>}
              {isLoggedIn ? 'حسابي' : 'دخول'}
            </span>
            {(activeTab === 'auth' || activeTab === 'settings') && !isMaintenanceLocked && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
});


BottomNav.displayName = 'BottomNav';
