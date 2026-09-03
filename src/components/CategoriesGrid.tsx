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
  CreditCard,
  LucideIcon 
} from 'lucide-react';

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
  description?: string;
  icon: LucideIcon;
  image: string;
  badge?: string;
}

interface CategoriesGridProps {
  categories: { name: string; count: number }[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  totalProductsCount: number;
}

// Visual metadata for category styling
const CATEGORY_VISUALS: Record<string, { description: string; icon: LucideIcon; image: string; badge?: string }> = {
  'ألعاب رقمية': {
    description: 'شحن فوري بالـ ID لببجي موبايل، فري فاير، بلود سترايك، كلاش رويال...',
    icon: Gamepad2,
    image: 'https://sc-store.top/logos/game-charge.png',
    badge: 'الأكثر طلباً',
  },
  'تطبيقات ومحادثات': {
    description: 'شحن كوينز وجواهر Bigo Live, Poppo Live, Soul Chill, Meyo, Olamet...',
    icon: MessageSquare,
    image: 'https://sc-store.top/logos/app-charge.png',
    badge: 'تفعيل فوري',
  },
  'بطاقات وأكواد': {
    description: 'أكواد وكروت شحن رقمية فورية (PUBG Pins & Free Fire Codes)',
    icon: CreditCard,
    image: 'https://sc-store.top/api/icons/cards/51',
    badge: 'أكواد رسمية',
  },
  'خدمات الكاش': {
    description: 'تحويل وتعبئة رصيد سيريتل كاش و MTN كاش الفوري',
    icon: Wallet,
    image: 'https://sc-store.top/logos/syriatel-cash.png',
    badge: 'كاش مباشر',
  },
  'وحدات سيريتل': {
    description: 'تعبئة وتحويل رصيد وحدات سيريتل (Syriatel) الفورية',
    icon: Smartphone,
    image: 'https://sc-store.top/logos/syriatel.png',
  },
  'وحدات MTN': {
    description: 'تعبئة وتحويل رصيد وحدات MTN الفورية',
    icon: Radio,
    image: 'https://sc-store.top/logos/mtn.png',
  },
};

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductsCount,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-black text-[#1A1A1A] dark:text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-[#7F00FF] rounded-full inline-block" />
          <span>تصفح حسب الأقسام</span>
        </h2>

        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs text-[#7F00FF] dark:text-purple-300 hover:text-[#6A0DAD] font-bold underline underline-offset-4 cursor-pointer transition-colors"
          >
            عرض جميع المنتجات ({totalProductsCount})
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {/* All Products Card */}
        <div
          onClick={() => onSelectCategory('all')}
          className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 flex flex-col justify-between min-h-[115px] sm:min-h-[135px] md:min-h-[150px] cursor-pointer transition-all duration-300 border ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-br from-[#24133d] via-[#1a112c] to-[#120c22] border-[#7F00FF] shadow-lg shadow-[#7F00FF]/25 ring-2 ring-[#7F00FF]/40 -translate-y-0.5'
              : 'bg-gradient-to-br from-[#181424] via-[#13101e] to-[#0c0a13] border-white/10 hover:border-[#7F00FF]/60 hover:shadow-md hover:shadow-[#7F00FF]/15 hover:-translate-y-0.5'
          }`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#7F00FF]/20 rounded-full blur-xl group-hover:bg-[#7F00FF]/35 transition-all pointer-events-none" />

          {/* Top Row: Icon & Count Badge */}
          <div className="relative z-10 flex items-start justify-between gap-1">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/40'
                  : 'bg-white/10 text-purple-300 group-hover:bg-[#7F00FF] group-hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>

            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-purple-200 border border-white/10 leading-none">
              {totalProductsCount} منتج
            </span>
          </div>

          {/* Bottom Info */}
          <div className="relative z-10 mt-2 sm:mt-2.5">
            <h3 className="font-extrabold text-[11px] sm:text-xs md:text-sm lg:text-base text-white group-hover:text-purple-200 transition-colors line-clamp-1 leading-tight">
              جميع الأقسام
            </h3>
            <p className="text-[8.5px] sm:text-[9.5px] md:text-[11px] text-gray-400 line-clamp-1 mt-0.5">
              تصفح كافة الألعاب والاشتراكات
            </p>
          </div>
        </div>

        {/* Individual Category Cards */}
        {categories.map((cat) => {
          const visual = CATEGORY_VISUALS[cat.name] || {
            description: `تصفح باقات ومنتجات ${cat.name}`,
            icon: Gamepad2,
            image: 'https://sc-store.top/logos/game-charge.png',
          };
          const IconComponent = visual.icon;
          const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();

          return (
            <div
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 flex flex-col justify-between min-h-[115px] sm:min-h-[135px] md:min-h-[150px] cursor-pointer transition-all duration-300 border ${
                isSelected
                  ? 'bg-gradient-to-br from-[#24133d] via-[#1a112c] to-[#120c22] border-[#7F00FF] shadow-lg shadow-[#7F00FF]/25 ring-2 ring-[#7F00FF]/40 -translate-y-0.5'
                  : 'bg-gradient-to-br from-[#181424] via-[#13101e] to-[#0c0a13] border-white/10 hover:border-[#7F00FF]/60 hover:shadow-md hover:shadow-[#7F00FF]/15 hover:-translate-y-0.5'
              }`}
            >
              {/* Background Art with dark overlay */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={visual.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a13] via-[#13101e]/85 to-[#181424]/90" />
              </div>

              {/* Ambient Glow */}
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#7F00FF]/15 rounded-full blur-xl group-hover:bg-[#7F00FF]/30 transition-all pointer-events-none" />

              {/* Top Row: Icon & Count / Badge */}
              <div className="relative z-10 flex items-start justify-between gap-1">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0 ${
                    isSelected
                      ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/40'
                      : 'bg-white/10 text-purple-300 group-hover:bg-[#7F00FF] group-hover:text-white'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </div>

                <div className="flex flex-col items-end gap-0.5 sm:gap-1">
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-purple-200 border border-white/10 leading-none">
                    {cat.count} باقة
                  </span>
                  {visual.badge && (
                    <span className="text-[7.5px] sm:text-[8.5px] font-bold px-1.5 py-0.5 bg-[#7F00FF]/80 text-white rounded-md leading-none">
                      {visual.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Info */}
              <div className="relative z-10 mt-2 sm:mt-2.5">
                <h3 className="font-extrabold text-[11px] sm:text-xs md:text-sm lg:text-base text-white group-hover:text-purple-200 transition-colors line-clamp-1 leading-tight">
                  {cat.name}
                </h3>
                <p className="text-[8.5px] sm:text-[9.5px] md:text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                  {visual.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
