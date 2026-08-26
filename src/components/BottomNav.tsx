import React from 'react';
import { Home, Package, User, LogIn } from 'lucide-react';

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
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onNavigateHome,
  onNavigateOrders,
  onOpenSettings,
  onNavigateLogin,
  ordersCount,
  isLoggedIn,
}) => {
  const isOrdersActive = activeTab === 'orders' || activeTab === 'track';

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="شريط التنقل السفلي"
      dir="rtl"
      style={{ left: '50%', transform: 'translateX(-50%)' }}
      className="fixed bottom-3 sm:bottom-4 z-40 w-[92%] max-w-sm glass-nav rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-2xl border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xl"
    >
      <div className="grid grid-cols-3 gap-1 sm:gap-2 items-center">
        {/* 1. Home / Store */}
        <button
          id="bottom-nav-home-btn"
          type="button"
          onClick={onNavigateHome}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer select-none group relative ${
            activeTab === 'products'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/30 font-bold scale-[1.03]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
          }`}
        >
          <Home className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-[10px] sm:text-xs mt-1 font-medium tracking-tight">الرئيسية</span>
          {activeTab === 'products' && (
            <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        {/* 2. Orders History (سجل الطلبات مع أيقونة الصندوق / الطرد) */}
        <button
          id="bottom-nav-orders-btn"
          type="button"
          onClick={onNavigateOrders}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer select-none group relative ${
            isOrdersActive
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/30 font-bold scale-[1.03]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5 transition-transform group-hover:scale-110" />
            {ordersCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono border-2 border-white dark:border-slate-900 shadow-xs">
                {ordersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-xs mt-1 font-medium tracking-tight">الطلبات</span>
          {isOrdersActive && (
            <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        {/* 3. User Account / Settings / Auth */}
        <button
          id="bottom-nav-auth-btn"
          type="button"
          onClick={isLoggedIn ? onOpenSettings : onNavigateLogin}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer select-none group relative ${
            activeTab === 'auth' || activeTab === 'settings'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/30 font-bold scale-[1.03]'
              : 'text-slate-600 dark:text-slate-400 hover:text-[#7F00FF] dark:hover:text-purple-300 hover:bg-slate-100/70 dark:hover:bg-white/5'
          }`}
        >
          <div className="relative">
            {isLoggedIn ? (
              <>
                <User className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-900" />
              </>
            ) : (
              <LogIn className="w-5 h-5 transition-transform group-hover:scale-110" />
            )}
          </div>
          <span className="text-[10px] sm:text-xs mt-1 font-medium tracking-tight">
            {isLoggedIn ? 'حسابي' : 'دخول'}
          </span>
          {(activeTab === 'auth' || activeTab === 'settings') && (
            <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>
    </nav>
  );
};
