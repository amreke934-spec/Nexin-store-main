import React from 'react';
import { AlertCircle, Wallet, PlusCircle, ArrowLeft, X, CreditCard, LogIn } from 'lucide-react';
import { formatSypNumber } from '../utils/currencyUtils';

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  requiredAmount: number;
  currency?: string;
  isLoggedIn: boolean;
  onNavigateDeposit: () => void;
  onOpenAuth?: () => void;
  productName?: string;
}

export const InsufficientBalanceModal: React.FC<InsufficientBalanceModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  requiredAmount,
  currency = 'SYP',
  isLoggedIn,
  onNavigateDeposit,
  onOpenAuth,
  productName,
}) => {
  if (!isOpen) return null;

  const isUsd = currency.toUpperCase() === 'USD';
  const missingAmount = Math.max(0, requiredAmount - currentBalance);

  const formatAmount = (num: number) => {
    if (isUsd) {
      return `$${num.toFixed(2)}`;
    }
    return `${formatSypNumber(num)} ل.س`;
  };

  const handleDepositClick = () => {
    onClose();
    if (!isLoggedIn && onOpenAuth) {
      onOpenAuth();
    } else {
      onNavigateDeposit();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#131728] rounded-2xl sm:rounded-3xl border border-red-200 dark:border-red-900/50 shadow-2xl shadow-red-950/20 transform transition-all duration-300 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Banner with Warning Badge */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="absolute top-4 left-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <AlertCircle className="w-7 h-7 text-white animate-bounce" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-red-100 tracking-wide uppercase block">
                تنبيه الدفع
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">
                رصيدك غير كافي
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-right">
            عذراً، رصيد حسابك الحالي لا يكفي لإتمام طلب شحن{' '}
            {productName ? <strong className="font-bold text-slate-900 dark:text-white">"{productName}"</strong> : 'هذا المنتج'}.
            يرجى شحن وتغذية رصيد محفظتك للمتابعة.
          </p>

          {/* Balance Comparison Breakdown */}
          <div className="bg-slate-50 dark:bg-[#0c0f1d] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            {/* 1. Current Balance */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Wallet className="w-4 h-4 text-amber-500" />
                رصيدك الحالي:
              </span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                {formatAmount(currentBalance)}
              </span>
            </div>

            {/* 2. Required Order Price */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <CreditCard className="w-4 h-4 text-purple-500" />
                تكلفة الطلب المطلوبة:
              </span>
              <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatAmount(requiredAmount)}
              </span>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />

            {/* 3. Missing Amount */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
              <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                المبلغ الناقص للشحن:
              </span>
              <span className="font-black font-mono text-red-600 dark:text-red-400 text-sm sm:text-base">
                {formatAmount(missingAmount)}
              </span>
            </div>
          </div>

          {!isLoggedIn && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs text-right flex items-center gap-2">
              <LogIn className="w-4 h-4 shrink-0" />
              <span>يجب عليك تسجيل الدخول أو إنشاء حساب جديد لتتمكن من شحن رصيدك وإرسال الطلبات.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDepositClick}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7F00FF] to-purple-600 hover:from-purple-600 hover:to-[#7F00FF] text-white font-black text-sm sm:text-base shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {!isLoggedIn ? (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>تسجيل الدخول وشحن الرصيد</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  <span>شحن وتغذية الرصيد الآن</span>
                </>
              )}
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              إلغاء والعودة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
