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

export const PackageCard: React.FC<PackageCardProps> = ({ product, onSelect }) => {
  const serviceType = getProductServiceType(product);
  const isCash = serviceType === 'cash' || product.isCash;
  const giftDetails = extractGiftCardDetails(product);

  const displayPrice = getProductDisplayPrice(product.price, product.currency || 'USD');

  return (
    <div 
      onClick={() => onSelect(product)}
      className={`group relative overflow-hidden rounded-3xl p-4 sm:p-4.5 flex flex-col justify-between hover:shadow-2xl transition-all duration-200 active:scale-98 cursor-pointer select-none text-white ${
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
      <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-black/60 border border-white/20 shrink-0 p-0.5 shadow-xs">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';
              }}
            />
          </div>
          <div className="overflow-hidden">
            <span className="text-[11px] font-black text-white block tracking-tight truncate">
              {product.gameName || product.category}
            </span>
            <span className="text-[9px] font-bold text-sky-300 block">
              {giftDetails.badgeLabel}
            </span>
          </div>
        </div>

        <span className="font-mono text-[9px] text-slate-300 bg-black/50 px-2 py-0.5 rounded-lg border border-white/10 shrink-0">
          #{product.productId}
        </span>
      </div>

      {/* Center Hero: Token Amount */}
      <div className="relative z-10 my-2">
        <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight drop-shadow-sm line-clamp-1">
          {giftDetails.tokenAmount}
        </div>
        <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5 font-medium">
          {product.name}
        </p>
      </div>

      {/* Pricing and Action Button */}
      <div className="relative z-10 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
        <div>
          <span className="text-[9px] text-slate-400 font-medium block">
            {product.isAmount ? 'لكل وحدة' : 'السعر'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black text-white font-mono">
              {displayPrice.formattedNumber}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-sky-300">
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
          className={`flex items-center gap-1.5 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer shrink-0 ${
            isCash
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/25'
          }`}
        >
          {isCash ? <Wallet className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-white" />}
          <span>{isCash ? 'تحويل' : 'شحن'}</span>
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};


