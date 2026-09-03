import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Wallet,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Coins,
  DollarSign,
  ArrowLeft,
  Info,
  RefreshCw,
} from 'lucide-react';
import { CustomerUser, DepositMethod, DepositRequest } from '../types';
import { fetchDepositMethods, submitDepositRequest, fetchDepositRequests } from '../services/dbApi';
import { formatSypNumber } from '../utils/currencyUtils';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CustomerUser;
  onSuccess?: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}) => {
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState<boolean>(true);
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(null);

  // Form State
  const [amountInput, setAmountInput] = useState<string>('');
  const [txNumberInput, setTxNumberInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<DepositRequest | null>(null);

  // User's past requests
  const [activeTab, setActiveTab] = useState<'deposit' | 'history'>('deposit');
  const [userRequests, setUserRequests] = useState<DepositRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);

  // Copy state
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Load methods on open
  useEffect(() => {
    if (isOpen) {
      loadMethods();
      if (currentUser?.id) {
        loadUserRequests();
      }
    } else {
      // Reset state on close
      setSelectedMethod(null);
      setAmountInput('');
      setTxNumberInput('');
      setNotesInput('');
      setSubmitError(null);
      setSubmitSuccess(null);
      setActiveTab('deposit');
    }
  }, [isOpen, currentUser?.id]);

  const loadMethods = async () => {
    setIsLoadingMethods(true);
    try {
      const data = await fetchDepositMethods();
      setMethods(data.filter((m) => m.isActive !== false));
    } catch (err) {
      console.error('Error loading deposit methods:', err);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const loadUserRequests = async () => {
    if (!currentUser?.id) return;
    setIsLoadingRequests(true);
    try {
      const reqs = await fetchDepositRequests(currentUser.id);
      setUserRequests(reqs);
    } catch (err) {
      console.error('Error loading user deposit requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleCopyAddress = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Calculations
  const calculations = useMemo(() => {
    if (!selectedMethod || !amountInput) {
      return {
        amount: 0,
        feeAmount: 0,
        netAmount: 0,
        sypAmount: 0,
        isValid: false,
        error: null,
      };
    }

    const num = parseFloat(amountInput);
    if (isNaN(num) || num <= 0) {
      return {
        amount: 0,
        feeAmount: 0,
        netAmount: 0,
        sypAmount: 0,
        isValid: false,
        error: 'يرجى إدخال مبلغ صحيح',
      };
    }

    if (selectedMethod.minDeposit !== undefined && num < Number(selectedMethod.minDeposit)) {
      return {
        amount: num,
        feeAmount: 0,
        netAmount: 0,
        sypAmount: 0,
        isValid: false,
        error: `أقل مبلغ يمكن إيداعه هو ${formatSypNumber(selectedMethod.minDeposit)} ${selectedMethod.currency}`,
      };
    }

    if (selectedMethod.maxDeposit !== undefined && num > Number(selectedMethod.maxDeposit)) {
      return {
        amount: num,
        feeAmount: 0,
        netAmount: 0,
        sypAmount: 0,
        isValid: false,
        error: `أقصى مبلغ يمكن إيداعه هو ${formatSypNumber(selectedMethod.maxDeposit)} ${selectedMethod.currency}`,
      };
    }

    const feePct = selectedMethod.feeEnabled ? (Number(selectedMethod.feePercentage) || 0) : 0;
    const feeAmount = (num * feePct) / 100;
    const netAmount = Math.max(0, num - feeAmount);
    const rate = Number(selectedMethod.exchangeRateToSyp) || 1;
    const sypAmount = Math.round(netAmount * rate);

    return {
      amount: num,
      feeAmount,
      netAmount,
      sypAmount,
      isValid: true,
      error: null,
    };
  }, [selectedMethod, amountInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    if (!calculations.isValid) {
      setSubmitError(calculations.error || 'يرجى تصحيح المبلغ المدخل');
      return;
    }

    if (!txNumberInput.trim()) {
      setSubmitError('يرجى إدخال رقم العملية (إشعار التحويل / TXID)');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await submitDepositRequest({
        userId: currentUser.id,
        methodId: selectedMethod.id,
        amount: calculations.amount,
        txNumber: txNumberInput.trim(),
        notes: notesInput.trim(),
      });

      if (res.success && res.request) {
        setSubmitSuccess(res.request);
        loadUserRequests();
        if (onSuccess) onSuccess();
      } else {
        setSubmitError(res.error || 'فشل إرسال طلب الإيداع');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#12101e] border border-purple-200/80 dark:border-purple-900/40 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-900 dark:text-white my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-700 via-[#7F00FF] to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs shrink-0 shadow-xs">
              <Wallet className="w-5 h-5 text-purple-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">إيداع وشحن الرصيد</h2>
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/20">
                  فوري وموثق
                </span>
              </div>
              <p className="text-xs text-purple-100/80">
                اختر طريقة الدفع المناسبة وأدخل تفاصيل الإيداع لإضافة الرصيد إلى محفظتك
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Top Tabs (إيداع جديد / سجل طلباتي) */}
        <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 px-4 sm:px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('deposit');
              setSubmitSuccess(null);
            }}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'deposit'
                ? 'border-[#7F00FF] text-[#7F00FF] dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>طلب إيداع جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              loadUserRequests();
            }}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-[#7F00FF] text-[#7F00FF] dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل طلباتي</span>
            {userRequests.length > 0 && (
              <span className="bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                {userRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* 3. Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'deposit' ? (
            submitSuccess ? (
              /* Success Screen */
              <div className="text-center py-6 px-4 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    تم إرسال طلب الإيداع بنجاح!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    تم تسجيل طلبك برقم <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300">{submitSuccess.id}</span> وسيقوم فريق الإدارة بمطابقة رقم العملية وتغذية رصيدك في أقرب وقت.
                  </p>
                </div>

                {/* Request Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-right space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                    <span className="text-slate-500">طريقة الإيداع:</span>
                    <span className="font-bold">{submitSuccess.methodName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                    <span className="text-slate-500">المبلغ المدخل:</span>
                    <span className="font-bold font-mono">{formatSypNumber(submitSuccess.amount)} {submitSuccess.currency}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                    <span className="text-slate-500">المبلغ المضاف للرصيد:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {formatSypNumber(submitSuccess.sypAmount)} ل.س
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">رقم العملية / الإشعار:</span>
                    <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300">{submitSuccess.txNumber}</span>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitSuccess(null);
                      setSelectedMethod(null);
                      setAmountInput('');
                      setTxNumberInput('');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#7F00FF] dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    إجراء إيداع آخر
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#7F00FF] text-white font-bold text-xs hover:bg-[#6e00dd] transition-colors cursor-pointer shadow-md shadow-[#7F00FF]/25"
                  >
                    عرض سجل طلباتي
                  </button>
                </div>
              </div>
            ) : !selectedMethod ? (
              /* Step 1: Select Deposit Method */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    طرق الإيداع المتوفرة:
                  </span>
                  <span className="text-[11px] text-[#7F00FF] dark:text-purple-400 font-medium">
                    اختر الطريقة للمتابعة
                  </span>
                </div>

                {isLoadingMethods ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7F00FF]" />
                    <p className="text-xs font-medium">جارٍ تحميل طرق الإيداع المتوفرة...</p>
                  </div>
                ) : methods.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center text-amber-800 dark:text-amber-300 text-xs">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                    <p className="font-bold">لا توجد طرق إيداع مفعلة حالياً.</p>
                    <p className="text-[11px] mt-1 text-amber-600/80">يرجى التواصل مع الدعم الفني أو المحاولة لاحقاً.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {methods.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMethod(m)}
                        className="group p-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-[#7F00FF] dark:hover:border-purple-500 bg-white dark:bg-slate-900/70 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-1 shrink-0 flex items-center justify-center">
                            {m.icon ? (
                              <img
                                src={m.icon}
                                alt={m.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as any).src = 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=035';
                                }}
                              />
                            ) : (
                              <Wallet className="w-6 h-6 text-[#7F00FF]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#7F00FF] transition-colors truncate">
                              {m.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] font-mono font-extrabold bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 px-2 py-0.5 rounded-md">
                                {m.currency}
                              </span>
                              {m.feeEnabled && Number(m.feePercentage) > 0 ? (
                                <span className="text-[9.5px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md">
                                  رسوم: {m.feePercentage}%
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                                  بدون رسوم
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Method Limits & Exchange */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <div>
                            <span>الحدود: </span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {formatSypNumber(m.minDeposit)} - {formatSypNumber(m.maxDeposit)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[#7F00FF] dark:text-purple-400 font-bold group-hover:translate-x-[-2px] transition-transform">
                            <span>اختيار</span>
                            <ArrowLeft className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Selected Method Details & Input Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Back to methods selector */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod(null);
                    setSubmitError(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#7F00FF] transition-colors cursor-pointer mb-1"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>الرجوع لاختيار طريقة إيداع أخرى</span>
                </button>

                {/* Selected Method Summary Banner */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 p-1 border border-purple-200 dark:border-purple-800 shrink-0 flex items-center justify-center">
                      {selectedMethod.icon ? (
                        <img src={selectedMethod.icon} alt={selectedMethod.name} className="w-full h-full object-contain" />
                      ) : (
                        <Wallet className="w-6 h-6 text-[#7F00FF]" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {selectedMethod.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                        <span>العملة: <strong className="text-[#7F00FF] dark:text-purple-300 font-mono">{selectedMethod.currency}</strong></span>
                        {selectedMethod.exchangeRateToSyp && selectedMethod.exchangeRateToSyp !== 1 && (
                          <span>| سعر الصرف: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatSypNumber(selectedMethod.exchangeRateToSyp)} ل.س</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 shadow-2xs shrink-0">
                    {selectedMethod.feeEnabled ? `رسوم ${selectedMethod.feePercentage}%` : 'مجاناً 0%'}
                  </span>
                </div>

                {/* Deposit Address with 1-click Copy */}
                {selectedMethod.depositAddress && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      عنوان / رقم التحويل للإيداع:
                    </label>
                    <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700">
                      <div className="flex-1 font-mono text-xs sm:text-sm font-bold text-[#7F00FF] dark:text-purple-300 select-all break-all text-left dir-ltr">
                        {selectedMethod.depositAddress}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(selectedMethod.depositAddress)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-purple-100'
                        }`}
                        title="نسخ العنوان"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Method Instructions & Details (Preserving Whitespace and Newlines) */}
                {selectedMethod.details && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Info className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>تعليمات وتفاصيل الإيداع:</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans pr-1">
                      {selectedMethod.details}
                    </div>
                  </div>
                )}

                {/* Two Required Inputs specified by user: المبلغ و رقم العملية */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Input 1: إدخال المبلغ */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        1. إدخال المبلغ ({selectedMethod.currency}) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {formatSypNumber(selectedMethod.minDeposit)} - {formatSypNumber(selectedMethod.maxDeposit)}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        required
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder={`مثال: ${selectedMethod.minDeposit || '10000'}`}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm font-bold focus:ring-2 focus:ring-[#7F00FF] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                      />
                      <span className="absolute left-3 top-2.5 text-xs font-bold font-mono text-slate-400 pointer-events-none">
                        {selectedMethod.currency}
                      </span>
                    </div>
                  </div>

                  {/* Input 2: إدخال رقم العملية */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      2. إدخال رقم العملية (إشعار التحويل / TXID) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={txNumberInput}
                      onChange={(e) => setTxNumberInput(e.target.value)}
                      placeholder="رقم الإشعار أو رمز الحوالة المطبوع"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs font-bold focus:ring-2 focus:ring-[#7F00FF] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Optional Note */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    ملاحظات إضافية (اختياري - مثلاً اسم المحول أو رقم هاتف المرسل):
                  </label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="أي توضيحات أو اسم المحول..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#7F00FF] outline-none transition-all"
                  />
                </div>

                {/* Real-time Calculation Breakdown Preview */}
                {amountInput && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/40 text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>المبلغ المحول:</span>
                      <span className="font-mono font-bold">{formatSypNumber(calculations.amount)} {selectedMethod.currency}</span>
                    </div>

                    {selectedMethod.feeEnabled && Number(selectedMethod.feePercentage) > 0 && (
                      <div className="flex justify-between text-amber-700 dark:text-amber-400">
                        <span>الرسوم ({selectedMethod.feePercentage}%):</span>
                        <span className="font-mono font-bold">-{formatSypNumber(calculations.feeAmount)} {selectedMethod.currency}</span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-purple-200 dark:border-purple-800/60 flex justify-between items-baseline">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        المبلغ الذي سيضاف إلى رصيدك:
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {formatSypNumber(calculations.sypAmount)}
                        </span>
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">ل.س</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod(null)}
                    disabled={isSubmitting}
                    className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    تغيير الطريقة
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !calculations.isValid || !txNumberInput.trim()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-[#7F00FF] to-indigo-700 text-white text-xs sm:text-sm font-bold hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جارٍ إرسال الطلب...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>إرسال طلب الإيداع للوحة التحكم</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Tab 2: User Deposit History */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  طلبات الإيداع السابقة الخاصة بك:
                </span>
                <button
                  type="button"
                  onClick={loadUserRequests}
                  className="p-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 text-[#7F00FF] dark:text-purple-300 transition-colors cursor-pointer"
                  title="تحديث السجل"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingRequests ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7F00FF]" />
                  <p className="text-xs font-medium">جارٍ تحميل سجل الإيداعات...</p>
                </div>
              ) : userRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                  <Wallet className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                  <p className="text-xs font-medium">لم تقم بإجراء أي طلبات إيداع سابقة بعد.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deposit')}
                    className="text-xs font-bold text-[#7F00FF] hover:underline cursor-pointer"
                  >
                    + اضغط هنا لتقديم طلبك الأول
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {req.methodName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            #{req.id}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {req.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مقبول وتم الشحن</span>
                          </span>
                        ) : req.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/40">
                            <XCircle className="w-3 h-3" />
                            <span>مرفوض</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>قيد المراجعة</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-white/5">
                        <div>
                          <span className="text-slate-400 block text-[10px]">المبلغ المحول:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {formatSypNumber(req.amount)} {req.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">الرصيد المضاف:</span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {formatSypNumber(req.sypAmount)} ل.س
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1">
                        <div>
                          <span>رقم العملية: </span>
                          <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300 select-all">
                            {req.txNumber}
                          </span>
                        </div>
                        <span>
                          {new Date(req.createdAt).toLocaleDateString('ar-SY', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {req.rejectionReason && (
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px]">
                          <strong>سبب الرفض: </strong> {req.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
