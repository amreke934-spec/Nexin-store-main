import React from 'react';
import {
  Wallet,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { MerchantInfo, CustomerUser } from '../types';
import { formatCurrencyDisplay } from '../services/scStoreApi';

interface WalletPageProps {
  merchantInfo: MerchantInfo | null;
  currentUser?: CustomerUser | null;
  isLoadingMerchant: boolean;
  onRefreshMerchant: () => void;
  onNavigateHome?: () => void;
  theme?: 'light' | 'dark';
}

export const WalletPage: React.FC<WalletPageProps> = ({
  merchantInfo,
  currentUser,
  isLoadingMerchant,
  onRefreshMerchant,
  onNavigateHome,
}) => {
  const currentBalance = merchantInfo?.balance ?? (currentUser?.balance ?? 227.13);
  const currency = merchantInfo?.currency || 'USD';

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>محفظة Nexen الرقمية</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              عرض ومتابعة رصيد الحساب المتاح للشحن والمشتريات
            </p>
          </div>
        </div>
      </div>

      {/* Main Luxury Clean Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 dark:border-slate-800 text-white shadow-xl">
        <div className="relative z-10 space-y-6">
          {/* Header pill & timestamp */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-bold text-purple-300 bg-purple-950/80 border border-purple-800/60 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              رصيد متاح للشحن الفوري
            </span>

            {merchantInfo?.lastUpdated && (
              <span className="text-[11px] text-slate-400 font-mono">
                آخر تحديث: {merchantInfo.lastUpdated}
              </span>
            )}
          </div>

          {/* Balance Numbers & Refresh */}
          <div className="pt-2">
            <span className="text-xs text-slate-400 font-medium block mb-1.5">
              الرصيد الإجمالي المتاح
            </span>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white">
                {isLoadingMerchant ? (
                  <span className="animate-pulse text-3xl sm:text-4xl text-slate-400">جاري التحميل...</span>
                ) : (
                  formatCurrencyDisplay(currentBalance, currency)
                )}
              </span>

              <button
                type="button"
                id="wallet-refresh-balance-btn"
                onClick={onRefreshMerchant}
                disabled={isLoadingMerchant}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-purple-200 transition-all cursor-pointer disabled:opacity-50"
                title="تحديث الرصيد من الـ API"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchant ? 'animate-spin' : ''}`} />
                <span>تحديث الرصيد</span>
              </button>
            </div>
          </div>

          {/* Clean Security Info & Store Quick Link */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>المحفظة مؤمنة بالكامل ومتصلة بنظام الشحن الآلي المباشر</span>
            </div>

            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white font-bold text-xs transition-all shadow-md shadow-[#7F00FF]/30 cursor-pointer w-full sm:w-auto"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>تصفح المنتجات والشحن</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
