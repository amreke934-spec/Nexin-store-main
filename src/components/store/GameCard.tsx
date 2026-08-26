import React from 'react';
import { Layers, ChevronLeft, Zap, ArrowLeft, Tag } from 'lucide-react';
import { Product } from '../../types';
import { getProductDisplayPrice } from '../../utils/currencyUtils';

export interface GameGroup {
  gameName: string;
  category: string;
  image: string;
  packagesCount: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
  packages: Product[];
}

interface GameCardProps {
  game: GameGroup;
  onSelectGame: (gameName: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onSelectGame }) => {
  // Format packages count in natural Arabic
  const formatPackagesCount = (count: number) => {
    if (count === 1) return '1 باقة';
    if (count === 2) return 'باقتان';
    if (count >= 3 && count <= 10) return `${count} باقات`;
    return `${count} باقة`;
  };

  const displayPrice = getProductDisplayPrice(game.minPrice, game.currency || 'USD');

  return (
    <div
      onClick={() => onSelectGame(game.gameName)}
      className="group relative overflow-hidden rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 flex flex-col justify-between min-h-[160px] sm:min-h-[190px] md:min-h-[220px] cursor-pointer transition-all duration-200 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/70 dark:border-slate-800 hover:border-[#7F00FF]/70 hover:shadow-xl hover:shadow-[#7F00FF]/15 active:scale-98 text-white select-none"
    >
      {/* Top Row: Category tag and Packages Count */}
      <div className="w-full flex items-center justify-between gap-1 z-10">
        <span className="text-[7.5px] sm:text-[9px] md:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/60 text-slate-300 group-hover:text-purple-300 transition-colors truncate max-w-[55%]">
          {game.category}
        </span>

        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#7F00FF]/25 border border-[#7F00FF]/40 text-[#c084fc] text-[7.5px] sm:text-[8.5px] md:text-[9.5px] font-bold font-mono shrink-0">
          <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-300" />
          <span>{formatPackagesCount(game.packagesCount)}</span>
        </span>
      </div>

      {/* Center Row: Game Icon & Title */}
      <div className="relative my-2 sm:my-3 z-10 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 text-center sm:text-right">
        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 group-hover:border-[#7F00FF] shadow-md shadow-black/50 transition-colors duration-200 p-0.5 shrink-0">
          <img
            src={game.image}
            alt={game.gameName}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-lg sm:rounded-xl group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';
            }}
          />
        </div>

        <div className="overflow-hidden w-full">
          <h3 className="font-black text-xs sm:text-sm md:text-base text-white group-hover:text-purple-200 transition-colors line-clamp-1 leading-tight">
            {game.gameName}
          </h3>
          <p className="text-[8.5px] sm:text-[9.5px] md:text-[10.5px] text-slate-400 mt-0.5 line-clamp-1 flex items-center justify-center sm:justify-start gap-1">
            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400 fill-yellow-400 shrink-0" />
            <span>شحن فوري بالـ ID</span>
          </p>
        </div>
      </div>

      {/* Bottom Row: Starting Price in Syrian Pounds and Interactive Action Button */}
      <div className="pt-2 sm:pt-2.5 border-t border-white/10 dark:border-slate-800 flex items-center justify-between gap-1.5 z-10 mt-auto">
        <div>
          <span className="text-[7.5px] sm:text-[8.5px] md:text-[9.5px] text-slate-400 block font-medium leading-none mb-0.5">يبدأ من</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs sm:text-sm md:text-base font-black text-white font-mono leading-none">
              {displayPrice.formattedNumber}
            </span>
            <span className="text-[7.5px] sm:text-[9px] md:text-[10px] font-bold text-purple-300">
              {displayPrice.currencySymbol}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#7F00FF] group-hover:bg-[#6b00d6] text-white text-[8px] sm:text-[10px] md:text-xs font-bold transition-all shadow-xs shadow-[#7F00FF]/25 shrink-0">
          <span className="hidden xs:inline">عرض</span>
          <span className="xs:hidden">الباقات</span>
          <span className="hidden xs:inline">الباقات</span>
          <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:-translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};

