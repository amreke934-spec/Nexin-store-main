import React from 'react';
import { Lock, LogIn, UserPlus, X, ShieldAlert } from 'lucide-react';
import { Product } from '../types';

interface GuestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
  targetProductName?: string | null;
  targetProductImage?: string | null;
}

export const GuestAccessModal: React.FC<GuestAccessModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  targetProductName,
  targetProductImage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-[#151221] border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center select-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          id="guest-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock / Security Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center shadow-md shadow-purple-500/10">
          <Lock className="w-8 h-8 text-[#7F00FF] dark:text-purple-400" />
        </div>

        {/* Product preview chip if available */}
        {targetProductName && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-3 max-w-[85%] truncate">
            {targetProductImage && (
              <img
                src={targetProductImage}
                alt={targetProductName}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://sc-store.top/logos/game-charge.png';
                }}
              />
            )}
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
              {targetProductName}
            </span>
          </div>
        )}

        {/* Main Required Notice */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2 leading-snug">
          تسجيل الدخول مطلوب
        </h3>

        {/* Exact required text */}
        <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30 mb-6">
          <p className="text-sm sm:text-base font-bold text-[#7F00FF] dark:text-purple-300 leading-relaxed">
            يجب تسجيل الدخول أو إنشاء حساب جديد لعرض التفاصيل الكاملة للمنتج.
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          يتيح لك الحساب الاطلاع على كافة باقات الشحن، الأسعار الفورية، وتتبع طلباتك برصيد محفظتك الرقمية بأمان.
        </p>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            id="guest-modal-login-btn"
            onClick={() => {
              onClose();
              onLogin();
            }}
            className="w-full py-3 px-4 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white font-bold text-sm sm:text-base transition-all shadow-md shadow-[#7F00FF]/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            id="guest-modal-register-btn"
            onClick={() => {
              onClose();
              onRegister();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-sm sm:text-base transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-white/10"
          >
            <UserPlus className="w-4 h-4 text-[#7F00FF] dark:text-purple-400" />
            <span>إنشاء حساب</span>
          </button>

          <button
            type="button"
            id="guest-modal-dismiss-btn"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            متابعة تصفح المتجر كزائر
          </button>
        </div>
      </div>
    </div>
  );
};
