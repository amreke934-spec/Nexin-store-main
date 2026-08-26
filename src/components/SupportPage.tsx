import React, { useState } from 'react';
import { 
  Headphones, 
  MessageCircle, 
  Send, 
  Phone, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles,
  Zap,
  HelpCircle
} from 'lucide-react';

interface SupportPageProps {
  onNavigateHome: () => void;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onNavigateHome }) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const supportPhone = '0933829164';
  const internationalPhone = '+963933829164';
  const whatsappUrl = 'https://wa.me/963933829164';
  const telegramUrl = 'https://t.me/+963933829164';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(key);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#18112e] to-slate-950 border border-purple-900/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7F00FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#7F00FF] to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-[#7F00FF]/30 shrink-0">
              <Headphones className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>مركز المساعدة والدعم الفني</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                تواصل مع الدعم الفني
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                فريق الدعم الفني لمتجر <strong className="text-white">Nexen Store</strong> متواجد لخدمتكم والإجابة على كافة استفساراتكم وحل أي طلب شحن رقمي بسرعة وكفاءة.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition-all border border-white/10 cursor-pointer self-end sm:self-auto shrink-0 active:scale-95"
          >
            <span>العودة للرئيسية</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Contact Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* 1. WhatsApp Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#121624] border border-emerald-500/30 hover:border-emerald-500/60 p-6 sm:p-7 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                {/* WhatsApp Brand Icon */}
                <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.905.815 2.796.815 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.767-5.768-5.767zm0-2c4.28 0 7.768 3.487 7.768 7.767 0 4.28-3.488 7.767-7.768 7.767-1.328 0-2.58-.337-3.673-.927l-4.358 1.144 1.164-4.254c-.672-1.143-1.033-2.457-1.033-3.73 0-4.28 3.488-7.767 7.768-7.767z" />
                </svg>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                رد فوري ومباشر
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              خدمة العملاء عبر واتساب (WhatsApp)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              تواصل معنا مباشرة عبر تطبيق واتساب لمتابعة طلبك أو لحل أي مشكلة واستفسار على الفور.
            </p>

            {/* Phone Number Display Box */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-wider dir-ltr" dir="ltr">
                  {supportPhone}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(supportPhone, 'whatsapp')}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                title="نسخ الرقم"
              >
                {copiedItem === 'whatsapp' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 text-[11px]">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">نسخ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 text-center"
            >
              <MessageCircle className="w-4 h-4" />
              <span>محادثة فورية على واتساب</span>
            </a>
          </div>
        </div>

        {/* 2. Telegram Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#121624] border border-sky-500/30 hover:border-sky-500/60 p-6 sm:p-7 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform">
                {/* Telegram Brand Icon */}
                <Send className="w-6 h-6 -translate-x-0.5 translate-y-0.5" />
              </div>

              <span className="px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold">
                تواصل سريع
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              الدعم الفني عبر تليجرام (Telegram)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              راسلنا على قناتنا وحساب الدعم الفني في تليجرام للاستفسارات السريعة وتأكيد الطلبات وتحديثات الرصيد.
            </p>

            {/* Telegram Number Display Box */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-wider dir-ltr" dir="ltr">
                  {supportPhone}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(supportPhone, 'telegram')}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                title="نسخ الرقم"
              >
                {copiedItem === 'telegram' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-sky-500 text-[11px]">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">نسخ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 text-center"
            >
              <Send className="w-4 h-4" />
              <span>محادثة فورية على تليجرام</span>
            </a>
          </div>
        </div>

      </div>

      {/* Features & Working Hours Informational Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-[#7F00FF] dark:text-purple-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">خدمة على مدار 24/7</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">جاهزون للرد في أي وقت</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-[#7F00FF] dark:text-purple-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">معالجة فورية للطلبات</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">شحن آلي فوري برقم الـ ID</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-[#7F00FF] dark:text-purple-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">ضمان وموثوقية كاملة</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">حماية تامة لكافة عمليات الشحن</p>
          </div>
        </div>
      </div>

      {/* Helpful Tips for Contacting Support */}
      <div className="rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-[#7F00FF] dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-white block font-black mb-1">
              نصيحة لتسريع معالجة طلبك:
            </strong>
            عند التواصل مع الدعم بخصوص طلب شحن، يرجى تزويدنا بـ <strong>رقم الطلب (Order ID)</strong> ومعرف اللاعب <strong>(Player ID)</strong> واسم اللعبة لتسهيل المراجعة وتأكيد العملية في ثوانٍ معدودة.
          </div>
        </div>
      </div>
    </div>
  );
};
