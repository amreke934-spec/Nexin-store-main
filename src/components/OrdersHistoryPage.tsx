import React, { useState, useMemo } from 'react';
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
  Gamepad2
} from 'lucide-react';
import { CustomerUser, OrderItem } from '../types';
import { formatPriceSyp } from '../utils/currencyUtils';
import { checkOrdersStatus } from '../services/scStoreApi';

interface OrdersHistoryPageProps {
  currentUser: CustomerUser | null;
  orders: OrderItem[];
  onRefreshOrders?: () => void;
  onNavigateHome: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  initialQuery?: string;
}

export const OrdersHistoryPage: React.FC<OrdersHistoryPageProps> = React.memo(({
  currentUser,
  orders,
  onRefreshOrders,
  onNavigateHome,
  onOpenAuth,
  initialQuery = '',
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live status checking state for arbitrary or specific order
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');
  const [isCheckingLiveStatus, setIsCheckingLiveStatus] = useState<boolean>(false);
  const [liveCheckResult, setLiveCheckResult] = useState<any | null>(null);
  const [liveCheckError, setLiveCheckError] = useState<string | null>(null);

  // Per-card status refresh loading state
  const [refreshingOrderId, setRefreshingOrderId] = useState<string | null>(null);
  const [customUpdatedStatuses, setCustomUpdatedStatuses] = useState<Record<string, string>>({});

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check specific order live status from API
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
        label: 'مكتمل وشُحن بنجاح',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }
    if (s.includes('process') || s.includes('جار') || s.includes('معالجة')) {
      return {
        label: 'قيد المعالجة والإرسال',
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
        label: 'مرفوض / لم يتم الشحن',
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
      
      {/* Top Banner & Title Bar */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 dark:from-[#151221] dark:via-[#13111C] dark:to-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#7F00FF] dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/70 px-3 py-1 rounded-full uppercase tracking-wider border border-purple-200/60 dark:border-purple-800/40 inline-flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                <span>سجل المشتريات والطلبات</span>
              </span>
              {orders.length > 0 && (
                <span className="bg-[#7F00FF] text-white text-xs font-bold font-mono px-2.5 py-0.5 rounded-full shadow-xs">
                  {orders.length} طلب
                </span>
              )}
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              سجل طلباتي
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              تصفح ومتابعة كافة طلبات الشحن والبطاقات الرقمية السابقة، مع إمكانية التحقق المباشر من حالة التسليم فورياً عبر SC Store API.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {onRefreshOrders && (
              <button
                type="button"
                id="refresh-orders-list-btn"
                onClick={onRefreshOrders}
                className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                title="تحديث القائمة من قاعدة البيانات"
              >
                <RefreshCw className="w-4 h-4 text-[#7F00FF] dark:text-purple-400" />
                <span className="hidden sm:inline">تحديث السجل</span>
              </button>
            )}

            <button
              type="button"
              id="orders-go-home-btn"
              onClick={onNavigateHome}
              className="px-4 py-2.5 rounded-2xl bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-[#7F00FF]/25 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>تصفح المتجر</span>
            </button>
          </div>
        </div>
      </div>

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
      <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Search Bar */}
        <div className="relative">
          <input
            id="orders-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطلب، اسم المنتج، أو معرف اللاعب (Player ID)..."
            className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#7F00FF] dark:focus:border-purple-500 focus:bg-white dark:focus:bg-white/10 transition-all"
          />
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute right-3.5 top-3.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 cursor-pointer"
            >
              مسح
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>الحالة:</span>
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#7F00FF] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              الكل ({orders.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              مكتمل
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'processing'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
            >
              قيد المعالجة
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('failed')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'failed'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
              }`}
            >
              مرفوض / ملغي
            </button>
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

            return (
              <div
                key={order.orderId}
                className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:border-[#7F00FF]/40 dark:hover:border-purple-500/40 transition-all space-y-3.5"
              >
                {/* Header: Product Name + Status Badge + Price */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {order.productName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          <span>رقم الطلب:</span>
                          <strong className="font-mono font-bold text-[#7F00FF] dark:text-purple-400">
                            #{order.orderId}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleCopy(order.orderId)}
                            className="text-slate-400 hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="نسخ رقم الطلب"
                          >
                            {copiedId === order.orderId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1.5 shrink-0">
                    <span className="text-sm sm:text-base font-black font-mono text-[#7F00FF] dark:text-purple-300">
                      {formatPriceSyp(order.total, order.currency)}
                    </span>
                    
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border ${badge.bg}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Fields / Player ID Pills */}
                {order.dynamicFields && Object.keys(order.dynamicFields).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(order.dynamicFields).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {getFriendlyFieldLabel(key)}:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-purple-900 dark:text-purple-200">
                            {String(value)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(value))}
                            className="text-slate-400 hover:text-[#7F00FF] p-0.5 rounded cursor-pointer"
                            title="نسخ"
                          >
                            {copiedId === String(value) ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer of Card: Date & Live Status Refresh */}
                <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100 dark:border-white/10">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                    تاريخ الطلب: {order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : 'الآن'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCheckOrderLiveStatus(order.orderId)}
                    disabled={isRefreshingThis}
                    className="text-[#7F00FF] dark:text-purple-400 hover:text-[#6b00d6] dark:hover:text-purple-300 font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingThis ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingThis ? 'جارٍ التحقق...' : 'تحديث الحالة من الـ API'}</span>
                  </button>
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

    </div>
  );
});

OrdersHistoryPage.displayName = 'OrdersHistoryPage';

