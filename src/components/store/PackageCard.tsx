import React from 'react';
import { Zap, ShoppingCart, Wallet, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types';
import { getProductServiceType } from '../../utils/productUtils';
import { extractGiftCardDetails } from '../../utils/giftCardUtils';
import { getProductDisplayPrice } from '../../utils/currencyUtils';

interface PackageCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const PackageCard: React.FC<PackageCardProps> = React.memo(({ product, onSelect }) => {
  const serviceType = getProductServiceType(product);
  const isCash = serviceType === 'cash' || product.isCash;
  const giftDetails = extractGiftCardDetails(product);

  const displayPrice = getProductDisplayPrice(product.price, product.currency || 'USD');

  return (
    <div 
      onClick={() => onSelect(product)}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 flex flex-col justify-between hover:shadow-2xl transition-all duration-200 active:scale-98 cursor-pointer select-none text-white min-h-[145px] sm:min-h-[165px] ${
        isCash
          ? 'bg-gradient-to-br from-[#082419] via-[#051810] to-[#020b08] border border-emerald-900/50 hover:border-emerald-400/60 hover:shadow-emerald-950/30'
          : 'bg-gradient-to-br from-[#0d1c3e] via-[#09152f] to-[#040a17] border border-sky-900/40 hover:border-sky-400/60 hover:shadow-sky-950/30'
      }`}
    >
      {/* Decorative Subtle Background Shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full border-4 border-white/20" />
        <div className="absolute right-12 -top-8 w-24 h-24 rounded-full border-2 border-white/15" />
      </div>

      {/* Top Header with game logo & ID */}
      <div className="relative z-10 flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg sm:rounded-xl overflow-hidden bg-black/60 border border-white/20 shrink-0 p-0.5 shadow-xs">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-md sm:rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';
              }}
            />
          </div>
          <div className="overflow-hidden">
            <span className="text-[9.5px] sm:text-[10.5px] md:text-[11px] font-black text-white block tracking-tight truncate">
              {product.gameName || product.category}
            </span>
            <span className="text-[8px] sm:text-[9px] font-bold text-sky-300 block truncate">
              {giftDetails.badgeLabel}
            </span>
          </div>
        </div>

        <span className="font-mono text-[7.5px] sm:text-[8.5px] md:text-[9px] text-slate-300 bg-black/50 px-1.5 py-0.5 rounded-md border border-white/10 shrink-0">
          #{product.productId}
        </span>
      </div>

      {/* Center Hero: Token Amount */}
      <div className="relative z-10 my-1 sm:my-2">
        <div className="text-base sm:text-lg md:text-xl font-black text-white font-mono tracking-tight drop-shadow-sm line-clamp-1">
          {giftDetails.tokenAmount}
        </div>
        <p className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-300 line-clamp-1 mt-0.5 font-medium">
          {product.name}
        </p>
      </div>

      {/* Pricing and Action Button */}
      <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between gap-1.5 mt-auto">
        <div>
          <span className="text-[7.5px] sm:text-[8.5px] md:text-[9px] text-slate-400 font-medium block leading-none mb-0.5">
            {product.isAmount ? 'لكل وحدة' : 'السعر'}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs sm:text-sm md:text-base font-black text-white font-mono leading-none">
              {displayPrice.formattedNumber}
            </span>
            <span className="text-[7.5px] sm:text-[9px] md:text-[10px] font-bold text-sky-300">
              {displayPrice.currencySymbol}
            </span>
          </div>
        </div>

        <button
          type="button"
          id={`buy-package-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          className={`flex items-center gap-1 active:scale-95 text-white text-[8.5px] sm:text-[10px] md:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all shadow-xs cursor-pointer shrink-0 ${
            isCash
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/25'
          }`}
        >
          {isCash ? <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" />}
          <span>{isCash ? 'تحويل' : 'شحن'}</span>
          <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
});

PackageCard.displayName = 'PackageCard';


