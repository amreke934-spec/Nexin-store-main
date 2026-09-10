import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Wallet,
  Phone,
  Gamepad2,
  Send,
  Mail,
  CreditCard,
} from 'lucide-react';
import { Product, CustomerUser, OrderItem, DynamicFieldConfig, OrderOptions } from '../types';
import { createNewOrder } from '../services/scStoreApi';
import { saveOrderToDb } from '../services/dbApi';
import { getProductFieldMetadata, getProductServiceType } from '../utils/productUtils';
import { convertToSyp, formatSypNumber, formatPriceSyp } from '../utils/currencyUtils';
import { normalizeSyrianPhoneNumber, detectSyrianNetwork } from '../utils/searchUtils';

interface OrderModalProps {
  isOpen: boolean;
  product: Product | null;
  currentUser: CustomerUser | null;
  orderOptions?: OrderOptions | null;
  onClose: () => void;
  onOrderSuccess: (order: OrderItem) => void;
  onNavigateToTracking: (orderId: string) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  product,
  currentUser,
  orderOptions,
  onClose,
  onOrderSuccess,
  onNavigateToTracking,
}) => {
  const [qty, setQty] = useState<number>(1);
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<OrderItem | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const fieldMeta = getProductFieldMetadata(product);
  const serviceType = getProductServiceType(product);

  // Initialize fields whenever product changes
  useEffect(() => {
    if (product) {
      setQty(orderOptions?.qty || 1);
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
    }
  }, [product, currentUser, orderOptions, fieldMeta.primaryFieldName, fieldMeta.fieldLabel, fieldMeta.inputPlaceholder]);

  if (!isOpen || !product) return null;

  const handleFieldChange = (name: string, value: string) => {
    setDynamicFields((prev) => ({
      ...prev,
      [name]: value,
      // If setting a phone number or id, synchronize to common aliases so the backend API receives it regardless of key
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
      // Ensure the primary field is populated in dynamicFields
      const cleanedFields = { ...dynamicFields };
      const mainVal = dynamicFields[fieldMeta.primaryFieldName] || dynamicFields['phone_number'] || dynamicFields['wallet'] || dynamicFields['Player_ID'] || Object.values(dynamicFields)[0] || '';
      
      if (serviceType === 'cash' || serviceType === 'telecom') {
        const normPhone = normalizeSyrianPhoneNumber(mainVal);
        cleanedFields['phone_number'] = normPhone;
        cleanedFields['mobile'] = normPhone;
        cleanedFields['wallet'] = normPhone;
        cleanedFields['Player_ID'] = normPhone;
      } else {
        cleanedFields['Player_ID'] = mainVal;
      }

      let payload: any;
      if (product.isCash || product.sectionKey === 'cashbalances' || (product as any).cashType) {
        const resolvedType = String((product as any).cashType || '').toLowerCase();
        const normalizedCashType = (resolvedType.includes('mtn') || product.name?.toLowerCase().includes('mtn'))
          ? 'mtn_cash'
          : 'syriatel_cash';

        const cashAmount = Number(cleanedFields['amount'] || qty || product.price);
        const cashWallet = cleanedFields['wallet'] || cleanedFields['phone_number'] || cleanedFields['Player_ID'] || '';

        payload = {
          cashType: normalizedCashType,
          amount: cashAmount,
          wallet: cashWallet,
          dynamicFields: cleanedFields,
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          customerName: currentUser?.name,
          productName: product.name,
          category: product.category,
          price: cashAmount,
          currency: product.currency || 'SYP',
        };
      } else {
        payload = {
          productId: product.productId,
          qty: qty,
          dynamicFields: cleanedFields,
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          customerName: currentUser?.name,
          productName: product.name,
          category: product.category,
          price: product.price,
          currency: product.currency || 'USD',
        };
      }

      const result = await createNewOrder(payload);

      if (result.success && result.orderId) {
        const rawStatus = (result.data?.order?.status || result.data?.status || 'processing').toLowerCase();
        const initialStatus = rawStatus.includes('complete') ? 'completed' : 'processing';

        const newOrder: OrderItem = {
          id: result.orderId,
          orderId: result.orderId,
          productId: product.productId,
          productName: product.name,
          category: product.category,
          qty: qty,
          price: product.price,
          total: product.price * qty,
          currency: product.currency || 'SYP',
          dynamicFields: cleanedFields,
          status: initialStatus,
          createdAt: new Date().toISOString(),
          customerName: currentUser?.name,
          customerEmail: currentUser?.email,
          rawResponse: result.data,
        };

        setSuccessOrder(newOrder);
        onOrderSuccess(newOrder);
        // Persist order in Neon PostgreSQL database
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

  const isCashProduct = Boolean(product.isCash || product.sectionKey === 'cashbalances' || (product as any).cashType);
  const enteredCashAmount = Number(dynamicFields['amount'] || qty || product.price);
  const totalRawPrice = isCashProduct ? enteredCashAmount : product.price * qty;
  const totalSypAmount = convertToSyp(totalRawPrice, product.currency || 'USD');
  const formattedTotalPrice = `${formatSypNumber(totalSypAmount)} ل.س`;

  // Network operator mismatch check
  const enteredPhone = dynamicFields['phone_number'] || dynamicFields['wallet'] || dynamicFields[fieldMeta.primaryFieldName] || dynamicFields['Player_ID'] || '';
  const detectedNet = detectSyrianNetwork(enteredPhone);
  const isSyriatelService = product.sectionKey === 'syriatel' || product.category?.includes('سيريتل') || (product as any).cashType === 'syriatel_cash' || product.name?.includes('سيريتل');
  const isMtnService = product.sectionKey === 'mtn' || product.category?.includes('MTN') || (product as any).cashType === 'mtn_cash' || product.name?.toLowerCase().includes('mtn');

  const networkMismatchNotice = (() => {
    if (detectedNet === 'mtn' && isSyriatelService) {
      return 'تنبيه: الرقم المدخل يبدو تابعاً لشبكة MTN، بينما الخدمة المحددة هي سيريتل. يرجى التأكد لتجنب فشل الشحن.';
    }
    if (detectedNet === 'syriatel' && isMtnService) {
      return 'تنبيه: الرقم المدخل يبدو تابعاً لشبكة سيريتل، بينما الخدمة المحددة هي MTN. يرجى التأكد لتجنب فشل الشحن.';
    }
    return null;
  })();

  // Render correct icon based on domain
  const renderFieldIcon = () => {
    switch (fieldMeta.iconType) {
      case 'wallet':
        return <Wallet className="w-4 h-4 text-emerald-500" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-blue-500" />;
      case 'send':
        return <Send className="w-4 h-4 text-sky-400" />;
      case 'mail':
        return <Mail className="w-4 h-4 text-amber-400" />;
      case 'gamepad':
      default:
        return <Gamepad2 className="w-4 h-4 text-[#7F00FF] dark:text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#151221] rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-colors">
        {/* Header accent */}
        <div className={`h-2 shrink-0 ${serviceType === 'cash' ? 'bg-emerald-500' : 'bg-[#7F00FF]'}`} />

        {/* Content Container */}
        <div className="p-5 sm:p-8 overflow-y-auto">
          {/* Top Bar with Back Button & Close */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للمتجر</span>
            </button>

            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
              إتمام الطلب والدفع الفوري
            </span>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>

          {successOrder ? (
            /* Success Receipt Screen */
            <div className="text-center py-2 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#1A1A1A] dark:text-white">
                  {serviceType === 'cash' ? 'تم إرسال طلب تحويل الكاش بنجاح!' : 'تم إنشاء طلب الشحن بنجاح!'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {serviceType === 'cash'
                    ? 'تم توجيه طلب التحويل المالي إلى SC Store وجارٍ التنفيذ المباشر.'
                    : 'تم إرسال الطلب إلى SC Store وجارٍ التنفيذ الآلي فوراً.'}
                </p>
              </div>

              {/* Order Details Card */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200/80 dark:border-white/10 text-right space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-gray-400">رقم الطلب (Order ID):</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[#7F00FF] dark:text-purple-400">
                    <span>{successOrder.orderId}</span>
                    <button
                      onClick={() => handleCopyOrderId(successOrder.orderId)}
                      className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded text-gray-500 dark:text-gray-400 hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer"
                      title="نسخ رقم الطلب"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">الخدمة / المنتج:</span>
                  <span className="font-bold text-[#1A1A1A] dark:text-white">{successOrder.productName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">الكمية:</span>
                  <span className="font-bold text-[#1A1A1A] dark:text-white">{successOrder.qty}</span>
                </div>

                {/* Display clean dynamic field (hide internal technical aliases) */}
                {Object.entries(successOrder.dynamicFields)
                  .filter(([k]) => k !== 'mobile' && (k !== 'Player_ID' || serviceType === 'game'))
                  .map(([key, val]) => {
                    const displayKey =
                      key === 'phone_number' || key === 'phone'
                        ? 'رقم هاتف المحفظة'
                        : key === 'Player_ID'
                        ? 'معرف اللاعب (ID)'
                        : key === 'username'
                        ? 'معرف الحساب'
                        : key === 'email_or_account'
                        ? 'البريد / الحساب'
                        : key;
                    return (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{displayKey}:</span>
                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{String(val)}</span>
                      </div>
                    );
                  })}

                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-white/10 text-sm">
                  <span className="font-bold text-[#1A1A1A] dark:text-white">المبلغ الإجمالي:</span>
                  <span className="font-black text-[#7F00FF] dark:text-purple-400 font-mono">
                    {formatPriceSyp(successOrder.total, successOrder.currency)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  id="track-order-now-btn"
                  onClick={() => {
                    onClose();
                    onNavigateToTracking(successOrder.orderId);
                  }}
                  className="w-full bg-[#7F00FF] hover:bg-[#6b00d6] text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#7F00FF]/25 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span>تتبع حالة هذا الطلب الآن</span>
                </button>

                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  العودة لتصفح الخدمات
                </button>
              </div>
            </div>
          ) : (
            /* Dedicated Service Form */
            <form onSubmit={handleOrderSubmit} className="space-y-5">
              {/* Product Preview Header */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100 dark:border-white/10">
                <img
                  src={product.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-gray-200 dark:border-white/10 shrink-0 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        serviceType === 'cash'
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/40'
                          : 'text-[#7F00FF] dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-800/40'
                      }`}
                    >
                      {product.category}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                      #{product.productId}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-[#1A1A1A] dark:text-white leading-snug truncate">
                    {product.name}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <span>سعر الوحدة:</span>
                    <strong className="font-mono text-[#7F00FF] dark:text-purple-300 font-bold">
                      {formatPriceSyp(product.price, product.currency)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Dedicated Domain Form Inputs (Phone Number vs Player ID vs Email) */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                    {renderFieldIcon()}
                    <span>{fieldMeta.sectionTitle}:</span>
                  </label>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      serviceType === 'cash'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                        : 'bg-purple-50 text-[#7F00FF] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40'
                    }`}
                  >
                    {fieldMeta.badgeText}
                  </span>
                </div>

                {Array.isArray(product.dynamicFields) && product.dynamicFields.length > 0 ? (
                  product.dynamicFields.map((field: any, idx) => {
                    const fieldName = typeof field === 'string' ? field : field.name;
                    const fieldLabel = typeof field === 'object' && field.label ? field.label : fieldMeta.fieldLabel;
                    const placeholder = typeof field === 'object' && field.placeholder ? field.placeholder : fieldMeta.inputPlaceholder;
                    const helper = typeof field === 'object' && field.helperText ? field.helperText : fieldMeta.helperText;

                    return (
                      <div key={fieldName || idx} className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {fieldLabel} <span className="text-red-500">*</span>
                        </label>
                        {field.options && Array.isArray(field.options) && field.options.length > 0 ? (
                          <select
                            id={`input-dynamic-${fieldName}`}
                            required
                            value={dynamicFields[fieldName] || ''}
                            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-[#1A1A1A] dark:text-white font-medium focus:outline-none focus:border-[#7F00FF] dark:focus:border-purple-500 focus:bg-white dark:focus:bg-white/10 transition-all text-right cursor-pointer"
                          >
                            <option value="" className="text-gray-400 dark:bg-[#1A1A1A]">
                              -- اختر {fieldLabel} --
                            </option>
                            {field.options.map((opt: string) => (
                              <option key={opt} value={opt} className="text-gray-900 dark:text-white dark:bg-[#1A1A1A]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`input-dynamic-${fieldName}`}
                            type={serviceType === 'cash' || serviceType === 'telecom' ? 'tel' : 'text'}
                            required
                            value={dynamicFields[fieldName] || ''}
                            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                            placeholder={placeholder}
                            dir="ltr"
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-[#1A1A1A] dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#7F00FF] dark:focus:border-purple-500 focus:bg-white dark:focus:bg-white/10 transition-all text-right"
                          />
                        )}
                        {helper && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{helper}</span>
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {fieldMeta.fieldLabel} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`input-dynamic-${fieldMeta.primaryFieldName}`}
                      type={serviceType === 'cash' || serviceType === 'telecom' ? 'tel' : 'text'}
                      required
                      value={dynamicFields[fieldMeta.primaryFieldName] || dynamicFields['Player_ID'] || ''}
                      onChange={(e) => handleFieldChange(fieldMeta.primaryFieldName, e.target.value)}
                      placeholder={fieldMeta.inputPlaceholder}
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-[#1A1A1A] dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#7F00FF] dark:focus:border-purple-500 focus:bg-white dark:focus:bg-white/10 transition-all text-right"
                    />
                    {fieldMeta.helperText && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{fieldMeta.helperText}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Network Operator Mismatch Warning */}
              {networkMismatchNotice && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{networkMismatchNotice}</span>
                </div>
              )}

              {/* Quantity / Amount Selector (Only for non-cash products) */}
              {!isCashProduct && (
                <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-200/80 dark:border-white/10">
                  <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                    عدد مرات الشحن (الكمية):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 border border-gray-300 dark:border-white/10 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/20 active:scale-95 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-[#1A1A1A] dark:text-white font-mono">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(10, q + 1))}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 border border-gray-300 dark:border-white/10 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/20 active:scale-95 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Customer Info Reminder */}
              {currentUser && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-purple-50/60 dark:bg-purple-950/30 p-2.5 rounded-xl flex items-center justify-between border border-purple-100 dark:border-purple-800/30">
                  <span>
                    العميل الحالي: <strong className="text-gray-700 dark:text-gray-200">{currentUser.name}</strong>
                  </span>
                  <span className="text-[#7F00FF] dark:text-purple-300 font-medium">{currentUser.email}</span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Total & Submit */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">الإجمالي المستحق:</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#7F00FF] dark:text-purple-400 font-mono">{formattedTotalPrice}</span>
                  </div>
                </div>

                <button
                  id="confirm-order-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full text-white font-bold py-3.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer ${
                    serviceType === 'cash'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                      : 'bg-[#7F00FF] hover:bg-[#6b00d6] shadow-[#7F00FF]/25'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ إرسال الطلب وتنفيذه عبر SC Store...</span>
                    </>
                  ) : (
                    <>
                      {renderFieldIcon()}
                      <span>{fieldMeta.submitButtonText}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>تنفيذ آمن ومعالجة مباشرة عبر الـ API الرسمي</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
