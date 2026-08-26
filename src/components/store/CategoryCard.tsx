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
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    badge: 'الأكثر طلباً',
    shortSubtitle: 'شحن ألعاب بالـ ID',
  },
  'تطبيقات ومحادثات': {
    icon: MessageSquare,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    badge: 'تفعيل فوري',
    shortSubtitle: 'كوينز وجواهر بث',
  },
  'خدمات تيليجرام': {
    icon: Send,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    badge: 'بريميوم',
    shortSubtitle: 'اشتراكات Telegram',
  },
  'اشتراكات بريميوم': {
    icon: Crown,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    badge: 'رسمي',
    shortSubtitle: 'أنغامي وشاهد وسبوتيفاي',
  },
  'بطاقات وأكواد': {
    icon: Gift,
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    badge: 'أكواد جاهزة',
    shortSubtitle: 'بطاقات وقسائم فورية',
  },
  'خدمات الكاش': {
    icon: Wallet,
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
    badge: 'كاش مباشر',
    shortSubtitle: 'تحويل وتعبئة كاش',
  },
  'وحدات سيريتل': {
    icon: Smartphone,
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    shortSubtitle: 'تعبئة وحدات فورية',
  },
  'وحدات MTN': {
    icon: Radio,
    image: 'https://images.unsplash.com/photo-1556742049-0a67e557b447?w=600&auto=format&fit=crop&q=80',
    shortSubtitle: 'تعبئة وحدات فورية',
  },
};

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onSelectCategory,
}) => {
  const visual = CATEGORY_VISUALS[category.name] || {
    icon: Sparkles,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    shortSubtitle: 'باقات شحن فورية',
  };

  const IconComponent = visual.icon;

  return (
    <div
      onClick={() => onSelectCategory(category.name)}
      className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[145px] sm:min-h-[160px] cursor-pointer transition-colors duration-200 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/60 dark:border-slate-800 hover:border-[#7F00FF]/60 hover:shadow-lg active:scale-98"
    >
      {/* Background Graphic with Dark Vignette */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={visual.image}
          alt={category.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-slate-900/80" />
      </div>

      {/* Top Row: Icon & Badge/Count */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/15 dark:border-slate-700/70 text-purple-300 group-hover:bg-[#7F00FF] group-hover:text-white flex items-center justify-center transition-colors duration-200 shadow-xs">
          <IconComponent className="w-5 h-5" />
        </div>

        <div className="flex flex-col items-end gap-1">
          {visual.badge && (
            <span className="text-[9px] font-bold px-2 py-0.5 bg-[#7F00FF] text-white rounded-full shadow-xs">
              {visual.badge}
            </span>
          )}
          <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 dark:bg-slate-800/80 text-purple-200 border border-white/10 dark:border-slate-700/60">
            {category.packagesCount} باقة
          </span>
        </div>
      </div>

      {/* Bottom Content: Title & Short Subtitle */}
      <div className="relative z-10 mt-3">
        <div className="flex items-center justify-between gap-1">
          <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-purple-200 transition-colors line-clamp-1">
            {category.name}
          </h3>
          <ChevronLeft className="w-4 h-4 text-purple-400 group-hover:text-white transition-transform group-hover:-translate-x-1 shrink-0" />
        </div>

        <p className="text-[11px] text-slate-300 dark:text-slate-400 line-clamp-1 mt-0.5">
          {visual.shortSubtitle}
        </p>
      </div>
    </div>
  );
};
