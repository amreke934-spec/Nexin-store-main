import React from 'react';
import { Settings, Moon, Sun, Package, LayoutGrid, LogIn, Coins, RefreshCw } from 'lucide-react';
import { MerchantInfo, CustomerUser } from '../types';
import { NexenLogo } from './NexenLogo';
import { ADMIN_AUTHORIZED_EMAIL } from './AdminDashboard';
import { formatCurrencyDisplay } from '../services/scStoreApi';

interface NavbarProps {
  merchantInfo: MerchantInfo | null;
  isLoadingMerchant: boolean;
  onRefreshMerchant: () => void;
  currentUser: CustomerUser | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenUserOrders: () => void;
  onOpenSettings?: () => void;
  activeTab: 'products' | 'orders' | 'track' | 'settings' | 'history' | 'auth' | 'admin' | string;
  setActiveTab: (tab: 'products' | 'orders' | 'settings' | 'history' | 'auth' | 'admin') => void;
  ordersCount: number;
  theme?: 'light' | 'dark';
  onToggleTheme?: (newTheme: 'light' | 'dark') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  merchantInfo,
  isLoadingMerchant,
  onRefreshMerchant,
  currentUser,
  onOpenAuth,
  onOpenUserOrders,
  activeTab,
  setActiveTab,
  ordersCount,
  theme,
  onToggleTheme,
}) => {
  // Calculate live balance: prioritize user-specific balance if set, otherwise API merchant balance
  const activeBalance = currentUser?.balance !== undefined 
    ? currentUser.balance 
    : (merchantInfo?.balance ?? 0);
  const activeCurrency = currentUser?.currency || merchantInfo?.currency || 'USD';

  return (
    <header className="sticky top-0 z-40 glass-header shadow-xs transition-colors">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 1. Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-5">
            <div 
              onClick={() => setActiveTab('products')} 
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group"
              title="الرئيسية"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center p-1 group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <NexenLogo size="sm" showText={false} />
              </div>
              <div>
                <span className="text-sm sm:text-lg font-black tracking-tight text-slate-900 dark:text-white block leading-none">
                  NEXEN <span className="text-[#7F00FF] dark:text-purple-400">STORE</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                  شحن المنتجات الرقمية
                </span>
              </div>
            </div>

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
                <span>الرئيسية (المنتجات)</span>
              </button>

              <button
                id="nav-orders-tab"
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'orders' || activeTab === 'track'
                    ? 'bg-white dark:bg-[#7F00FF] text-[#7F00FF] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>سجل الطلبات</span>
                {ordersCount > 0 && (
                  <span className="bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {ordersCount}
                  </span>
                )}
              </button>

              {currentUser && (
                <button
                  id="nav-settings-tab"
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'settings'
                      ? 'bg-white dark:bg-[#7F00FF] text-[#7F00FF] dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>الإعدادات</span>
                </button>
              )}
            </nav>
          </div>

          {/* 2. CENTER/RIGHT: Prominent Header Wallet Balance Display */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Live Balance Badge (Header Wallet Display) */}
            <div 
              id="header-wallet-balance"
              className="flex items-center gap-1.5 sm:gap-2.5 bg-gradient-to-r from-purple-50/90 via-purple-50 to-indigo-50/80 dark:from-purple-950/60 dark:via-purple-900/30 dark:to-indigo-950/50 border border-purple-200/90 dark:border-purple-800/70 py-1 px-2.5 sm:py-1.5 sm:px-3.5 rounded-xl sm:rounded-2xl shadow-xs transition-all select-none"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#7F00FF] text-white flex items-center justify-center shadow-xs shrink-0">
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-pulse" />
              </div>
              
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-purple-300">
                    الرصيد:
                  </span>
                  {merchantInfo?.lastUpdated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" title={`محدث: ${merchantInfo.lastUpdated}`} />
                  )}
                </div>
                
                <span className="text-[11px] sm:text-xs md:text-sm font-black font-mono text-[#7F00FF] dark:text-purple-300 tracking-tight leading-tight">
                  {isLoadingMerchant ? (
                    <span className="animate-pulse text-[11px] text-slate-400">...</span>
                  ) : (
                    formatCurrencyDisplay(activeBalance, activeCurrency)
                  )}
                </span>
              </div>

              {/* Instant API Refresh Button */}
              <button
                type="button"
                id="header-balance-refresh-btn"
                onClick={onRefreshMerchant}
                disabled={isLoadingMerchant}
                title="تحديث الرصيد من الـ API مباشرة"
                className="p-1 sm:p-1.5 rounded-lg hover:bg-purple-200/60 dark:hover:bg-purple-800/50 text-[#7F00FF] dark:text-purple-300 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLoadingMerchant ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick Dark / Light Theme Toggle Button */}
            {onToggleTheme && (
              <button
                id="navbar-theme-toggle-btn"
                type="button"
                onClick={() => onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shrink-0"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
                ) : (
                  <Moon className="w-4 h-4 text-[#7F00FF] transition-transform rotate-0 hover:-rotate-12" />
                )}
              </button>
            )}

            {/* User Account / Login & Register Buttons */}
            {currentUser ? (
              <div className="flex items-center">
                <button
                  id="user-profile-btn"
                  onClick={() => setActiveTab('orders')}
                  title="عرض سجل الطلبات"
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/40 hover:bg-purple-100/60 dark:hover:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 text-[11px] sm:text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#7F00FF] text-white flex items-center justify-center text-[10px] sm:text-[11px] font-bold">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[70px] sm:max-w-[100px] truncate hidden sm:inline">{currentUser.name}</span>
                  {ordersCount > 0 && (
                    <span className="bg-[#7F00FF] text-white text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {ordersCount}
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  id="auth-login-btn"
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-1 bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs shadow-[#7F00FF]/20 cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>دخول</span>
                </button>
              </div>
            )}

            {/* Settings quick icon on top navbar - only if logged in */}
            {currentUser && (
              <button
                id="navbar-settings-btn"
                onClick={() => setActiveTab('settings')}
                title="الإعدادات"
                className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer hidden md:flex items-center justify-center ${
                  activeTab === 'settings'
                    ? 'bg-[#7F00FF] text-white border-[#7F00FF] shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'rotate-45' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
