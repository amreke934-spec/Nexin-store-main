import React from 'react';
import { Zap, ShoppingCart, ArrowLeft, Wallet } from 'lucide-react';
import { Product } from '../types';
import { getProductServiceType } from '../utils/productUtils';
import { getProductDisplayPrice } from '../utils/currencyUtils';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const serviceType = getProductServiceType(product);
  const isCash = serviceType === 'cash' || product.isCash;

  const displayPrice = getProductDisplayPrice(product.price, product.currency || 'USD');

  return (
    <div 
      onClick={() => onSelect(product)}
      className="group relative bg-white dark:bg-[#151221] border border-gray-200/90 dark:border-white/10 hover:border-[#7F00FF]/60 dark:hover:border-[#7F00FF]/60 rounded-3xl p-4 flex flex-col justify-between hover:shadow-xl hover:shadow-[#7F00FF]/10 transition-all duration-200 active:scale-98 cursor-pointer select-none"
    >
      {/* Badge if available */}
      {product.badge && (
        <span className="absolute top-3 right-3 z-20 bg-[#7F00FF] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
          {product.badge}
        </span>
      )}

      <div>
        {/* Product Image & Tag */}
        <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/30 mb-3 border border-gray-100 dark:border-white/10 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between text-[10px] text-white font-medium">
            <span className="bg-black/75 px-2 py-0.5 rounded-lg flex items-center gap-1">
              {isCash ? <Wallet className="w-3 h-3 text-emerald-400" /> : <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />}
              <span>{isCash ? 'تحويل كاش' : 'شحن فوري بالـ ID'}</span>
            </span>
            <span className="bg-[#7F00FF]/90 px-2 py-0.5 rounded-lg font-mono text-[9px]">
              {product.gameName || product.category}
            </span>
          </div>
        </div>

        {/* Product Title & Info */}
        <h3 className="font-black text-xs sm:text-sm text-[#1A1A1A] dark:text-white line-clamp-2 mb-1 group-hover:text-[#7F00FF] dark:group-hover:text-purple-300 transition-colors leading-snug">
          {product.name}
        </h3>

        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mb-2">
          <span>القسم: {product.category}</span>
          <span className="font-mono">#{product.productId}</span>
        </div>
      </div>

      {/* Footer / Price & Purchase Button */}
      <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2 mt-auto">
        <div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium block">
            {product.isAmount ? 'السعر لكل وحدة' : 'السعر'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-white font-mono">
              {displayPrice.formattedNumber}
            </span>
            <span className="text-xs font-bold text-[#7F00FF] dark:text-purple-300">
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
          className="flex items-center gap-1.5 bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs shadow-[#7F00FF]/25 cursor-pointer shrink-0"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>شحن الآن</span>
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

