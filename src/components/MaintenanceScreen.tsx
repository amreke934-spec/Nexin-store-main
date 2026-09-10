import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  RefreshCw,
  ShieldCheck,
  Lock,
  MessageCircle,
  Send,
  AlertTriangle,
  Server,
  Sparkles,
} from 'lucide-react';
import { MaintenanceSettings, CustomerUser } from '../types';
import { formatSypNumber } from '../utils/currencyUtils';

interface MaintenanceScreenProps {
  settings: MaintenanceSettings;
  currentUser: CustomerUser | null;
  onCheckStatus?: () => void;
  isChecking?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  hasTimer: boolean;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  settings,
  currentUser,
  onCheckStatus,
  isChecking = false,
}) => {
  const calculateTimeRemaining = (): TimeRemaining => {
    if (!settings.endTime) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false, hasTimer: false };
    }

    const target = new Date(settings.endTime).getTime();
    if (isNaN(target)) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false, hasTimer: false };
    }

    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, hasTimer: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false, hasTimer: true };
  };

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(calculateTimeRemaining());

  useEffect(() => {
    setTimeLeft(calculateTimeRemaining());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [settings.endTime]);

  const padZero = (n: number) => n.toString().padStart(2, '0');

  // Format estimated end time string nicely if available
  const formattedEndTime = settings.endTime
    ? (() => {
        try {
          const d = new Date(settings.endTime);
          return d.toLocaleString('ar-SY', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return settings.endTime;
        }
      })()
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-10 px-4 animate-in fade-in duration-500 text-center" dir="rtl">
      {/* Top Floating Glow Header */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full transform scale-150 animate-pulse" />
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-xl shadow-amber-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-900/90 rounded-[22px] flex items-center justify-center backdrop-blur-sm border border-amber-400/30">
            <Wrench className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
          </div>
        </div>
      </div>

      {/* Main Title & Notice */}
      <div className="space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>وضع الصيانة والتحديث المؤقت مفعّل</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {settings.title || 'الموقع قيد الصيانة والتطوير حالياً'}
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {settings.message ||
            'نقوم حالياً بإجراء بعض التحسينات وتحديثات السيرفرات لتقديم أفضل تجربة شحن وأعلى سرعة لتنفيذ طلباتكم. سنعود للعمل قريباً جداً.'}
        </p>
      </div>

      {/* User Login Context Card (Proves user is logged in & funds are 100% safe) */}
      {currentUser && (
        <div className="max-w-xl mx-auto mb-8 p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">حسابك مسجل حالياً:</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
                {currentUser.name || currentUser.email}
              </p>
            </div>
          </div>

          <div className="text-left">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">رصيدك في أمان:</span>
            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatSypNumber(currentUser.balance || 0)} <span className="text-xs">ل.س</span>
            </span>
          </div>
        </div>
      )}

      {/* Live Countdown Timer Section */}
      <div className="max-w-2xl mx-auto mb-10 p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-center gap-2 mb-6 text-slate-700 dark:text-slate-200 font-bold text-sm sm:text-base">
          <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
          <span>عداد العودة للعمل واستئناف الخدمات</span>
        </div>

        {timeLeft.hasTimer && !timeLeft.isExpired ? (
          <div>
            <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-lg mx-auto">
              {/* Days */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-inner">
                <span className="text-2xl sm:text-4xl font-black font-mono text-purple-600 dark:text-purple-400">
                  {padZero(timeLeft.days)}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  أيام
                </span>
              </div>

              {/* Hours */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-inner">
                <span className="text-2xl sm:text-4xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {padZero(timeLeft.hours)}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  ساعات
                </span>
              </div>

              {/* Minutes */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-inner">
                <span className="text-2xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {padZero(timeLeft.minutes)}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  دقائق
                </span>
              </div>

              {/* Seconds */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-inner">
                <span className="text-2xl sm:text-4xl font-black font-mono text-amber-600 dark:text-amber-400 animate-pulse">
                  {padZero(timeLeft.seconds)}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  ثوانٍ
                </span>
              </div>
            </div>

            {formattedEndTime && (
              <p className="mt-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                الموعد المتوقع للانتهاء:{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{formattedEndTime}</span>
              </p>
            )}
          </div>
        ) : timeLeft.hasTimer && timeLeft.isExpired ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500 animate-spin" />
            <span>شارفت أعمال الصيانة على الانتهاء! جاري إعادة تشغيل الخدمات خلال دقائق قليلة.</span>
          </div>
        ) : (
          <div className="py-6 px-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-base">
              <Sparkles className="w-5 h-5" />
              <span>سنعود قريباً جداً فور اكتمال التحديثات</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              فريق العمل يواصل تجهيز الإصدار الأحدث من المنصة لخدمتكم بشكل أسرع وأفضل.
            </p>
          </div>
        )}
      </div>

      {/* Real-time Status Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 max-w-2xl mx-auto mb-10 text-right">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">خوادم المتجر</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              ترقية دورية وتوسيع سرعة المعالجة
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">أمان الأرصدة</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              جميع الحسابات والأرصدة محفوظة ومحمية 100%
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">الطلبات والإيداع</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              متوقفة مؤقتاً لتفادي أي تعليق
            </p>
          </div>
        </div>
      </div>

      {/* Action / Support Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 max-w-md mx-auto">
        {onCheckStatus && (
          <button
            type="button"
            onClick={onCheckStatus}
            disabled={isChecking}
            className="flex-1 min-w-[180px] h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'جاري التحقق...' : 'تحديث حالة الموقع الآن'}</span>
          </button>
        )}

        {settings.contactWhatsapp && (
          <a
            href={
              settings.contactWhatsapp.startsWith('http')
                ? settings.contactWhatsapp
                : `https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, '')}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>الدعم عبر واتساب</span>
          </a>
        )}

        {settings.contactTelegram && (
          <a
            href={
              settings.contactTelegram.startsWith('http')
                ? settings.contactTelegram
                : `https://t.me/${settings.contactTelegram.replace('@', '')}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-5 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>قناة التلغرام</span>
          </a>
        )}
      </div>
    </div>
  );
};
