import React from 'react';
import { Settings, Package, LayoutGrid, LogIn, Menu, Headphones, Info } from 'lucide-react';
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
  activeTab: 'products' | 'orders' | 'track' | 'settings' | 'history' | 'auth' | 'admin' | 'support' | 'about' | string;
  setActiveTab: (tab: 'products' | 'orders' | 'settings' | 'history' | 'auth' | 'admin' | 'support' | 'about') => void;
  ordersCount: number;
  theme?: 'light' | 'dark';
  onToggleTheme?: (newTheme: 'light' | 'dark') => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  currentUser,
  onOpenAuth,
  onOpenSidebar,
  activeTab,
  setActiveTab,
  ordersCount,
}) => {
  return (
    <header className="sticky top-0 z-40 glass-header shadow-xs transition-colors">
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

              <button
                id="nav-support-tab"
                onClick={() => setActiveTab('support')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'support'
                    ? 'bg-white dark:bg-[#7F00FF] text-[#7F00FF] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Headphones className="w-3.5 h-3.5 text-emerald-500" />
                <span>الدعم الفني</span>
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

          {/* 2. RIGHT: Clean Quick Action (Login / Profile if needed, or simple direct indicator) */}
          <div className="flex items-center gap-2">
            {currentUser ? (
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
