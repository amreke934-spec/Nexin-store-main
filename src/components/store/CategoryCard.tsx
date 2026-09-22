import React from 'react';
import { 
  Gamepad2, 
  MessageSquare, 
  Send, 
  Crown, 
  Gift, 
  Wallet, 
  Smartphone, 
  Radio, 
  Sparkles,
  ChevronLeft,
  CreditCard,
  LucideIcon 
} from 'lucide-react';

export interface CategorySummary {
  name: string;
  gamesCount: number;
  packagesCount: number;
  sampleItems: string[];
}

interface CategoryCardProps {
  category: CategorySummary;
  isSelected?: boolean;
  onSelectCategory: (categoryName: string) => void;
}

export const getArabicCategoryName = (rawName: string): string => {
  if (!rawName) return 'عام';
  const clean = rawName.trim().toLowerCase();

  if (clean === 'games' || clean.includes('ألعاب') || clean.includes('العاب') || clean.includes('game')) {
    return 'ألعاب رقمية';
  }
  if (clean === 'apps' || clean.includes('تطبيق') || clean.includes('محادثات') || clean.includes('app') || clean.includes('chat')) {
    return 'تطبيقات ومحادثات';
  }
  if (clean === 'cards' || clean.includes('بطاق') || clean.includes('كود') || clean.includes('أكواد') || clean.includes('card')) {
    return 'بطاقات وأكواد';
  }
  if (clean === 'cash' || clean === 'cashbalances' || clean.includes('كاش')) {
    return 'خدمات الكاش';
  }
  if (clean === 'syriatel' || clean.includes('سيريتل') || clean.includes('سيرياتيل')) {
    return 'وحدات سيريتل';
  }
  if (clean === 'mtn' || clean.includes('ام تي ان') || clean.includes('ام تى ان')) {
    return 'وحدات MTN';
  }
  if (clean.includes('اشتراك') || clean === 'subscriptions') {
    return 'اشتراكات وخدمات';
  }
  return rawName;
};

const CATEGORY_VISUALS: Record<string, { 
  icon: LucideIcon; 
  image: string; 
  badge?: string;
  shortSubtitle: string;
}> = {
  'ألعاب رقمية': {
    icon: Gamepad2,
    image: 'https://sc-store.top/logos/game-charge.png',
    badge: 'الأكثر طلباً',
    shortSubtitle: 'شحن ألعاب بالـ ID',
  },
  'تطبيقات ومحادثات': {
    icon: MessageSquare,
    image: 'https://sc-store.top/logos/app-charge.png',
    badge: 'تفعيل فوري',
    shortSubtitle: 'كوينز وجواهر بث',
  },
  'بطاقات وأكواد': {
    icon: CreditCard,
    image: 'https://sc-store.top/api/icons/cards/51',
    badge: 'أكواد رسمية',
    shortSubtitle: 'أكواد وكروت رقمية',
  },
  'خدمات الكاش': {
    icon: Wallet,
    image: 'https://sc-store.top/logos/syriatel-cash.png',
    badge: 'كاش مباشر',
    shortSubtitle: 'تحويل وتعبئة كاش',
  },
  'وحدات سيريتل': {
    icon: Smartphone,
    image: 'https://sc-store.top/logos/syriatel.png',
    badge: 'تحويل رصيد',
    shortSubtitle: 'تحويل رصيد وحدات',
  },
  'وحدات MTN': {
    icon: Radio,
    image: 'https://sc-store.top/logos/mtn.png',
    badge: 'تحويل رصيد',
    shortSubtitle: 'تحويل رصيد وحدات',
  },
};

export const CategoryCard: React.FC<CategoryCardProps> = React.memo(({
  category,
  isSelected = false,
  onSelectCategory,
}) => {
  const arabicName = getArabicCategoryName(category.name);

  const visual = CATEGORY_VISUALS[arabicName] || CATEGORY_VISUALS[category.name] || {
    icon: Sparkles,
    image: 'https://sc-store.top/logos/game-charge.png',
    shortSubtitle: 'باقات شحن فورية',
  };

  const IconComponent = visual.icon;

  return (
    <div
      onClick={() => onSelectCategory(category.name)}
      className="group flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer select-none"
    >
      {/* Category Visual Card */}
      <div
        className={`w-full relative overflow-hidden rounded-xl sm:rounded-2xl p-2 min-[360px]:p-2.5 sm:p-3.5 md:p-4 flex flex-col justify-between min-h-[92px] min-[360px]:min-h-[105px] sm:min-h-[115px] md:min-h-[125px] transition-all duration-200 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border ${
          isSelected
            ? 'border-[#7F00FF] ring-2 ring-[#7F00FF] shadow-lg shadow-[#7F00FF]/30 scale-[1.02]'
            : 'border-slate-700/60 dark:border-slate-800 hover:border-[#7F00FF]/70 hover:shadow-lg group-hover:scale-[1.02] active:scale-98'
        }`}
      >
        {/* Background Graphic with Dark Vignette */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={visual.image}
            alt={arabicName}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-25 group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-slate-900/80" />
        </div>

        {/* Top Row: Icon & Badge/Count */}
        <div className="relative z-10 flex items-start justify-between gap-1">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center transition-colors duration-200 shadow-xs shrink-0 ${
            isSelected
              ? 'bg-[#7F00FF] text-white border-[#7F00FF]'
              : 'bg-white/10 dark:bg-slate-800/80 border-white/15 dark:border-slate-700/70 text-purple-300 group-hover:bg-[#7F00FF] group-hover:text-white'
          }`}>
            <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>

          <div className="flex flex-col items-end gap-0.5 sm:gap-1">
            {visual.badge && (
              <span className="text-[7.5px] sm:text-[8.5px] md:text-[9px] font-bold px-1.5 py-0.5 bg-[#7F00FF] text-white rounded-full shadow-xs leading-none">
                {visual.badge}
              </span>
            )}
            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/10 dark:bg-slate-800/80 text-purple-200 border border-white/10 dark:border-slate-700/60 leading-none">
              {category.packagesCount} باقة
            </span>
          </div>
        </div>

        {/* Subtle Bottom Subtitle & Arrow */}
        <div className="relative z-10 flex items-center justify-between text-slate-300 text-[8.5px] sm:text-[9.5px] md:text-[10.5px]">
          <span className="line-clamp-1 opacity-90">{visual.shortSubtitle}</span>
          <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 group-hover:text-white transition-transform group-hover:-translate-x-0.5 shrink-0" />
        </div>
      </div>

      {/* Category Name in Arabic Under the Card */}
      <div className="w-full text-center px-1">
        <h3 className="text-xs sm:text-sm font-extrabold text-[#1A1A1A] dark:text-white group-hover:text-[#7F00FF] dark:group-hover:text-purple-300 transition-colors line-clamp-1 leading-snug">
          {arabicName}
        </h3>
      </div>
    </div>
  );
});

CategoryCard.displayName = 'CategoryCard';
