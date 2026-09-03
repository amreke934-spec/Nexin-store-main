import React from 'react';
import { Zap, ShoppingCart, ArrowLeft, Wallet } from 'lucide-react';
import { Product } from '../types';
import { getProductServiceType } from '../utils/productUtils';
import { getProductDisplayPrice } from '../utils/currencyUtils';
import { useProfitMargin } from '../utils/profitUtils';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  // Subscribe to profit margin updates in real-time
  useProfitMargin();

  const serviceType = getProductServiceType(product);
  const isCash = serviceType === 'cash' || product.isCash;

  const displayPrice = getProductDisplayPrice(product.price, product.currency || 'USD');

  return (
    <div 
      onClick={() => onSelect(product)}
      className="group relative bg-white dark:bg-[#151221] border border-gray-200/90 dark:border-white/10 hover:border-[#7F00FF]/60 dark:hover:border-[#7F00FF]/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 flex flex-col justify-between hover:shadow-xl hover:shadow-[#7F00FF]/10 transition-all duration-200 active:scale-98 cursor-pointer select-none"
    >
      {/* Badge if available */}
      {product.badge && (
        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 bg-[#7F00FF] text-white text-[7.5px] sm:text-[9px] md:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs">
          {product.badge}
        </span>
      )}

      <div>
        {/* Product Image & Tag (enlarged by ~20%) */}
        <div className="relative w-full h-28 sm:h-34 md:h-44 rounded-lg sm:rounded-xl overflow-hidden bg-gray-50 dark:bg-black/30 mb-2 sm:mb-3 border border-gray-100 dark:border-white/10 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://sc-store.top/logos/game-charge.png';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-1.5 right-1.5 left-1.5 flex items-center justify-between text-[8px] sm:text-[9px] md:text-[10px] text-white font-medium">
            <span className="bg-black/75 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              {isCash ? <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" /> : <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-300 fill-yellow-300" />}
              <span className="hidden xs:inline">{isCash ? 'تحويل كاش' : 'شحن بالـ ID'}</span>
              <span className="xs:hidden">{isCash ? 'كاش' : 'شحن'}</span>
            </span>
            <span className="bg-[#7F00FF]/90 px-1.5 py-0.5 rounded-md font-mono text-[7.5px] sm:text-[8.5px] truncate max-w-[50%]">
              {product.gameName || product.category}
            </span>
          </div>
        </div>

        {/* Product Title & Info */}
        <h3 className="font-black text-[11px] sm:text-xs md:text-sm text-[#1A1A1A] dark:text-white line-clamp-2 mb-1 group-hover:text-[#7F00FF] dark:group-hover:text-purple-300 transition-colors leading-tight">
          {product.name}
        </h3>

        <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] md:text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 sm:mb-2">
          <span className="truncate max-w-[60%]">القسم: {product.category}</span>
          <span className="font-mono shrink-0">#{product.productId}</span>
        </div>
      </div>

      {/* Footer / Price & Purchase Button */}
      <div className="pt-2 sm:pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-1.5 mt-auto">
        <div>
          <span className="text-[7.5px] sm:text-[8.5px] md:text-[9.5px] text-gray-400 dark:text-gray-500 font-medium block leading-none mb-0.5">
            {product.isAmount ? 'لكل وحدة' : 'السعر'}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs sm:text-sm md:text-base font-black text-[#1A1A1A] dark:text-white font-mono leading-none">
              {displayPrice.formattedNumber}
            </span>
            <span className="text-[7.5px] sm:text-[9px] md:text-[10px] font-bold text-[#7F00FF] dark:text-purple-300">
              {displayPrice.currencySymbol}
            </span>
          </div>
        </div>

        <button
          type="button"
          id={`buy-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          className="flex items-center gap-1 bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-95 text-white text-[8px] sm:text-[10px] md:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all shadow-xs shadow-[#7F00FF]/25 cursor-pointer shrink-0"
        >
          <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span>شحن</span>
          <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

