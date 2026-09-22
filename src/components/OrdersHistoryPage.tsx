import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Package, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Copy, 
  Check, 
  Zap, 
  ArrowRight, 
  LogIn, 
  ShoppingBag,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  Gamepad2,
  Filter,
  Phone,
  UserCheck,
  Hash,
  CreditCard,
  ChevronDown,
  Calendar,
  Trash2
} from 'lucide-react';
import { CustomerUser, OrderItem } from '../types';
import { formatPriceSyp } from '../utils/currencyUtils';
import { checkOrdersStatus, checkProcessingOrdersOnly, isProcessingStatus } from '../services/scStoreApi';
import { extractChargedAccount } from '../utils/orderUtils';

interface OrdersHistoryPageProps {
  currentUser: CustomerUser | null;
  orders: OrderItem[];
  onRefreshOrders?: () => void;
  onClearOrders?: () => void;
  onNavigateHome: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  initialQuery?: string;
}

export const OrdersHistoryPage: React.FC<OrdersHistoryPageProps> = React.memo(({
  currentUser,
  orders,
  onRefreshOrders,
  onClearOrders,
  onNavigateHome,
  onOpenAuth,
  initialQuery = '',
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live status checking state for arbitrary or specific order
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');
  const [isCheckingLiveStatus, setIsCheckingLiveStatus] = useState<boolean>(false);
  const [liveCheckResult, setLiveCheckResult] = useState<any | null>(null);
  const [liveCheckError, setLiveCheckError] = useState<string | null>(null);

  // Per-card status refresh loading state
  const [refreshingOrderId, setRefreshingOrderId] = useState<string | null>(null);
  const [customUpdatedStatuses, setCustomUpdatedStatuses] = useState<Record<string, string>>({});

  // Clear orders history confirmation state
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [isClearingOrders, setIsClearingOrders] = useState<boolean>(false);

  // Batch checking processing orders state
  const [isCheckingProcessingOnly, setIsCheckingProcessingOnly] = useState<boolean>(false);
  const [processingCheckFeedback, setProcessingCheckFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Calculate processing orders count
  const processingOrdersList = useMemo(() => {
    return orders.filter((o) => {
      const current = customUpdatedStatuses[o.orderId] || o.status;
      return isProcessingStatus(current);
    });
  }, [orders, customUpdatedStatuses]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      const s = (customUpdatedStatuses[o.orderId] || o.status || '').toLowerCase();
      return s.includes('complete') || s.includes('success') || s.includes('تم');
    }).length;
  }, [orders, customUpdatedStatuses]);

  const failedOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      const s = (customUpdatedStatuses[o.orderId] || o.status || '').toLowerCase();
      return s.includes('fail') || s.includes('reject') || s.includes('مرفوض') || s.includes('فشل');
    }).length;
  }, [orders, customUpdatedStatuses]);

  const filterOptions = useMemo(() => [
    {
      id: 'all' as const,
      label: 'الكل',
      count: orders.length,
      badgeColor: 'bg-purple-100 text-[#7F00FF] dark:bg-purple-900/50 dark:text-purple-300',
      dotColor: 'bg-[#7F00FF]',
    },
    {
      id: 'completed' as const,
      label: 'مكتمل',
      count: completedOrdersCount,
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      dotColor: 'bg-emerald-500',
    },
    {
      id: 'processing' as const,
      label: 'قيد المعالجة',
      count: processingOrdersList.length,
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      dotColor: 'bg-blue-500',
    },
    {
      id: 'failed' as const,
      label: 'مرفوض / ملغي',
      count: failedOrdersCount,
      badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      dotColor: 'bg-red-500',
    },
  ], [orders.length, completedOrdersCount, processingOrdersList.length, failedOrdersCount]);

  const currentFilterOption = useMemo(() => {
    return filterOptions.find((opt) => opt.id === statusFilter) || filterOptions[0];
  }, [filterOptions, statusFilter]);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check ONLY processing orders from SC Store API
  const handleCheckProcessingOrdersOnly = useCallback(async () => {
    if (processingOrdersList.length === 0) {
      setProcessingCheckFeedback({
        type: 'info',
        message: 'لا توجد أي طلبات قيد المعالجة حالياً. جميع طلباتك مكتملة أو نهائية.',
      });
      setTimeout(() => setProcessingCheckFeedback(null), 4000);
      return;
    }

    setIsCheckingProcessingOnly(true);
    setProcessingCheckFeedback(null);

    try {
      const res = await checkProcessingOrdersOnly(processingOrdersList, {
        userId: currentUser?.id,
      });

      if (res.success && res.orders && res.orders.length > 0) {
        const newStatuses: Record<string, string> = {};
        for (const ord of res.orders) {
          const ordId = ord.orderId || ord.id;
          if (ordId && ord.status) {
            newStatuses[ordId] = ord.status;
          }
        }
        setCustomUpdatedStatuses((prev) => ({ ...prev, ...newStatuses }));

        setProcessingCheckFeedback({
          type: 'success',
          message: `تم فحص ${res.totalChecked} طلب قيد المعالجة: ${res.completedCount || 0} مكتمل، ${res.stillProcessingCount || 0} ما زال قيد المعالجة.`,
        });

        // Trigger parent refresh to reload from database
        if (onRefreshOrders) {
          onRefreshOrders();
        }
      } else {
        setProcessingCheckFeedback({
          type: res.success ? 'info' : 'error',
          message: res.message || 'تم فحص الطلبات قيد المعالجة بنجاح.',
        });
      }
    } catch (err: any) {
      setProcessingCheckFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء فحص الطلبات قيد المعالجة',
      });
    } finally {
      setIsCheckingProcessingOnly(false);
      setTimeout(() => setProcessingCheckFeedback(null), 6000);
    }
  }, [processingOrdersList, currentUser?.id, onRefreshOrders]);

  // Optional background sync on mount if any orders are in processing
  useEffect(() => {
    if (processingOrdersList.length > 0) {
      // Auto check after short delay
      const timer = setTimeout(() => {
        handleCheckProcessingOrdersOnly();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []); // Run once on initial mount

  // Check specific order live status from API (Only if processing)
  const handleCheckOrderLiveStatus = async (orderIdToTrack: string) => {
    const q = orderIdToTrack.trim();
    if (!q) return;

    setRefreshingOrderId(q);
    setLiveCheckError(null);

    try {
      const response = await checkOrdersStatus(q);
      if (response.success && response.results) {
        let list: any[] = [];
        const raw = response.results;
        if (Array.isArray(raw)) list = raw;
        else if (raw.data && Array.isArray(raw.data)) list = raw.data;
        else if (raw.orders && Array.isArray(raw.orders)) list = raw.orders;
        else if (raw.order) list = [raw.order];
        else if (typeof raw === 'object') list = [raw];

        if (list.length > 0) {
          const fetchedStatus = list[0].status || 'completed';
          setCustomUpdatedStatuses((prev) => ({ ...prev, [q]: fetchedStatus }));
          setLiveCheckResult(list[0]);
          if (onRefreshOrders) onRefreshOrders();
        }
      } else {
        setLiveCheckError(response.error || `تعذر العثور على تحديث للطلب #${q}`);
      }
    } catch (e: any) {
      setLiveCheckError(e.message || 'حدث خطأ أثناء تحديث حالة الطلب');
    } finally {
      setRefreshingOrderId(null);
    }
  };

  // Status helper
  const getStatusBadge = (rawStatus: string) => {
    const s = String(rawStatus || '').toLowerCase();
    if (s.includes('complete') || s.includes('success') || s.includes('تم') || s.includes('ناجح')) {
      return {
        label: 'مكتمل',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }
    if (s.includes('process') || s.includes('جار') || s.includes('معالجة')) {
      return {
        label: 'قيد المعالجة',
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
        icon: <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse shrink-0" />,
      };
    }
    if (s.includes('pending') || s.includes('انتظار')) {
      return {
        label: 'قيد الانتظار',
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
        icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
      };
    }
    if (s.includes('fail') || s.includes('reject') || s.includes('فشل') || s.includes('مرفوض') || s.includes('cancel')) {
      return {
        label: 'مرفوض / ملغي',
        bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
        icon: <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />,
      };
    }
    return {
      label: rawStatus || 'قيد المتابعة',
      bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
      icon: <Clock className="w-3.5 h-3.5 text-[#7F00FF] dark:text-purple-400 shrink-0" />,
    };
  };

  // Format Arabic order date
  const formatOrderDate = (dateStr?: string | Date) => {
    if (!dateStr) return 'الآن';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateStr);
    }
  };

  // Helper for dynamic fields translation
  const getFriendlyFieldLabel = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('player') || k === 'player_id') return 'معرف اللاعب (Player ID)';
    if (k.includes('phone') || k.includes('mobile') || k === 'phone_number') return 'رقم الهاتف / المحفظة';
    if (k.includes('wallet')) return 'رقم المحفظة';
    if (k.includes('telegram') || k.includes('tg')) return 'معرف التلغرام';
    if (k.includes('email') || k.includes('mail')) return 'البريد الإلكتروني';
    if (k.includes('server') || k.includes('zone')) return 'الخادم / المنطقة';
    return key;
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesId = order.orderId.toLowerCase().includes(query) || order.id.toLowerCase().includes(query);
        const matchesProduct = order.productName.toLowerCase().includes(query);
        const matchesField = Object.values(order.dynamicFields || {}).some((v) =>
          String(v).toLowerCase().includes(query)
        );
        if (!matchesId && !matchesProduct && !matchesField) return false;
      }

      // 2. Status Filter
      const currentStatus = (customUpdatedStatuses[order.orderId] || order.status || '').toLowerCase();
      if (statusFilter === 'completed') {
        return currentStatus.includes('complete') || currentStatus.includes('success') || currentStatus.includes('تم');
      }
      if (statusFilter === 'processing') {
        return currentStatus.includes('process') || currentStatus.includes('pending') || currentStatus.includes('انتظار') || currentStatus.includes('جار');
      }
      if (statusFilter === 'failed') {
        return currentStatus.includes('fail') || currentStatus.includes('reject') || currentStatus.includes('مرفوض') || currentStatus.includes('فشل');
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, customUpdatedStatuses]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Guest Notice (If not logged in) */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7F00FF] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                قم بتسجيل الدخول لمزامنة سجل طلباتك الدائم
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سجل الدخول لحفظ جميع طلباتك في قاعدة البيانات ومتابعتها بسهولة من أي جهاز.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="orders-guest-login-btn"
            onClick={() => onOpenAuth('login')}
            className="px-4 py-2 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
        
        {/* Processing Check Feedback Alert */}
        {processingCheckFeedback && (
          <div
            className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
              processingCheckFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60'
                : processingCheckFeedback.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/60'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {processingCheckFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : processingCheckFeedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{processingCheckFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setProcessingCheckFeedback(null)}
              className="text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search Bar & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              id="orders-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الطلب، اسم المنتج، أو معرف اللاعب (Player ID)..."
              className="w-full pl-4 pr-11 py-2.5 sm:py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#7F00FF] dark:focus:border-purple-500 focus:bg-white dark:focus:bg-white/10 transition-all"
            />
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500 absolute right-3.5 top-3 sm:top-3.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 sm:top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>

          {/* Primary Action: Check Processing Orders Only */}
          {processingOrdersList.length > 0 && (
            <button
              type="button"
              id="check-processing-orders-btn"
              onClick={handleCheckProcessingOrdersOnly}
              disabled={isCheckingProcessingOnly}
              className="px-3 py-2.5 sm:py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-500 shadow-blue-500/20 disabled:opacity-50 shrink-0"
              title="فحص تحديثات الطلبات التي قيد التنفيذ فقط عبر API"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingProcessingOnly ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isCheckingProcessingOnly ? 'جارٍ الفحص...' : 'فحص المعلقة'}</span>
              <span className="px-1.5 py-0.5 text-[10px] font-black bg-white text-blue-700 rounded-full font-mono">
                {processingOrdersList.length}
              </span>
            </button>
          )}

          {/* Action: Delete / Clear Orders History */}
          <button
            type="button"
            id="clear-orders-history-btn"
            onClick={() => setShowClearConfirmModal(true)}
            disabled={orders.length === 0}
            className="p-2.5 sm:p-3 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 text-xs font-bold flex items-center justify-center transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="حذف سجل الطلبات"
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>

        {/* Status Dropdown List & Count */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              id="status-filter-dropdown-btn"
              onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#7F00FF] dark:text-purple-400" />
              <span>الحالة:</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${currentFilterOption.badgeColor}`}>
                {currentFilterOption.label} ({currentFilterOption.count})
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-[#1A1628] border border-slate-200 dark:border-white/15 rounded-2xl shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                {filterOptions.map((opt) => {
                  const isSelected = statusFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.id);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7F00FF]/10 dark:bg-purple-900/40 text-[#7F00FF] dark:text-purple-300'
                          : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${opt.dotColor}`} />
                        <span>{opt.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${opt.badgeColor}`}>
                          {opt.count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#7F00FF] dark:text-purple-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            عرض {filteredOrders.length} من {orders.length}
          </span>
        </div>
      </div>

      {/* Orders List / Cards */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const effectiveStatus = customUpdatedStatuses[order.orderId] || order.status || 'completed';
            const badge = getStatusBadge(effectiveStatus);
            const isRefreshingThis = refreshingOrderId === order.orderId;

            const chargedAccount = extractChargedAccount(order.dynamicFields, order.customerEmail || order.notes);

            return (
              <div
                key={order.orderId}
                className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:border-[#7F00FF]/40 dark:hover:border-purple-500/40 transition-all space-y-3.5"
              >
                {/* اسم المنتج المشحون والتصنيف */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                      <Gamepad2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {order.productName}
                      </h3>
                      {order.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 rounded-md border border-purple-200/60 dark:border-purple-800/60">
                          {order.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* الحقول بالترتيب المطلوب بدقة مباشرة داخل الكارد الرئيسي */}
                <div className="space-y-3 pt-1">
                  {/* 1. رقم الطلب الفريد */}
                  <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                      <Hash className="w-4 h-4 text-[#7F00FF] dark:text-purple-400 shrink-0" />
                      <span>رقم الطلب الفريد:</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-mono font-black text-[#7F00FF] dark:text-purple-300 text-xs sm:text-sm dir-ltr">
                        #{order.orderId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(order.orderId)}
                        className="text-slate-400 hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors p-1 rounded-md cursor-pointer"
                        title="نسخ رقم الطلب الفريد"
                      >
                        {copiedId === order.orderId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2. السعر */}
                  <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                      <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>السعر:</span>
                    </div>
                    <span className="font-black font-mono text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                      {formatPriceSyp(order.total, order.currency)}
                    </span>
                  </div>

                  {/* 3. الحساب المشحون (رقم هاتف أو ID / معرف اللاعب حسب الخدمة) */}
                  <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                      {chargedAccount.isPhone ? (
                        <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-[#7F00FF] dark:text-purple-400 shrink-0" />
                      )}
                      <span>
                        {chargedAccount.isPhone
                          ? 'الحساب المشحون (رقم هاتف):'
                          : 'الحساب المشحون (ID / معرف اللاعب):'}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm dir-ltr">
                        {chargedAccount.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(chargedAccount.value)}
                        className="text-slate-400 hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors p-1 rounded-md cursor-pointer"
                        title="نسخ بيانات الحساب المشحون"
                      >
                        {copiedId === chargedAccount.value ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* تفاصيل إضافية إن وجدت (مثل الخادم / المنطقة) */}
                  {order.dynamicFields && Object.keys(order.dynamicFields).length > 1 && (
                    <div className="space-y-2">
                      {Object.entries(order.dynamicFields)
                        .filter(([key, value]) => String(value).trim() !== chargedAccount.value)
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              {getFriendlyFieldLabel(key)}:
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* 4. تاريخ الطلب */}
                  <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                      <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                      <span>تاريخ الطلب:</span>
                    </div>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm">
                      {formatOrderDate(order.createdAt)}
                    </span>
                  </div>

                  {/* 5. حالة الطلب (مكتمل أو قيد المعالجة أو مرفوض) */}
                  <div className="flex items-center justify-between gap-3 text-xs sm:text-sm pt-1">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                      <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                      <span>حالة الطلب:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </div>

                      {/* زر التحقق من حالة الطلب إذا كان قيد المعالجة */}
                      {isProcessingStatus(effectiveStatus) ? (
                        <button
                          type="button"
                          onClick={() => handleCheckOrderLiveStatus(order.orderId)}
                          disabled={isRefreshingThis}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold flex items-center gap-1 text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshingThis ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">{isRefreshingThis ? 'جارٍ الفحص...' : 'فحص الحالة'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCheckOrderLiveStatus(order.orderId)}
                          disabled={isRefreshingThis}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="إعادة فحص حالة الطلب"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingThis ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
            <Package className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
              {searchQuery || statusFilter !== 'all'
                ? 'لا توجد طلبات تطابق معايير البحث'
                : 'لم تقم بأي عمليات شحن بعد'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {searchQuery || statusFilter !== 'all'
                ? 'جرب تغيير نص البحث أو إزالة تصفية الحالة لعرض كل الطلبات.'
                : 'استكشف قائمة الألعاب والبطاقات الرقمية المتاحة وابدأ شحن حساباتك بسرعة وأمان.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            {searchQuery || statusFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                إعادة ضبط البحث
              </button>
            ) : (
              <button
                type="button"
                id="empty-orders-start-btn"
                onClick={onNavigateHome}
                className="px-6 py-3 rounded-2xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#7F00FF]/25 flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>تصفح المنتجات وشحن الحسابات</span>
                <ArrowRight className="w-4 h-4 mr-0.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Orders */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1628] border border-slate-200 dark:border-white/15 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-800/60 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                حذف سجل الطلبات
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف جميع الطلبات من السجل؟ لا يمكن التراجع عن هذه العملية بعد التأكيد.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                id="confirm-clear-orders-btn"
                onClick={async () => {
                  try {
                    setIsClearingOrders(true);
                    if (onClearOrders) {
                      await onClearOrders();
                    } else {
                      localStorage.removeItem('nexen_orders_history');
                    }
                    setProcessingCheckFeedback({
                      type: 'success',
                      message: 'تم حذف سجل الطلبات بنجاح.',
                    });
                  } catch (e) {
                    setProcessingCheckFeedback({
                      type: 'error',
                      message: 'حدث خطأ أثناء محاولة حذف السجل.',
                    });
                  } finally {
                    setIsClearingOrders(false);
                    setShowClearConfirmModal(false);
                  }
                }}
                disabled={isClearingOrders}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isClearingOrders ? 'جارٍ الحذف...' : 'نعم، حذف السجل'}
              </button>
              <button
                type="button"
                id="cancel-clear-orders-btn"
                onClick={() => setShowClearConfirmModal(false)}
                disabled={isClearingOrders}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

OrdersHistoryPage.displayName = 'OrdersHistoryPage';

