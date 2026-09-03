import React from 'react';
import { 
  ArrowRight, 
  Zap, 
  ShoppingCart, 
  Wallet,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Product } from '../../types';
import { getProductFieldMetadata, getProductServiceType } from '../../utils/productUtils';
import { extractGiftCardDetails } from '../../utils/giftCardUtils';
import { convertToSyp, formatSypNumber } from '../../utils/currencyUtils';

interface GamePackagesViewProps {
  gameName: string;
  categoryName: string;
  packages: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product, options?: { playerId?: string; qty?: number }) => void;
}

export const GamePackagesView: React.FC<GamePackagesViewProps> = React.memo(({
  gameName,
  categoryName,
  packages,
  onBack,
  onSelectProduct,
}) => {
  const activeProduct = packages[0];
  const fieldMeta = getProductFieldMetadata(activeProduct);
  const serviceType = getProductServiceType(activeProduct);

  const mainImage =
    packages[0]?.image ||
    'https://sc-store.top/logos/game-charge.png';

  const formatPrice = (price: number, currency: string = 'SYP') => {
    const syp = convertToSyp(price, currency);
    return `${formatSypNumber(syp)} ل.س`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Bar: Back Button & App Info */}
      <div className="bg-gradient-to-r from-[#181424] via-[#13101e] to-[#0c0a13] border border-white/10 rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* App Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-900 border-2 border-white/15 shrink-0 shadow-lg shadow-black/50 p-0.5">
              <img
                src={mainImage}
                alt={gameName}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://sc-store.top/logos/game-charge.png';
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-white/10 text-purple-200 border border-white/10 rounded-md">
                  {categoryName}
                </span>
                <span
                  className={`text-[11px] flex items-center gap-1 font-medium ${
                    serviceType === 'cash' ? 'text-emerald-400' : serviceType === 'telecom' ? 'text-amber-300' : 'text-purple-300'
                  }`}
                >
                  {serviceType === 'cash' ? (
                    <Wallet className="w-3 h-3 text-emerald-400" />
                  ) : serviceType === 'telecom' ? (
                    <Phone className="w-3 h-3 text-amber-300" />
                  ) : (
                    <Zap className="w-3 h-3 fill-purple-400" />
                  )}
                  {serviceType === 'telecom' ? `رصيد وحدات ${gameName}` : fieldMeta.badgeText}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                {serviceType === 'telecom' ? `شحن وحدات ${gameName}` : gameName}
              </h1>

              <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                {serviceType === 'cash'
                  ? 'اختر باقة الكاش المطلوبة للانتقال مباشرة لصفحة إدخال رقم المحفظة والتنفيذ الفوري'
                  : serviceType === 'telecom'
                  ? 'اختر باقة الوحدات المطلوبة للانتقال مباشرة لصفحة إدخال رقم الهاتف والتعبئة الفورية'
                  : 'اختر باقة الشحن المطلوبة للانتقال إلى صفحة إدخال المعرف (ID) وتأكيد الطلب'}
              </p>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl transition-all border border-white/10 cursor-pointer shrink-0 self-start sm:self-center"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للخدمات</span>
          </button>
        </div>
      </div>

      {/* 2. Packages Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span
              className={`w-2 h-4 rounded-full inline-block ${
                serviceType === 'cash' ? 'bg-emerald-500' : serviceType === 'telecom' ? 'bg-amber-500' : 'bg-[#7F00FF]'
              }`}
            />
            <span>اختر الباقة المطلوبة ({packages.length} متوفرة)</span>
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            انقر على أي باقة للشحن الفوري
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {packages.map((pkg) => {
            const giftDetails = extractGiftCardDetails(pkg, gameName);

            return (
              <div
                key={pkg.id}
                onClick={() => onSelectProduct(pkg)}
                className={`group relative overflow-hidden rounded-3xl p-4 sm:p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[175px] sm:min-h-[185px] active:scale-[0.98] select-none text-white shadow-md hover:shadow-xl ${
                  serviceType === 'cash'
                    ? 'bg-gradient-to-br from-[#082419] via-[#051810] to-[#020b08] border border-emerald-900/50 hover:border-emerald-400/80 hover:shadow-emerald-950/40'
                    : 'bg-gradient-to-br from-[#0d1c3e] via-[#09152f] to-[#040a17] border border-sky-900/40 hover:border-sky-400/80 hover:shadow-sky-950/40'
                }`}
              >
                {/* Decorative Background Shape */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full border-4 border-white/20" />
                  <div className="absolute right-12 -top-8 w-24 h-24 rounded-full border-2 border-white/15" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                </div>

                {/* Top Row: Game Logo & Title + ID */}
                <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-black/60 border border-white/20 shrink-0 p-0.5 shadow-xs">
                      <img
                        src={pkg.image || mainImage}
                        alt={pkg.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://sc-store.top/logos/game-charge.png';
                        }}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-black text-white block tracking-tight truncate">
                        {gameName}
                      </span>
                      <span className="text-[9.5px] font-bold text-sky-300 block">
                        {giftDetails.badgeLabel}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-[9px] text-slate-300 bg-black/50 px-2 py-0.5 rounded-lg border border-white/10 shrink-0">
                    #{pkg.productId}
                  </span>
                </div>

                {/* Center Hero: Token Amount / VIP / Denomination */}
                <div className="relative z-10 my-2">
                  <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight drop-shadow-sm line-clamp-1">
                    {giftDetails.tokenAmount}
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5 font-medium">
                    {pkg.name}
                  </p>
                </div>

                {/* Bottom Row: Instant Delivery Tag & Prominent Button */}
                <div className="relative z-10 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1 text-[10px] text-slate-300">
                    {serviceType === 'cash' ? (
                      <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : serviceType === 'telecom' ? (
                      <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 shrink-0" />
                    )}
                    <span className="truncate">
                      {serviceType === 'cash'
                        ? 'تحويل فوري'
                        : serviceType === 'telecom'
                        ? 'تعبئة فورية بالرقم'
                        : 'تسليم فوري بالـ ID'}
                    </span>
                  </div>

                  {/* Price Tag & Action Capsule */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl bg-white/15 text-white border border-white/20 font-mono font-black text-xs">
                      {formatPrice(pkg.price, pkg.currency || 'USD')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(pkg);
                      }}
                      className={`p-1.5 rounded-xl text-white active:scale-90 transition-transform ${
                        serviceType === 'cash'
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : serviceType === 'telecom'
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-[#7F00FF] hover:bg-[#6b00d6]'
                      }`}
                      title="شحن الآن"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

GamePackagesView.displayName = 'GamePackagesView';


