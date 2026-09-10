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
  onSelectCategory: (categoryName: string) => void;
}

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
  onSelectCategory,
}) => {
  const visual = CATEGORY_VISUALS[category.name] || {
    icon: Sparkles,
    image: 'https://sc-store.top/logos/game-charge.png',
    shortSubtitle: 'باقات شحن فورية',
  };

  const IconComponent = visual.icon;

  return (
    <div
      onClick={() => onSelectCategory(category.name)}
      className="group relative overflow-hidden rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 flex flex-col justify-between min-h-[115px] sm:min-h-[135px] md:min-h-[150px] cursor-pointer transition-all duration-200 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/60 dark:border-slate-800 hover:border-[#7F00FF]/70 hover:shadow-lg active:scale-98 select-none"
    >
      {/* Background Graphic with Dark Vignette */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={visual.image}
          alt={category.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-25 group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-slate-900/80" />
      </div>

      {/* Top Row: Icon & Badge/Count */}
      <div className="relative z-10 flex items-start justify-between gap-1">
        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/15 dark:border-slate-700/70 text-purple-300 group-hover:bg-[#7F00FF] group-hover:text-white flex items-center justify-center transition-colors duration-200 shadow-xs shrink-0">
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

      {/* Bottom Content: Title & Short Subtitle */}
      <div className="relative z-10 mt-2 sm:mt-2.5">
        <div className="flex items-center justify-between gap-1">
          <h3 className="font-extrabold text-[11px] sm:text-xs md:text-sm lg:text-base text-white group-hover:text-purple-200 transition-colors line-clamp-1 leading-tight">
            {category.name}
          </h3>
          <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-400 group-hover:text-white transition-transform group-hover:-translate-x-0.5 shrink-0" />
        </div>

        <p className="text-[8.5px] sm:text-[9.5px] md:text-[11px] text-slate-300 dark:text-slate-400 line-clamp-1 mt-0.5">
          {visual.shortSubtitle}
        </p>
      </div>
    </div>
  );
});

CategoryCard.displayName = 'CategoryCard';
