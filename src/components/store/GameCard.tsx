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
    if (count === 1) return '1 باقة متوفرة';
    if (count === 2) return 'باقتان متوفرتان';
    if (count >= 3 && count <= 10) return `${count} باقات متوفرة`;
    return `${count} باقة متوفرة`;
  };

  const displayPrice = getProductDisplayPrice(game.minPrice, game.currency || 'USD');

  return (
    <div
      onClick={() => onSelectGame(game.gameName)}
      className="group relative overflow-hidden rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[220px] sm:min-h-[240px] cursor-pointer transition-all duration-200 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/70 dark:border-slate-800 hover:border-[#7F00FF]/70 hover:shadow-xl hover:shadow-[#7F00FF]/15 active:scale-98 text-white select-none"
    >
      {/* Top Row: Category tag and Packages Count */}
      <div className="w-full flex items-center justify-between gap-2 z-10">
        <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/60 text-slate-300 group-hover:text-purple-300 transition-colors">
          {game.category}
        </span>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7F00FF]/25 border border-[#7F00FF]/40 text-[#c084fc] text-[10px] font-bold font-mono">
          <Layers className="w-3 h-3 text-purple-300" />
          <span>{formatPackagesCount(game.packagesCount)}</span>
        </span>
      </div>

      {/* Center Row: Game Icon & Title */}
      <div className="relative my-3 z-10 flex items-center gap-3.5">
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 group-hover:border-[#7F00FF] shadow-lg shadow-black/50 transition-colors duration-200 p-0.5 shrink-0">
          <img
            src={game.image}
            alt={game.gameName}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';
            }}
          />
        </div>

        <div className="overflow-hidden">
          <h3 className="font-black text-sm sm:text-base md:text-lg text-white group-hover:text-purple-200 transition-colors line-clamp-1 leading-snug">
            {game.gameName}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span>شحن فوري ومباشر بالـ ID</span>
          </p>
        </div>
      </div>

      {/* Bottom Row: Starting Price in Syrian Pounds and Interactive Action Button */}
      <div className="pt-3 border-t border-white/10 dark:border-slate-800 flex items-center justify-between gap-2 z-10 mt-auto">
        <div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium">يبدأ من</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base md:text-lg font-black text-white font-mono">
              {displayPrice.formattedNumber}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-purple-300">
              {displayPrice.currencySymbol}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#7F00FF] group-hover:bg-[#6b00d6] text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs shadow-[#7F00FF]/25 shrink-0">
          <span>عرض الباقات</span>
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};

