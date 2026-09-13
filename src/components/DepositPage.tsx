import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Send,
  LogIn,
} from 'lucide-react';
import { CustomerUser, DepositMethod, DepositRequest } from '../types';
import { fetchDepositMethods, submitDepositRequest, fetchDepositRequests } from '../services/dbApi';
import { formatSypNumber } from '../utils/currencyUtils';

interface DepositPageProps {
  currentUser: CustomerUser | null;
  onNavigateHome: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onDepositSuccess?: () => void;
  onRefreshUser?: () => void;
}

export const DepositPage: React.FC<DepositPageProps> = React.memo(({
  currentUser,
  onNavigateHome,
  onOpenAuth,
  onDepositSuccess,
  onRefreshUser,
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

  // Tabs: 'deposit' (New Request) | 'history' (Past Requests)
  const [activeTab, setActiveTab] = useState<'deposit' | 'history'>('deposit');
  const [userRequests, setUserRequests] = useState<DepositRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);

  // Copy state for account address / phone
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const loadMethods = useCallback(async () => {
    setIsLoadingMethods(true);
    try {
      const data = await fetchDepositMethods();
      if (Array.isArray(data)) {
        setMethods(data.filter((m) => m.isActive !== false));
      }
    } catch {
      // Safe fallback
    } finally {
      setIsLoadingMethods(false);
    }
  }, []);

  const loadUserRequests = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingRequests(true);
    try {
      const reqs = await fetchDepositRequests(currentUser.id);
      if (Array.isArray(reqs)) {
        setUserRequests(reqs);
      }
    } catch {
      // Safe fallback
    } finally {
      setIsLoadingRequests(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadMethods();
    if (currentUser?.id) {
      loadUserRequests();
    }
  }, [loadMethods, loadUserRequests, currentUser?.id]);

  const handleCopyAddress = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Real-time Calculations
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
        error: 'يرجى إدخال مبلغ صحيح أكبر من الصفر',
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
    if (!currentUser?.id) {
      onOpenAuth('login');
      return;
    }

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
        if (onDepositSuccess) onDepositSuccess();
        if (onRefreshUser) onRefreshUser();
      } else {
        setSubmitError(res.error || 'فشل إرسال طلب الإيداع، يرجى المحاولة لاحقاً');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'حدث خطأ غير متوقع أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200" dir="rtl">
      {/* Top Tabs & Back Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-1">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('deposit');
              setSubmitSuccess(null);
            }}
            className={`pb-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'deposit'
                ? 'border-[#7F00FF] text-[#7F00FF] dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>طلب إيداع جديد</span>
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                loadUserRequests();
              }}
              className={`pb-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-[#7F00FF] text-[#7F00FF] dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>سجل طلبات الإيداع</span>
              {userRequests.length > 0 && (
                <span className="bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  {userRequests.length}
                </span>
              )}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onNavigateHome}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          title="العودة للمتجر"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </button>
      </div>

      {/* Main Body */}
      {!currentUser ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#12101e] border border-purple-200/80 dark:border-purple-900/40 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800/60 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center mx-auto shadow-md">
            <LogIn className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              تسجيل الدخول مطلوب لشحن الرصيد
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              يرجى تسجيل الدخول أو إنشاء حساب جديد في المتجر لتتمكن من إيداع وشحن رصيد محفظتك واستعراض سجل العمليات.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-6 py-3 rounded-2xl bg-[#7F00FF] hover:bg-[#6e00dd] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#7F00FF]/30 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول / إنشاء حساب</span>
            </button>
          </div>
        </div>
      ) : activeTab === 'deposit' ? (
        submitSuccess ? (
          /* Success Screen */
          <div className="bg-white dark:bg-[#12101e] border border-purple-200/80 dark:border-purple-900/40 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-sm animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                تم إرسال طلب الإيداع بنجاح!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                تم تسجيل طلبك برقم <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300">{submitSuccess.id}</span> وسيقوم فريق المتجر بمطابقة رقم إشعار التحويل وتغذية رصيدك فوراً.
              </p>
            </div>

            {/* Request Summary Receipt */}
            <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-right space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500">طريقة الإيداع:</span>
                <span className="font-bold">{submitSuccess.methodName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500">المبلغ المحوّل:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {formatSypNumber(submitSuccess.amount)} {submitSuccess.currency}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500">صافي الرصيد المضاف:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm sm:text-base">
                  {formatSypNumber(submitSuccess.sypAmount)} ل.س
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">رقم الإشعار / العملية:</span>
                <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300">{submitSuccess.txNumber}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(null);
                  setSelectedMethod(null);
                  setAmountInput('');
                  setTxNumberInput('');
                  setNotesInput('');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#7F00FF] dark:text-purple-300 font-bold text-xs sm:text-sm hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors cursor-pointer"
              >
                إجراء إيداع آخر
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="flex-1 py-3 px-4 rounded-xl bg-[#7F00FF] text-white font-bold text-xs sm:text-sm hover:bg-[#6e00dd] transition-colors cursor-pointer shadow-md shadow-[#7F00FF]/25"
              >
                عرض سجل طلباتي
              </button>
            </div>
          </div>
        ) : !selectedMethod ? (
          /* Step 1: Select Deposit Method */
          <div className="bg-white dark:bg-[#12101e] border border-purple-200/80 dark:border-purple-900/40 rounded-3xl p-5 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7F00FF]" />
                <span>اختر وسيلة الإيداع المتاحة:</span>
              </h2>
              <span className="text-xs text-slate-400">انقر على الطريقة للمتابعة</span>
            </div>

            {isLoadingMethods ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#7F00FF]" />
                <p className="text-xs sm:text-sm font-medium">جارٍ تحميل طرق الإيداع المعتمدة...</p>
              </div>
            ) : methods.length === 0 ? (
              <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                <p className="font-bold">لا توجد طرق إيداع مفعلة حالياً.</p>
                <p className="text-xs mt-1 text-amber-600/80">يرجى مراجعة إدارة المتجر أو المحاولة في وقت لاحق.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {methods.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMethod(m);
                      setAmountInput('');
                      setTxNumberInput('');
                      setSubmitError(null);
                    }}
                    className="group p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-[#7F00FF] dark:hover:border-purple-500 bg-white dark:bg-slate-900/70 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-1.5 shrink-0 flex items-center justify-center shadow-xs">
                        {m.icon ? (
                          <img
                            src={m.icon}
                            alt={m.name}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as any).src = 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=035';
                            }}
                          />
                        ) : (
                          <Wallet className="w-7 h-7 text-[#7F00FF]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-[#7F00FF] transition-colors truncate">
                          {m.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[11px] font-mono font-extrabold bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 px-2.5 py-0.5 rounded-lg">
                            {m.currency}
                          </span>
                          {m.feeEnabled && Number(m.feePercentage) > 0 ? (
                            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg">
                              رسوم: {m.feePercentage}%
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg">
                              بدون أي رسوم
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Limits & CTA */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        <span>حدود الإيداع: </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatSypNumber(m.minDeposit)} - {formatSypNumber(m.maxDeposit)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[#7F00FF] dark:text-purple-400 font-bold group-hover:translate-x-[-3px] transition-transform">
                        <span>متابعة</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Selected Method Details & Submit Form */
          <div className="bg-white dark:bg-[#12101e] border border-purple-200/80 dark:border-purple-900/40 rounded-3xl p-5 sm:p-8 space-y-6 shadow-sm">
            {/* Back to methods selector */}
            <button
              type="button"
              onClick={() => {
                setSelectedMethod(null);
                setSubmitError(null);
              }}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-[#7F00FF] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>تغيير وسيلة الإيداع (اختيار طريقة أخرى)</span>
            </button>

            {/* Selected Method Detail Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 p-1 shrink-0 border border-purple-200 dark:border-purple-700/50 flex items-center justify-center">
                    {selectedMethod.icon ? (
                      <img
                        src={selectedMethod.icon}
                        alt={selectedMethod.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Wallet className="w-5 h-5 text-[#7F00FF]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {selectedMethod.name}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      العملة: {selectedMethod.currency}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                  طريقة معتمدة
                </span>
              </div>

              {/* Instructions */}
              {selectedMethod.details && (
                <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-purple-900/30 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                  {selectedMethod.details}
                </div>
              )}

              {/* Deposit Address / Wallet / Account Number */}
              {selectedMethod.depositAddress && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      رقم الحساب / المحفظة للتحويل إليها:
                    </span>
                    <span className="font-mono font-bold text-sm sm:text-base text-[#7F00FF] dark:text-purple-300 select-all break-all">
                      {selectedMethod.depositAddress}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(selectedMethod.depositAddress || '')}
                    className="p-2.5 rounded-xl bg-purple-100/80 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 hover:bg-purple-200 transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount Field */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>المبلغ المراد إيداعه ({selectedMethod.currency})</span>
                  <span className="text-xs text-slate-400 font-normal">
                    الحد الأدنى: {formatSypNumber(selectedMethod.minDeposit)} {selectedMethod.currency}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder={`أدخل المبلغ بـ ${selectedMethod.currency}`}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-[#7F00FF] text-base"
                    required
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400 uppercase font-mono">
                    {selectedMethod.currency}
                  </span>
                </div>
              </div>

              {/* Calculations Box */}
              {calculations.amount > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">المبلغ المدخل:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatSypNumber(calculations.amount)} {selectedMethod.currency}
                    </span>
                  </div>
                  {calculations.feeAmount > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>الرسوم المقتطعة ({selectedMethod.feePercentage}%):</span>
                      <span className="font-mono font-bold">
                        -{formatSypNumber(calculations.feeAmount)} {selectedMethod.currency}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-emerald-200/50 dark:border-emerald-800/30 text-sm">
                    <span className="font-bold text-slate-900 dark:text-white">صافي الرصيد المضاف لمحفظتك:</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {formatSypNumber(calculations.sypAmount)} ل.س
                    </span>
                  </div>
                </div>
              )}

              {/* Transaction / Notice Number */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 block">
                  رقم العملية / إشعار التحويل (TXID / Reference) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={txNumberInput}
                  onChange={(e) => setTxNumberInput(e.target.value)}
                  placeholder="مثال: 3456700891 (الرقم الظاهر في إشعار شام كاش)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-[#7F00FF]"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  يرجى إدخال الرقم الدقيق لعملية التحويل ليتمكن النظام وفريق الإدارة من مطابقتها فوراً.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 block">
                  ملاحظات إضافية (اختياري)
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="اسم المحول، أو أي تفاصيل مساعدة..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !calculations.isValid}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#7F00FF] hover:brightness-110 active:scale-98 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>جارٍ إرسال الطلب للمطابقة...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>تأكيد وإرسال طلب الشحن</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )
      ) : (
        /* Tab 2: User Deposit Requests History */
        <div className="bg-white dark:bg-[#12101e] border border-purple-200/80 dark:border-purple-900/40 rounded-3xl p-5 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7F00FF]" />
              <span>سجل طلبات الإيداع السابقة:</span>
            </h2>
            <button
              type="button"
              onClick={loadUserRequests}
              disabled={isLoadingRequests}
              className="flex items-center gap-1.5 text-xs text-[#7F00FF] dark:text-purple-300 hover:underline cursor-pointer font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />
              <span>تحديث السجل</span>
            </button>
          </div>

          {isLoadingRequests ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#7F00FF]" />
              <p className="text-xs sm:text-sm font-medium">جارٍ تحميل سجل العمليات...</p>
            </div>
          ) : userRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Wallet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">لا توجد طلبات إيداع سابقة</p>
              <p className="text-xs text-slate-400">قم بتقديم طلب إيداع جديد لشحن رصيد حسابك.</p>
              <button
                type="button"
                onClick={() => setActiveTab('deposit')}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#7F00FF] dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer inline-block"
              >
                تقديم طلب إيداع الآن
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/60 space-y-2.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {req.id}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">({req.methodName})</span>
                    </div>

                    {/* Status Badge */}
                    {req.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم الشحن والاعتماد</span>
                      </span>
                    ) : req.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>مرفوض</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                        <Clock className="w-3.5 h-3.5" />
                        <span>قيد المراجعة والمطابقة</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">المبلغ المحول:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatSypNumber(req.amount)} {req.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">صافي الرصيد:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatSypNumber(req.sypAmount)} ل.س
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">رقم الإشعار:</span>
                      <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300 select-all">
                        {req.txNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">تاريخ الطلب:</span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {new Date(req.createdAt).toLocaleDateString('ar-EG', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {req.status === 'rejected' && req.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
                      <span className="font-bold">سبب الرفض: </span>
                      <span>{req.rejectionReason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

DepositPage.displayName = 'DepositPage';
