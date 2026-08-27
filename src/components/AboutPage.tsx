import React from 'react';
import { 
  Info, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Coins, 
  ArrowLeft, 
  Layers, 
  Gamepad2, 
  CheckCircle2,
  Lock,
  Globe2,
  Award
} from 'lucide-react';
import { NexenLogo } from './NexenLogo';

interface AboutPageProps {
  onNavigateHome: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = React.memo(({ onNavigateHome }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#18112e] to-slate-950 border border-purple-900/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7F00FF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 dark:bg-purple-950/60 border border-purple-400/30 flex items-center justify-center p-2.5 shadow-lg shadow-[#7F00FF]/30 shrink-0">
              <NexenLogo size="md" showText={false} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#7F00FF]/30 border border-purple-400/40 text-purple-200 text-xs font-bold mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>المنصة الرائدة للشحن الرقمي</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                عن متجر <span className="text-[#a855f7]">NEXEN STORE</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                بوابتك الموثوقة لشحن الألعاب الإلكترونية، البطاقات الرقمية، والاشتراكات المباشرة بأعلى سرعة وأفضل الأسعار بالليرة السورية والدولار.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition-all border border-white/10 cursor-pointer self-end sm:self-auto shrink-0 active:scale-95"
          >
            <span>العودة للمتجر</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview & Vision */}
      <div className="rounded-3xl bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              من نحن ورؤيتنا
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تقديم أسهل تجربة شحن رقمي للجمهور العربي واللاعبين
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          تأسس <strong>Nexen Store</strong> ليكون الحل الأمثل والشامل لكل عشاق الألعاب ومستخدمي الخدمات الرقمية في سوريا والعالم العربي. نقدم منصة آلية متكاملة تتيح للاعبين شحن حساباتهم في أشهر الألعاب (ببجي موبايل، فري فاير، كول أوف ديوتي، بيس إي فوتبول، كلاش أوف كلانس، روبلوكس، تيك توك، وغيرها) مباشرة من خلال معرف اللاعب (Player ID) وبدون الحاجة لبيانات الحساب الشخصية، مع دعم الأسعار المحدثة بالليرة السورية وتحديثات الرصيد الفورية.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#7F00FF] dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">شحن آلي فوري 100%</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                تصل الجواهر والشدات والنقاط لحسابك في اللعبة فور تأكيد الطلب.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#7F00FF] dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">أمان كامل للبيانات</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                لا نطلب أي كلمات سر، الشحن يتم فقط عبر المعرف الرسمي للاعب.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-start gap-3">
            <Coins className="w-5 h-5 text-[#7F00FF] dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">أسعار شفافة بالليرة السورية</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                حساب فوري لسعر الصرف مع باقات متنوعة تناسب كافة الميزانيات.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-start gap-3">
            <Award className="w-5 h-5 text-[#7F00FF] dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">دعم فني وضمان رسمي</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                متابعة دقيقة لكل طلب وتحديث فوري لحالة الشحن عبر سجل الطلبات.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Services Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center mb-3">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              ألعاب الفيديو والـ ID
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              شحن شدات ببجي، جواهر فري فاير، كوينز بيس eFootball، كود موبايل، كلاش، وروبلوكس.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              البطاقات والقسائم
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              قسائم جوجل بلاي، آبل آيتونز، بطاقات بلايستيشن، إكس بوكس، وبطاقات الهدايا الرقمية.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              الاشتراكات وتحويل الكاش
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              اشتراكات نتفلكس، سبوتيفاي، برامج الذكاء الاصطناعي، وتحويلات الكاش الرقمية المباشرة.
            </p>
          </div>
        </div>
      </div>

      {/* Support Call-to-Action Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-900/40 via-[#7F00FF]/30 to-indigo-900/40 border border-purple-500/30 p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-right">
          <h3 className="text-base sm:text-lg font-black text-white">هل لديك أي استفسار أو اقتراح؟</h3>
          <p className="text-xs text-purple-200 mt-0.5">فريق الدعم الفني جاهز لمساعدتك في أي وقت عبر واتساب وتليجرام.</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="https://wa.me/963933829164"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-600/30 shrink-0"
          >
            واتساب مباشر
          </a>
          <a
            href="https://t.me/nexen_store"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-4 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#7F00FF]/30 shrink-0"
          >
            قناة التليجرام
          </a>
        </div>
      </div>
    </div>
  );
});

AboutPage.displayName = 'AboutPage';

