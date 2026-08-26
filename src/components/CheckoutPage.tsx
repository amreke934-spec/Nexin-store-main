import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Wallet,
  Phone,
  Gamepad2,
  Send,
  Mail,
  ShoppingCart,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react';
import { Product, CustomerUser, OrderItem, OrderOptions } from '../types';
import { createNewOrder } from '../services/scStoreApi';
import { saveOrderToDb } from '../services/dbApi';
import { getProductFieldMetadata, getProductServiceType } from '../utils/productUtils';
import { convertToSyp, formatSypNumber } from '../utils/currencyUtils';

interface CheckoutPageProps {
  product: Product;
  currentUser: CustomerUser | null;
  orderOptions?: OrderOptions | null;
  onBack: () => void;
  onOrderSuccess: (order: OrderItem) => void;
  onNavigateToTracking: (orderId: string) => void;
  onNavigateHome: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  product,
  currentUser,
  orderOptions,
  onBack,
  onOrderSuccess,
  onNavigateToTracking,
  onNavigateHome,
}) => {
  const [qty, setQty] = useState<number>(orderOptions?.qty || product.minQty || 1);
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<OrderItem | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const fieldMeta = getProductFieldMetadata(product);
  const serviceType = getProductServiceType(product);

  // Initialize fields on load or when product/options change
  useEffect(() => {
    setQty(orderOptions?.qty || product.minQty || 1);
    setError(null);
    setSuccessOrder(null);
    const initialFields: Record<string, string> = {};

    const fields = product.dynamicFields && product.dynamicFields.length > 0
      ? product.dynamicFields
      : [{ name: fieldMeta.primaryFieldName, label: fieldMeta.fieldLabel, placeholder: fieldMeta.inputPlaceholder, required: true }];

    if (Array.isArray(fields)) {
      fields.forEach((f: any) => {
        const fieldName = typeof f === 'string' ? f : f.name;
        const optionsVal = orderOptions?.playerId;
        const savedVal = currentUser?.savedPlayerIds?.[product.category] || '';
        initialFields[fieldName] = optionsVal || savedVal || '';
      });
    }

    if (orderOptions?.playerId) {
      initialFields[fieldMeta.primaryFieldName] = orderOptions.playerId;
      initialFields['Player_ID'] = orderOptions.playerId;
    }
    setDynamicFields(initialFields);
  }, [product, currentUser, orderOptions, fieldMeta.primaryFieldName, fieldMeta.fieldLabel, fieldMeta.inputPlaceholder]);

  const handleFieldChange = (name: string, value: string) => {
    setDynamicFields((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'phone_number' || name === 'phone' ? { mobile: value, Player_ID: value } : {}),
      ...(name === 'Player_ID' ? { player_id: value, id: value } : {}),
    }));
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate fields
    const fields = product.dynamicFields && product.dynamicFields.length > 0
      ? product.dynamicFields
      : [{ name: fieldMeta.primaryFieldName, label: fieldMeta.fieldLabel, required: true }];

    for (const f of fields) {
      const fieldName = typeof f === 'string' ? f : f.name;
      const isRequired = typeof f === 'object' ? f.required !== false : true;
      const val = dynamicFields[fieldName] || dynamicFields[fieldMeta.primaryFieldName] || dynamicFields['Player_ID'];
      if (isRequired && (!val || !val.trim())) {
        setError(`يرجى إدخال ${typeof f === 'object' ? f.label : fieldMeta.fieldLabel}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const cleanedFields = { ...dynamicFields };
      const mainVal = dynamicFields[fieldMeta.primaryFieldName] || dynamicFields['Player_ID'] || Object.values(dynamicFields)[0] || '';

      if (serviceType === 'cash' || serviceType === 'telecom') {
        cleanedFields['phone_number'] = mainVal;
        cleanedFields['mobile'] = mainVal;
        cleanedFields['Player_ID'] = mainVal;
      } else {
        cleanedFields['Player_ID'] = mainVal;
      }

      const payload = {
        productId: product.productId,
        qty: qty,
        dynamicFields: cleanedFields,
      };

      const result = await createNewOrder(payload);

      if (result.success && result.orderId) {
        const newOrder: OrderItem = {
          id: result.orderId,
          orderId: result.orderId,
          productId: product.productId,
          productName: product.name,
          category: product.category,
          qty: qty,
          price: product.price,
          total: product.price * qty,
          currency: product.currency || 'USD',
          dynamicFields: cleanedFields,
          status: 'completed',
          createdAt: new Date().toISOString(),
          customerName: currentUser?.name,
          customerEmail: currentUser?.email,
          rawResponse: result.data,
        };

        setSuccessOrder(newOrder);
        onOrderSuccess(newOrder);
        // Persist order in DB
        saveOrderToDb(newOrder, currentUser?.id).catch((e) => console.warn('Order DB persist notice:', e));
      } else {
        setError(result.error || 'فشلت عملية إنشاء الطلب، يرجى التحقق من الرصيد والبيانات المدخلة.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const totalRawPrice = product.isAmount ? product.price * qty : product.price;
  const totalSypAmount = convertToSyp(totalRawPrice, product.currency || 'USD');
  const formattedTotalPrice = `${formatSypNumber(totalSypAmount)} ل.س`;

  const renderFieldIcon = () => {
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
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* 1. Dedicated Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4 pb-1">
        <button
          id="checkout-back-btn"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold rounded-2xl transition-all border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 text-[#7F00FF] dark:text-purple-400" />
          <span>العودة لاختيار الباقات</span>
        </button>
      </div>

      {/* 2. Success Receipt Screen or Order Form */}
      {successOrder ? (
        <div className="bg-white dark:bg-[#151221] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner ring-8 ring-emerald-500/10">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {serviceType === 'cash' ? 'تم إرسال طلب تحويل الكاش بنجاح!' : 'تم إنشاء طلب الشحن بنجاح!'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {serviceType === 'cash'
                ? 'تم تسجيل طلب التحويل بنجاح وجارٍ تنفيذه آلياً وإيداع الرصيد في حسابك.'
                : 'تم استلام بيانات الشحن وجارٍ التنفيذ الآلي المباشر عبر السيرفر.'}
            </p>
          </div>

          {/* Receipt Details Card */}
          <div className="bg-slate-50 dark:bg-black/40 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 text-right space-y-3.5 text-xs sm:text-sm max-w-lg mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">رقم الطلب (Order ID):</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  #{successOrder.orderId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyOrderId(successOrder.orderId)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  title="نسخ رقم الطلب"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">المنتج / الباقة:</span>
              <span className="font-bold text-slate-900 dark:text-white">{successOrder.productName}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">بيانات الشحن المدخلة:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white dir-ltr">
                {Object.values(successOrder.dynamicFields)[0] || '-'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">المبلغ الإجمالي المدفوع:</span>
              <span className="font-mono font-black text-base text-[#7F00FF] dark:text-purple-400">
                {formatPriceSyp(successOrder.total, successOrder.currency)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => onNavigateToTracking(successOrder.orderId)}
              className="w-full sm:w-auto flex-1 bg-[#7F00FF] hover:bg-[#6b00d6] text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-[#7F00FF]/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <Clock className="w-4 h-4" />
              <span>تتبع حالة الطلب</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm"
            >
              شحن باقة أخرى
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full sm:w-auto text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold px-4 py-3 rounded-xl transition-colors cursor-pointer text-xs"
            >
              الرئيسية
            </button>
          </div>
        </div>
      ) : (
        /* Primary Data Entry Card Only (Centered & Clean) */
        <div className="bg-white dark:bg-[#151221] border border-slate-200/90 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-lg shadow-black/5 space-y-6">
          
          {/* Card Header with Product Context & Title */}
          <div className="pb-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 shrink-0 p-0.5 shadow-xs">
                <img
                  src={product.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60'}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 rounded-md border border-purple-200/60 dark:border-purple-800/60">
                    {product.category}
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {product.name}
                  </span>
                </div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  {renderFieldIcon()}
                  <span>{fieldMeta.sectionTitle || 'بيانات الشحن ومعرف اللاعب'}</span>
                </h1>
              </div>
            </div>

            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#7F00FF] dark:text-purple-400" />
            </div>
          </div>

          <form onSubmit={handleOrderSubmit} className="space-y-5">
            {/* Dynamic / Domain Fields */}
            <div className="space-y-4">
              {product.dynamicFields && product.dynamicFields.length > 0 ? (
                product.dynamicFields.map((field: any, index: number) => {
                  const fieldName = typeof field === 'string' ? field : field.name;
                  const fieldLabel = typeof field === 'object' ? field.label : fieldName;
                  const fieldPlaceholder = typeof field === 'object' ? field.placeholder : `أدخل ${fieldLabel}`;
                  const isRequired = typeof field === 'object' ? field.required !== false : true;

                  return (
                    <div key={index} className="space-y-1.5 text-right">
                      <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {fieldLabel} {isRequired && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={serviceType === 'cash' || serviceType === 'telecom' ? 'tel' : 'text'}
                          id={`dynamic-field-${fieldName}`}
                          required={isRequired}
                          placeholder={fieldPlaceholder}
                          value={dynamicFields[fieldName] || ''}
                          dir="ltr"
                          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                          className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#1D192E] focus:outline-none focus:border-[#7F00FF] focus:ring-4 focus:ring-[#7F00FF]/15 font-mono transition-all text-right shadow-xs"
                        />
                        <div className="absolute right-4 top-4 pointer-events-none text-slate-400">
                          {renderFieldIcon()}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Default Primary Field (Player ID / Mobile) */
                <div className="space-y-1.5 text-right">
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {fieldMeta.fieldLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={serviceType === 'cash' || serviceType === 'telecom' ? 'tel' : 'text'}
                      id="checkout-player-id-input"
                      required
                      placeholder={fieldMeta.inputPlaceholder}
                      value={dynamicFields[fieldMeta.primaryFieldName] || dynamicFields['Player_ID'] || ''}
                      dir="ltr"
                      onChange={(e) => handleFieldChange(fieldMeta.primaryFieldName, e.target.value)}
                      className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#1D192E] focus:outline-none focus:border-[#7F00FF] focus:ring-4 focus:ring-[#7F00FF]/15 font-mono transition-all text-right shadow-xs"
                    />
                    <div className="absolute right-4 top-4 pointer-events-none text-slate-400">
                      {renderFieldIcon()}
                    </div>
                  </div>
                  {fieldMeta.helperText && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5">
                      <Info className="w-3.5 h-3.5 text-[#7F00FF] shrink-0" />
                      <span>{fieldMeta.helperText}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Quantity selector if isAmount */}
              {product.isAmount && (
                <div className="space-y-1.5 text-right pt-1">
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    الكمية المطلوبة (الحد الأدنى: {product.minQty || 1})
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQty((prev) => Math.max(product.minQty || 1, prev - 1))}
                      className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-lg flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={product.minQty || 1}
                      max={product.maxQty || 10000}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white text-center focus:bg-white dark:focus:bg-[#1D192E] focus:outline-none focus:border-[#7F00FF] focus:ring-4 focus:ring-[#7F00FF]/15 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setQty((prev) => prev + 1)}
                      className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-lg flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs sm:text-sm p-4 rounded-2xl flex items-center gap-2.5 animate-in shake">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Prominent Recharge Button with Total Price */}
            <div className="pt-2 space-y-3">
              <button
                id="checkout-submit-recharge-btn"
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 text-white font-black text-sm sm:text-base py-4 px-6 rounded-2xl transition-all shadow-xl active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  serviceType === 'cash'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                    : 'bg-[#7F00FF] hover:bg-[#6b00d6] shadow-[#7F00FF]/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ إرسال وتأكيد الطلب...</span>
                  </>
                ) : (
                  <>
                    {serviceType === 'cash' ? <Wallet className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                    <span>
                      {serviceType === 'cash' ? 'تأكيد تحويل الكاش' : 'شحن الآن'} ({formattedTotalPrice})
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>شحن رسمي 100% موثق فوراً مع إمكانية التتبع المباشر</span>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// Helper for formatting SYP in success receipt
function formatPriceSyp(amount: number, currency: string = 'USD') {
  const syp = convertToSyp(amount, currency);
  return `${formatSypNumber(syp)} ل.س`;
}

