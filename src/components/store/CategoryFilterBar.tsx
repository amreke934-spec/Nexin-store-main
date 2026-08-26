import React, { useRef } from 'react';
import { 
  Sparkles, 
  Gamepad2, 
  MessageSquare, 
  Send, 
  Crown, 
  Gift, 
  Wallet, 
  Smartphone, 
  Radio, 
  ChevronRight, 
  ChevronLeft,
  LayoutGrid
} from 'lucide-react';
import { CategorySummary } from './CategoryCard';

interface CategoryFilterBarProps {
  categories: CategorySummary[];
  selectedCategory: string | null;
  onSelectCategory: (categoryName: string | null) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'ألعاب رقمية': <Gamepad2 className="w-3.5 h-3.5" />,
  'تطبيقات ومحادثات': <MessageSquare className="w-3.5 h-3.5" />,
  'خدمات تيليجرام': <Send className="w-3.5 h-3.5" />,
  'اشتراكات بريميوم': <Crown className="w-3.5 h-3.5" />,
  'بطاقات وأكواد': <Gift className="w-3.5 h-3.5" />,
  'خدمات الكاش': <Wallet className="w-3.5 h-3.5" />,
  'وحدات سيريتل': <Smartphone className="w-3.5 h-3.5" />,
  'وحدات MTN': <Radio className="w-3.5 h-3.5" />,
};

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/bar w-full">
      {/* Scroll Left Button */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-[#7F00FF] hover:text-white dark:hover:bg-[#7F00FF] transition-all cursor-pointer opacity-0 group-hover/bar:opacity-100"
        aria-label="تمرير لليسار"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto py-1.5 px-0.5 scrollbar-none no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* All Categories Button */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all duration-200 cursor-pointer ${
            selectedCategory === null
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/30 scale-102 ring-2 ring-[#7F00FF]/40'
              : 'bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80 shadow-xs'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>كل الأقسام</span>
        </button>

        {/* Dynamic Category Buttons */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          const isCash = cat.name.includes('كاش') || cat.name.includes('سيريتل') || cat.name.includes('MTN');
          const icon = CATEGORY_ICONS[cat.name] || <Sparkles className="w-3.5 h-3.5" />;

          return (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(isSelected ? null : cat.name)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? isCash
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-102 ring-2 ring-emerald-500/40'
                    : 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/30 scale-102 ring-2 ring-[#7F00FF]/40'
                  : 'bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-[#7F00FF]/40'
              }`}
            >
              <span className={isSelected ? 'text-white' : isCash ? 'text-emerald-500' : 'text-[#7F00FF] dark:text-purple-400'}>
                {icon}
              </span>
              <span>{cat.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {cat.packagesCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-[#7F00FF] hover:text-white dark:hover:bg-[#7F00FF] transition-all cursor-pointer opacity-0 group-hover/bar:opacity-100"
        aria-label="تمرير لليمين"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
