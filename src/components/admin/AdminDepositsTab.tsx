import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpDown,
  Coins,
  DollarSign,
  AlertTriangle,
  FileText,
  User,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { DepositMethod, DepositRequest } from '../../types';
import {
  fetchDepositMethods,
  saveDepositMethods,
  saveDepositMethod,
  deleteDepositMethod,
  fetchDepositRequests,
  updateDepositRequestStatus,
} from '../../services/dbApi';
import { formatSypNumber } from '../../utils/currencyUtils';

interface AdminDepositsTabProps {
  adminEmail?: string;
  onBalanceUpdated?: () => void;
}

export const AdminDepositsTab: React.FC<AdminDepositsTabProps> = ({
  adminEmail = 'admin@nexen.store',
  onBalanceUpdated,
}) => {
  // Main view tab: 'requests' | 'methods'
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'methods'>('requests');

  // Requests state
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(true);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [requestSearch, setRequestSearch] = useState<string>('');

  // Approve / Reject modal state
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    request: DepositRequest | null;
    action: 'approve' | 'reject' | null;
    rejectionReason: string;
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    request: null,
    action: null,
    rejectionReason: '',
    isSubmitting: false,
    error: null,
  });

  // Methods state
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState<boolean>(true);

  // Method Form Modal (Create / Edit)
  const [methodModal, setMethodModal] = useState<{
    isOpen: boolean;
    isEditing: boolean;
    formData: Partial<DepositMethod>;
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    isEditing: false,
    formData: {
      name: '',
      currency: 'SYP',
      exchangeRateToSyp: 1,
      depositAddress: '',
      minDeposit: 10000,
      maxDeposit: 5000000,
      details: '',
      icon: '',
      feeEnabled: false,
      feePercentage: 0,
      isActive: true,
      order: 1,
    },
    isSubmitting: false,
    error: null,
  });

  // Copy state for TX numbers & addresses
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    loadRequests();
    loadMethods();
  };

  const loadRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await fetchDepositRequests();
      setRequests(data);
    } catch (err) {
      console.error('Error fetching deposit requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const loadMethods = async () => {
    setIsLoadingMethods(true);
    try {
      const data = await fetchDepositMethods();
      setMethods(data);
    } catch (err) {
      console.error('Error fetching deposit methods:', err);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Status Action Handlers
  const handleOpenActionModal = (request: DepositRequest, action: 'approve' | 'reject') => {
    setActionModal({
      isOpen: true,
      request,
      action,
      rejectionReason: '',
      isSubmitting: false,
      error: null,
    });
  };

  const handleConfirmAction = async () => {
    if (!actionModal.request || !actionModal.action) return;

    setActionModal((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const res = await updateDepositRequestStatus(
        actionModal.request.id,
        actionModal.action === 'approve' ? 'approved' : 'rejected',
        actionModal.rejectionReason,
        adminEmail
      );

      if (res.success) {
        // Refresh local requests
        await loadRequests();
        if (onBalanceUpdated) onBalanceUpdated();
        setActionModal({
          isOpen: false,
          request: null,
          action: null,
          rejectionReason: '',
          isSubmitting: false,
          error: null,
        });
      } else {
        setActionModal((prev) => ({
          ...prev,
          isSubmitting: false,
          error: res.error || 'فشلت العملية',
        }));
      }
    } catch (err: any) {
      setActionModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: err.message || 'خطأ في الاتصال بالخادم',
      }));
    }
  };

  // Method Form Handlers
  const handleOpenCreateMethod = () => {
    setMethodModal({
      isOpen: true,
      isEditing: false,
      formData: {
        id: `method_${Date.now()}`,
        name: '',
        currency: 'SYP',
        exchangeRateToSyp: 1,
        depositAddress: '',
        minDeposit: 10000,
        maxDeposit: 5000000,
        details: '',
        icon: '',
        feeEnabled: false,
        feePercentage: 0,
        isActive: true,
        order: methods.length + 1,
      },
      isSubmitting: false,
      error: null,
    });
  };

  const handleOpenEditMethod = (method: DepositMethod) => {
    setMethodModal({
      isOpen: true,
      isEditing: true,
      formData: { ...method },
      isSubmitting: false,
      error: null,
    });
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = methodModal.formData;

    if (!data.name || !data.currency) {
      setMethodModal((prev) => ({ ...prev, error: 'اسم الطريقة والعملة حقول مطلوبة' }));
      return;
    }

    setMethodModal((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const payload: Partial<DepositMethod> = {
        ...data,
        name: data.name.trim(),
        currency: (data.currency || 'SYP').trim().toUpperCase(),
        exchangeRateToSyp: parseFloat(String(data.exchangeRateToSyp)) || 1,
        depositAddress: (data.depositAddress || '').trim(),
        minDeposit: parseFloat(String(data.minDeposit)) || 0,
        maxDeposit: parseFloat(String(data.maxDeposit)) || 0,
        details: data.details || '',
        icon: data.icon || '',
        feeEnabled: !!data.feeEnabled,
        feePercentage: data.feeEnabled ? (parseFloat(String(data.feePercentage)) || 0) : 0,
        isActive: data.isActive !== false,
      };

      const res = await saveDepositMethod(payload);

      if (res.success) {
        await loadMethods();
        setMethodModal((prev) => ({ ...prev, isOpen: false, isSubmitting: false }));
      } else {
        setMethodModal((prev) => ({ ...prev, isSubmitting: false, error: res.error || 'فشل حفظ طريقة الإيداع' }));
      }
    } catch (err: any) {
      setMethodModal((prev) => ({ ...prev, isSubmitting: false, error: err.message || 'حدث خطأ غير متوقع' }));
    }
  };

  const handleDeleteMethod = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف طريقة الإيداع "${name}"؟`)) return;

    try {
      const res = await deleteDepositMethod(id);
      if (res.success) {
        await loadMethods();
      } else {
        alert(res.error || 'فشل حذف طريقة الإيداع');
      }
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء الحذف');
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    if (requestFilter !== 'all' && req.status !== requestFilter) return false;
    if (requestSearch) {
      const q = requestSearch.toLowerCase();
      const matchName = (req.userName || '').toLowerCase().includes(q);
      const matchEmail = (req.userEmail || '').toLowerCase().includes(q);
      const matchPhone = (req.userPhone || '').toLowerCase().includes(q);
      const matchTx = (req.txNumber || '').toLowerCase().includes(q);
      const matchId = (req.id || '').toLowerCase().includes(q);
      const matchMethod = (req.methodName || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchTx || matchId || matchMethod;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Navigation Bar for Deposit Management */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#151226] p-4 sm:p-6 rounded-3xl border border-purple-200/80 dark:border-purple-900/30 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                إدارة نظام الإيداع والشحن
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مراجعة واعتماد طلبات إيداع المستخدمين وإدارة طرق الدفع وأسعار الصرف
              </p>
            </div>
          </div>
        </div>

        {/* SubTabs selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('requests')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'requests'
                ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>طلبات الإيداع</span>
            {pendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold font-mono animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('methods')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'methods'
                ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>طرق الإيداع المعتمدة ({methods.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: REQUESTS VIEW                                   */}
      {/* ========================================================= */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          {/* Controls / Filter row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#151226] p-4 rounded-2xl border border-purple-200/60 dark:border-purple-900/20">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                placeholder="بحث باسم المستخدم، الإيميل، رقم الهاتف، رقم العملية (TXID)، أو المعرّف..."
                className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7F00FF] outline-none"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setRequestFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  requestFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>قيد الانتظار ({pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  requestFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>المقبولة</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  requestFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>المرفوضة</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  requestFilter === 'all'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                الكل ({requests.length})
              </button>

              <button
                type="button"
                onClick={loadRequests}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
                title="تحديث القائمة"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Requests List */}
          {isLoadingRequests ? (
            <div className="p-12 text-center text-slate-400 space-y-3 bg-white dark:bg-[#151226] rounded-3xl border border-purple-200/40">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7F00FF]" />
              <p className="text-sm font-bold">جارٍ تحميل طلبات الإيداع...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2 bg-white dark:bg-[#151226] rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
              <Wallet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold">لا توجد طلبات إيداع تطابق الفلتر المحدد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 bg-white dark:bg-[#151226] rounded-2xl border border-purple-200/70 dark:border-purple-900/30 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left block: User & Method Info */}
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 px-2 py-0.5 rounded-md">
                        #{req.id}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {req.methodName}
                      </span>

                      {/* Status Badge */}
                      {req.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم القبول وشحن الرصيد</span>
                        </span>
                      ) : req.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>مرفوض</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>بانتظار المراجعة والاعتماد</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 mr-auto font-mono">
                        {new Date(req.createdAt).toLocaleString('ar-SY', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Customer Info row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        <span className="font-bold">{req.userName || 'مستخدم'}</span>
                      </div>

                      {req.userPhone && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{req.userPhone}</span>
                        </div>
                      )}

                      {req.userEmail && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{req.userEmail}</span>
                        </div>
                      )}
                    </div>

                    {/* Transaction & Address details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* TX Number */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/30">
                        <span className="text-[11px] font-bold text-slate-500">رقم العملية / TXID:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-[#7F00FF] dark:text-purple-300 select-all text-xs">
                            {req.txNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(req.txNumber, `tx_${req.id}`)}
                            className="p-1 rounded hover:bg-purple-200/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 transition-colors cursor-pointer"
                            title="نسخ رقم العملية"
                          >
                            {copiedKey === `tx_${req.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Deposit address */}
                      {req.depositAddress && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                          <span className="text-[11px] font-bold text-slate-500">العنوان المحول إليه:</span>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                            {req.depositAddress}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* User Notes */}
                    {req.notes && (
                      <div className="text-[11.5px] p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                        <strong className="text-purple-600 dark:text-purple-400">ملاحظات العميل: </strong>
                        {req.notes}
                      </div>
                    )}

                    {/* Rejection reason display */}
                    {req.rejectionReason && (
                      <div className="text-[11.5px] p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                        <strong>سبب الرفض: </strong>
                        {req.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Right block: Amount Card & Action Buttons */}
                  <div className="lg:w-72 shrink-0 flex flex-col justify-between gap-3 lg:border-r lg:border-slate-100 lg:dark:border-white/5 lg:pr-4">
                    {/* Amount breakdown */}
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-50/80 to-indigo-50/80 dark:from-purple-950/40 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800/40 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>المبلغ المحول:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatSypNumber(req.amount)} {req.currency}
                        </span>
                      </div>

                      {req.feeAmount > 0 && (
                        <div className="flex justify-between text-amber-700 dark:text-amber-400 text-[11px]">
                          <span>الرسوم ({req.feePercentage}%):</span>
                          <span className="font-mono">-{formatSypNumber(req.feeAmount)} {req.currency}</span>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-purple-200 dark:border-purple-800/60 flex justify-between items-baseline">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          الرصيد المضاف:
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {formatSypNumber(req.sypAmount)}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">ل.س</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons (only if pending) */}
                    {req.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenActionModal(req, 'approve')}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>قبول وشحن الرصيد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenActionModal(req, 'reject')}
                          className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors border border-rose-200 dark:border-rose-800/60 cursor-pointer"
                        >
                          رفض
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 text-center py-1">
                        {req.status === 'approved' && req.approvedBy && (
                          <span>معتمد بواسطة: <strong className="text-slate-600 dark:text-slate-300">{req.approvedBy}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: DEPOSIT METHODS MANAGEMENT                      */}
      {/* ========================================================= */}
      {activeSubTab === 'methods' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-[#151226] p-4 rounded-2xl border border-purple-200/60 dark:border-purple-900/20">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                قائمة طرق الإيداع المتاحة للزبائن
              </h3>
              <p className="text-xs text-slate-500">
                يمكنك إضافة طرق جديدة أو تعديل العناوين، الرسوم، وحدود الإيداع
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateMethod}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-[#7F00FF] to-indigo-700 text-white text-xs font-bold hover:brightness-110 shadow-md shadow-[#7F00FF]/25 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة طريقة إيداع جديدة</span>
            </button>
          </div>

          {isLoadingMethods ? (
            <div className="p-12 text-center text-slate-400 space-y-3 bg-white dark:bg-[#151226] rounded-3xl border border-purple-200/40">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7F00FF]" />
              <p className="text-sm font-bold">جارٍ تحميل طرق الإيداع...</p>
            </div>
          ) : methods.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3 bg-white dark:bg-[#151226] rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
              <Coins className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-bold">لا توجد أي طرق إيداع مضافة حالياً.</p>
              <button
                type="button"
                onClick={handleOpenCreateMethod}
                className="text-xs font-bold text-[#7F00FF] hover:underline cursor-pointer"
              >
                + اضغط هنا لإضافة أول طريقة إيداع
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="bg-white dark:bg-[#151226] rounded-2xl border border-purple-200/70 dark:border-purple-900/30 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Top Header: Icon, Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-13 h-13 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-1 shrink-0 flex items-center justify-center">
                        {method.icon ? (
                          <img
                            src={method.icon}
                            alt={method.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as any).src = 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=035';
                            }}
                          />
                        ) : (
                          <Wallet className="w-7 h-7 text-[#7F00FF]" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {method.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10.5px] font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 px-2 py-0.5 rounded-md">
                            {method.currency}
                          </span>
                          {method.isActive !== false ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                              مفعلة
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              معطلة
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditMethod(method)}
                        className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors cursor-pointer"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMethod(method.id, method.name)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Method Specifications Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">سعر الصرف:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        1 {method.currency} = {formatSypNumber(method.exchangeRateToSyp || 1)} ل.س
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10.5px]">الرسوم:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {method.feeEnabled ? (
                          <span className="text-amber-600 dark:text-amber-400 font-mono">
                            {method.feePercentage}%
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            بدون رسوم (0%)
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10.5px]">أقل مبلغ:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatSypNumber(method.minDeposit)} {method.currency}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10.5px]">أقصى مبلغ:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatSypNumber(method.maxDeposit)} {method.currency}
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  {method.depositAddress && (
                    <div className="text-xs space-y-1">
                      <span className="text-slate-400 text-[10.5px] font-bold">عنوان / رقم الإيداع:</span>
                      <div className="font-mono text-xs font-bold text-[#7F00FF] dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/20 p-2 rounded-xl border border-purple-200/50 dark:border-purple-900/30 break-all select-all">
                        {method.depositAddress}
                      </div>
                    </div>
                  )}

                  {/* Details (with whitespace-pre-line) */}
                  {method.details && (
                    <div className="text-xs space-y-1">
                      <span className="text-slate-400 text-[10.5px] font-bold">تفاصيل وتعليمات الإيداع:</span>
                      <div className="text-slate-600 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 whitespace-pre-line line-clamp-3 hover:line-clamp-none transition-all">
                        {method.details}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: APPROVE / REJECT CONFIRMATION MODAL               */}
      {/* ========================================================= */}
      {actionModal.isOpen && actionModal.request && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#151226] border border-purple-200 dark:border-purple-900/40 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                  actionModal.action === 'approve'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600'
                }`}
              >
                {actionModal.action === 'approve' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {actionModal.action === 'approve'
                    ? 'تأكيد قبول طلب الإيداع وشحن الرصيد'
                    : 'رفض طلب الإيداع'}
                </h3>
                <p className="text-xs text-slate-500">
                  طلب رقم: <span className="font-mono font-bold">#{actionModal.request.id}</span>
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">المستخدم:</span>
                <span className="font-bold">{actionModal.request.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">طريقة الإيداع:</span>
                <span className="font-bold">{actionModal.request.methodName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المبلغ المحول:</span>
                <span className="font-mono font-bold">{formatSypNumber(actionModal.request.amount)} {actionModal.request.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم العملية:</span>
                <span className="font-mono font-bold text-[#7F00FF]">{actionModal.request.txNumber}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 dark:text-white">
                  {actionModal.action === 'approve' ? 'سيتم إضافة رصيد بقيمة:' : 'المبلغ المطلوب:'}
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatSypNumber(actionModal.request.sypAmount)} ل.س
                </span>
              </div>
            </div>

            {/* If rejecting, show rejection reason field */}
            {actionModal.action === 'reject' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  سبب الرفض (سيظهر للمستخدم في سجله):
                </label>
                <textarea
                  rows={3}
                  value={actionModal.rejectionReason}
                  onChange={(e) =>
                    setActionModal((prev) => ({ ...prev, rejectionReason: e.target.value }))
                  }
                  placeholder="مثال: رقم العملية غير متطابق مع إشعارات البنك، يرجى التأكد..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            )}

            {actionModal.error && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl">
                {actionModal.error}
              </p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() =>
                  setActionModal({
                    isOpen: false,
                    request: null,
                    action: null,
                    rejectionReason: '',
                    isSubmitting: false,
                    error: null,
                  })
                }
                disabled={actionModal.isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionModal.isSubmitting}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  actionModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                }`}
              >
                {actionModal.isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : actionModal.action === 'approve' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد وشحن الرصيد</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>تأكيد الرفض</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD / EDIT DEPOSIT METHOD MODAL                   */}
      {/* ========================================================= */}
      {methodModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-[#151226] border border-purple-200 dark:border-purple-900/40 rounded-3xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {methodModal.isEditing ? 'تعديل طريقة الإيداع' : 'إضافة طريقة إيداع جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    حدد تفاصيل الطريقة، سعر الصرف، الرسوم، وعنوان الإيداع
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMethodModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="space-y-4 text-xs">
              {/* 1. اسم طريقة الإيداع */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  اسم طريقة الإيداع <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={methodModal.formData.name || ''}
                  onChange={(e) =>
                    setMethodModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, name: e.target.value },
                    }))
                  }
                  placeholder="مثال: شام كاش، سيريتل كاش، USDT (TRC-20)، شركة الهرم..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#7F00FF]"
                />
              </div>

              {/* 2 & 3: عملة الإيداع وسعر الصرف */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    عملة الإيداع <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={methodModal.formData.currency || 'SYP'}
                    onChange={(e) =>
                      setMethodModal((prev) => ({
                        ...prev,
                        formData: { ...prev.formData, currency: e.target.value.toUpperCase() },
                      }))
                    }
                    placeholder="SYP, USDT, USD, EUR..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#7F00FF]"
                  />
                  <p className="text-[10px] text-slate-400">
                    إذا كانت بالليرة السورية اكتب SYP
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    سعر صرف عملة الإيداع مقابل الليرة السورية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={methodModal.formData.exchangeRateToSyp ?? 1}
                    onChange={(e) =>
                      setMethodModal((prev) => ({
                        ...prev,
                        formData: {
                          ...prev.formData,
                          exchangeRateToSyp: parseFloat(e.target.value) || 1,
                        },
                      }))
                    }
                    placeholder="مثال: 1 لليرة السورية، أو 15000 للدولار/USDT"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#7F00FF]"
                  />
                  <p className="text-[10px] text-slate-400">
                    1 وحدة من العملة = كم ليرة سورية
                  </p>
                </div>
              </div>

              {/* 4. عنوان الإيداع */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  عنوان الإيداع (رقم الهاتف / عنوان المحفظة / اسم وبيانات المستلم) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={methodModal.formData.depositAddress || ''}
                  onChange={(e) =>
                    setMethodModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, depositAddress: e.target.value },
                    }))
                  }
                  placeholder="مثال: 0988123456 أو عنوان محفظة TRC-20 أو اسم المستلم في شركة الهرم"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-[#7F00FF]"
                />
              </div>

              {/* 5 & 6: أقل وأقصى مبلغ يمكن إيداعه */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    أقل مبلغ يمكن إيداعه ({methodModal.formData.currency || 'العملة'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={methodModal.formData.minDeposit ?? 10000}
                    onChange={(e) =>
                      setMethodModal((prev) => ({
                        ...prev,
                        formData: { ...prev.formData, minDeposit: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#7F00FF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    أقصى مبلغ يمكن إيداعه ({methodModal.formData.currency || 'العملة'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={methodModal.formData.maxDeposit ?? 5000000}
                    onChange={(e) =>
                      setMethodModal((prev) => ({
                        ...prev,
                        formData: { ...prev.formData, maxDeposit: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#7F00FF]"
                  />
                </div>
              </div>

              {/* 7. تفاصيل الإيداع (نص مع دعم الفراغات والأسطر) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  تفاصيل الإيداع والتعليمات (نص مع دعم الفراغات والأسطر):
                </label>
                <textarea
                  rows={4}
                  value={methodModal.formData.details || ''}
                  onChange={(e) =>
                    setMethodModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, details: e.target.value },
                    }))
                  }
                  placeholder={`1. افتح المحفظة وحول المبلغ إلى العنوان أعلاه.\n2. تأكد من صحة رقم الهاتف أو العنوان.\n3. انسخ رقم إشعار التحويل وضعه في خانة رقم العملية.`}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans text-xs outline-none focus:ring-2 focus:ring-[#7F00FF] leading-relaxed"
                />
                <p className="text-[10px] text-slate-400">
                  يمكنك كتابة أسطر متعددة وتعليمات مرقمة وستظهر للمستخدم بالترتيب تماماً.
                </p>
              </div>

              {/* 8. أيقونة طريقة الإيداع */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  رابط صورة أو أيقونة طريقة الإيداع (URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={methodModal.formData.icon || ''}
                    onChange={(e) =>
                      setMethodModal((prev) => ({
                        ...prev,
                        formData: { ...prev.formData, icon: e.target.value },
                      }))
                    }
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-[#7F00FF]"
                  />
                  {methodModal.formData.icon && (
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-1 shrink-0">
                      <img
                        src={methodModal.formData.icon}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 9 & 10. الرسوم مفعلة وقيمة الرسوم */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      الرسوم مفعلة للطريقة؟
                    </span>
                    <span className="text-[10.5px] text-slate-400">
                      خصم نسبة مئوية من المبلغ المحول لتغطية تكاليف التحويل
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!methodModal.formData.feeEnabled}
                      onChange={(e) =>
                        setMethodModal((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, feeEnabled: e.target.checked },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7F00FF]"></div>
                  </label>
                </div>

                {/* في حال كانت الرسوم مفعلة يتم تحديد قيمة الرسوم مثال 2% */}
                {methodModal.formData.feeEnabled && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1 animate-in fade-in">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      قيمة الرسوم المقتطعة (%) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={methodModal.formData.feePercentage ?? 2}
                        onChange={(e) =>
                          setMethodModal((prev) => ({
                            ...prev,
                            formData: {
                              ...prev.formData,
                              feePercentage: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        placeholder="مثال: 2"
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#7F00FF]"
                      />
                      <span className="absolute left-3 top-2 font-mono font-bold text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle IsActive */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    تفعيل الطريقة للزبائن
                  </span>
                  <span className="text-[10px] text-slate-400">
                    عند التعطيل لن تظهر الطريقة في نافذة الإيداع
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={methodModal.formData.isActive !== false}
                    onChange={(e) =>
                      setMethodModal((prev) => ({
                        ...prev,
                        formData: { ...prev.formData, isActive: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {methodModal.error && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl">
                  {methodModal.error}
                </p>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setMethodModal((prev) => ({ ...prev, isOpen: false }))}
                  disabled={methodModal.isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={methodModal.isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-[#7F00FF] to-indigo-700 text-white text-xs font-bold hover:brightness-110 shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {methodModal.isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{methodModal.isEditing ? 'حفظ التعديلات' : 'إضافة الطريقة'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
