import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Zap, 
  Check, 
  ShoppingCart, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  Layers,
  ChevronLeft,
  Info,
  Wallet,
  Phone,
  Send,
  Mail,
  Gamepad2,
  Gift,
  CreditCard,
  Lock,
} from 'lucide-react';
import { Product } from '../../types';
import { getProductFieldMetadata, getProductServiceType } from '../../utils/productUtils';
import { extractGiftCardDetails } from '../../utils/giftCardUtils';
import { convertToSyp, formatSypNumber, getProductDisplayPrice } from '../../utils/currencyUtils';

interface GamePackagesViewProps {
  gameName: string;
  categoryName: string;
  packages: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product, options?: { playerId?: string; qty?: number }) => void;
}

export const GamePackagesView: React.FC<GamePackagesViewProps> = ({
  gameName,
  categoryName,
  packages,
  onBack,
  onSelectProduct,
}) => {
  // Select the first package by default or user selection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    packages[0] || null
  );
  const [playerId, setPlayerId] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Compute field metadata based on the current product
  const activeProduct = selectedProduct || packages[0];
  const fieldMeta = getProductFieldMetadata(activeProduct);
  const serviceType = getProductServiceType(activeProduct);

  // When packages change, update default selection
  useEffect(() => {
    if (packages.length > 0 && !selectedProduct) {
      setSelectedProduct(packages[0]);
    }
  }, [packages, selectedProduct]);

  // Reset quantity when product changes
  useEffect(() => {
    if (selectedProduct) {
      setQty(selectedProduct.minQty || 1);
      setValidationError(null);
    }
  }, [selectedProduct]);

  const handlePackageClick = (pkg: Product) => {
    setSelectedProduct(pkg);
    setValidationError(null);
  };

  const handleDirectRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedProduct) {
      setValidationError('يرجى اختيار باقة أولاً');
      return;
    }

    if (!playerId.trim()) {
      setValidationError(`يرجى إدخال ${fieldMeta.fieldLabel}`);
      return;
    }

    // Call onSelectProduct to verify authentication and complete direct recharge
    onSelectProduct(selectedProduct, {
      playerId: playerId.trim(),
      qty: qty || 1,
    });
  };

  const mainImage =
    packages[0]?.image ||
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';

  const formatPrice = (price: number, currency: string = 'USD') => {
    const syp = convertToSyp(price, currency);
    return `${formatSypNumber(syp)} ل.س`;
  };

  const totalRawPrice = selectedProduct
    ? selectedProduct.isAmount
      ? selectedProduct.price * qty
      : selectedProduct.price
    : 0;

  const totalSypAmount = selectedProduct
    ? convertToSyp(totalRawPrice, selectedProduct.currency || 'USD')
    : 0;

  const formattedTotalPrice = `${formatSypNumber(totalSypAmount)} ل.س`;

  const renderDomainIcon = () => {
    switch (fieldMeta.iconType) {
      case 'wallet':
        return <Wallet className="w-5 h-5 text-emerald-500" />;
      case 'phone':
        return <Phone className="w-5 h-5 text-blue-500" />;
      case 'send':
        return <Send className="w-5 h-5 text-sky-400" />;
      case 'mail':
        return <Mail className="w-5 h-5 text-amber-400" />;
      case 'gamepad':
      default:
        return <Gamepad2 className="w-5 h-5 text-[#7F00FF] dark:text-purple-400" />;
    }
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
                    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';
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
                    serviceType === 'cash' ? 'text-emerald-400' : 'text-purple-300'
                  }`}
                >
                  {serviceType === 'cash' ? (
                    <Wallet className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Zap className="w-3 h-3 fill-purple-400" />
                  )}
                  {fieldMeta.badgeText}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                {gameName}
              </h1>

              <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                {serviceType === 'cash'
                  ? 'اختر باقة الكاش ثم أدخل رقم الهاتف المحمول المرتبط بالمحفظة لإتمام التحويل المباشر'
                  : 'اختر الباقة المناسبة ثم أدخل البيانات المطلوبة لتنفيذ الخدمة الفورية'}
              </p>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold rounded-xl transition-all border border-white/10 cursor-pointer shrink-0 self-start sm:self-center"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للخدمات</span>
          </button>
        </div>
      </div>

      {/* 2. Packages Selection Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <span
              className={`w-2 h-4 rounded-full inline-block ${
                serviceType === 'cash' ? 'bg-emerald-500' : 'bg-[#7F00FF]'
              }`}
            />
            <span>اختر الباقة المطلوبة ({packages.length} متوفرة)</span>
          </h2>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium hidden sm:inline-block">
            انقر على أي باقة لتحديدها
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {packages.map((pkg) => {
            const isSelected = selectedProduct?.id === pkg.id;
            const giftDetails = extractGiftCardDetails(pkg, gameName);

            return (
              <div
                key={pkg.id}
                onClick={() => handlePackageClick(pkg)}
                className={`relative overflow-hidden rounded-3xl p-4 sm:p-4.5 cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[165px] sm:min-h-[175px] active:scale-[0.98] select-none text-white ${
                  isSelected
                    ? serviceType === 'cash'
                      ? 'bg-gradient-to-br from-[#0c3826] via-[#08261a] to-[#04140e] border-2 border-emerald-400 ring-4 ring-emerald-500/30 shadow-xl shadow-emerald-950/50'
                      : 'bg-gradient-to-br from-[#0f2c63] via-[#0b2047] to-[#050f24] border-2 border-sky-400 ring-4 ring-sky-500/30 shadow-xl shadow-sky-950/50'
                    : serviceType === 'cash'
                    ? 'bg-gradient-to-br from-[#082419] via-[#051810] to-[#020b08] border border-emerald-900/50 hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-950/30'
                    : 'bg-gradient-to-br from-[#0d1c3e] via-[#09152f] to-[#040a17] border border-sky-900/40 hover:border-sky-400/60 hover:shadow-lg hover:shadow-sky-950/30'
                }`}
              >
                {/* Decorative Subtle Background Circuit / Hologram Overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full border-4 border-white/20" />
                  <div className="absolute right-12 -top-8 w-24 h-24 rounded-full border-2 border-white/15" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                </div>

                {/* Top Row: Game Logo & Title + Radio Selection Button */}
                <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
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
                            'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60';
                        }}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-black text-white block tracking-tight truncate">
                        {gameName}
                      </span>
                      <span className="text-[9px] font-bold text-sky-300/90 dark:text-sky-300 block">
                        {giftDetails.badgeLabel}
                      </span>
                    </div>
                  </div>

                  {/* Radio Indicator & ID */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[9px] text-slate-300 bg-black/50 px-2 py-0.5 rounded-lg border border-white/10">
                      #{pkg.productId}
                    </span>

                    {/* Radio Button */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? serviceType === 'cash'
                            ? 'bg-emerald-400 text-slate-950 shadow-md ring-2 ring-white scale-105'
                            : 'bg-sky-400 text-slate-950 shadow-md ring-2 ring-white scale-105'
                          : 'border-2 border-white/30 bg-black/30'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3.5]" />}
                    </div>
                  </div>
                </div>

                {/* Center Hero: Token Amount / VIP / Denomination */}
                <div className="relative z-10 my-2">
                  <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight drop-shadow-sm line-clamp-1">
                    {giftDetails.tokenAmount}
                  </div>
                  <p className="text-[11px] text-slate-300/90 line-clamp-1 mt-0.5 font-medium">
                    {pkg.name}
                  </p>
                </div>

                {/* Bottom Row: Instant Delivery Tag & Prominent USD Price */}
                <div className="relative z-10 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1 text-[10px] text-slate-300">
                    {serviceType === 'cash' ? (
                      <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 shrink-0" />
                    )}
                    <span className="truncate">
                      {serviceType === 'cash' ? 'تحويل فوري ومباشر' : 'تسليم فوري بالـ ID'}
                    </span>
                  </div>

                  {/* Price Tag in Syrian Pounds */}
                  <div
                    className={`px-3 py-1 rounded-xl font-mono font-black text-xs sm:text-sm shrink-0 transition-colors shadow-xs ${
                      isSelected
                        ? serviceType === 'cash'
                          ? 'bg-emerald-400 text-slate-950 font-bold'
                          : 'bg-sky-400 text-slate-950 font-bold'
                        : 'bg-white/15 text-white border border-white/20'
                    }`}
                  >
                    {formatPrice(pkg.price, pkg.currency || 'USD')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Bottom Dedicated Section for Domain Field (Cash Phone / Player ID) */}
      {selectedProduct && (
        <div className="bg-white dark:bg-[#151221] border border-gray-200/90 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-lg shadow-black/5 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-white flex items-center gap-2">
                {renderDomainIcon()}
                <span>{fieldMeta.sectionTitle}</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {fieldMeta.sectionSubtitle}
              </p>
            </div>

            {/* Selected Package Capsule */}
            <div
              className={`border px-3.5 py-1.5 rounded-2xl text-left hidden sm:block ${
                serviceType === 'cash'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-800/50'
                  : 'bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-800/50'
              }`}
            >
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block">الباقة المحددة</span>
              <span
                className={`text-xs font-black line-clamp-1 ${
                  serviceType === 'cash'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-[#7F00FF] dark:text-purple-300'
                }`}
              >
                {selectedProduct.name}
              </span>
            </div>
          </div>

          <form onSubmit={handleDirectRecharge} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dedicated Domain input field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white">
                  {fieldMeta.fieldLabel} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="player-id-input"
                    type={serviceType === 'cash' || serviceType === 'telecom' ? 'tel' : 'text'}
                    required
                    placeholder={fieldMeta.inputPlaceholder}
                    value={playerId}
                    dir="ltr"
                    onChange={(e) => {
                      setPlayerId(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full pl-4 pr-11 py-3 bg-gray-50/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-[#1A1A1A] dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-[#1D192E] focus:outline-none focus:border-[#7F00FF] focus:ring-4 focus:ring-[#7F00FF]/10 font-mono transition-all text-right"
                  />
                  <div className="absolute right-4 top-3.5 pointer-events-none text-gray-400">
                    {fieldMeta.iconType === 'wallet' ? (
                      <Wallet className="w-4 h-4 text-emerald-500" />
                    ) : fieldMeta.iconType === 'phone' ? (
                      <Phone className="w-4 h-4 text-blue-500" />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                {fieldMeta.helperText && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-[#7F00FF] shrink-0" />
                    <span>{fieldMeta.helperText}</span>
                  </p>
                )}
              </div>

              {/* Quantity selector if isAmount product */}
              {selectedProduct.isAmount ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white">
                    الكمية المطلوبة (الحد الأدنى: {selectedProduct.minQty || 1})
                  </label>
                  <input
                    type="number"
                    min={selectedProduct.minQty || 1}
                    max={selectedProduct.maxQty || 10000}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-4 py-3 bg-gray-50/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-[#1A1A1A] dark:text-white focus:bg-white dark:focus:bg-[#1D192E] focus:outline-none focus:border-[#7F00FF] focus:ring-4 focus:ring-[#7F00FF]/10 font-mono transition-all"
                  />
                </div>
              ) : (
                /* Order Summary Capsule on desktop */
                <div className="bg-gray-50 dark:bg-black/30 rounded-2xl p-3.5 border border-gray-100 dark:border-white/5 flex flex-col justify-center">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                    <span>الباقة المختارة:</span>
                    <span className="font-bold text-[#1A1A1A] dark:text-white">{selectedProduct.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                    <span>الإجمالي المستحق:</span>
                    <span
                      className={`text-base font-black font-mono ${
                        serviceType === 'cash'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[#7F00FF] dark:text-purple-300'
                      }`}
                    >
                      {formattedTotalPrice}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Validation error message */}
            {validationError && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Fixed / Prominent Submit Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>
                  {serviceType === 'cash'
                    ? 'تنفيذ آمن ومباشر لتحويل الكاش'
                    : 'ضمان شحن رسمي وتوثيق فوري للطلب'}
                </span>
              </div>

              <button
                id="submit-recharge-btn"
                type="submit"
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-black text-sm px-8 py-3.5 rounded-2xl transition-all shadow-lg active:scale-98 cursor-pointer ${
                  serviceType === 'cash'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                    : 'bg-[#7F00FF] hover:bg-[#6b00d6] shadow-[#7F00FF]/25'
                }`}
              >
                {serviceType === 'cash' ? <Wallet className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                <span>
                  {serviceType === 'cash' ? 'تأكيد تحويل الكاش' : 'شحن الآن'} ({formattedTotalPrice})
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
