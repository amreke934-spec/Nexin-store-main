import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle2, Clock, AlertCircle, XCircle, Copy, Check, Sparkles } from 'lucide-react';
import { OrderItem } from '../types';
import { checkOrdersStatus } from '../services/scStoreApi';
import { formatPriceSyp } from '../utils/currencyUtils';

interface OrderTrackingSectionProps {
  initialOrderId?: string;
  userOrders: OrderItem[];
}

export const OrderTrackingSection: React.FC<OrderTrackingSectionProps> = ({
  initialOrderId = '',
  userOrders,
}) => {
  const [orderQuery, setOrderQuery] = useState(initialOrderId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderId) {
      setOrderQuery(initialOrderId);
      handleSearch(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSearch = async (queryToUse?: string) => {
    const q = (queryToUse !== undefined ? queryToUse : orderQuery).trim();
    if (!q) {
      setError('يرجى كتابة رقم الطلب أو أرقام متعددة مفصولة بنقطتين ( : )');
      return;
    }

    setIsLoading(true);
    setError(null);
    setQueryResults(null);

    try {
      const response = await checkOrdersStatus(q);

      if (response.success && response.results) {
        const raw = response.results;
        let list: any[] = [];
        if (Array.isArray(raw)) {
          list = raw;
        } else if (raw.data && Array.isArray(raw.data)) {
          list = raw.data;
        } else if (raw.orders && Array.isArray(raw.orders)) {
          list = raw.orders;
        } else if (raw.order) {
          list = [raw.order];
        } else if (typeof raw === 'object') {
          list = [raw];
        }

        setQueryResults(list);
      } else {
        // If not found in remote API, also check our local stored orders
        const ids = q.split(':').map((s) => s.trim().toLowerCase());
        const localMatches = userOrders.filter((o) =>
          ids.some((id) => o.orderId.toLowerCase() === id || o.id.toLowerCase() === id)
        );

        if (localMatches.length > 0) {
          setQueryResults(
            localMatches.map((m) => ({
              orderId: m.orderId,
              productId: m.productId,
              productName: m.productName,
              qty: m.qty,
              total: m.total,
              currency: m.currency,
              status: m.status,
              dynamicFields: m.dynamicFields,
              createdAt: m.createdAt,
            }))
          );
        } else {
          setError(
            response.error ||
              `لم يتم العثور على أي نتائج للطلب #${q}. يرجى التحقق من صحة رقم الطلب المحفوظ لديك.`
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الاستعلام عن الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('complete') || s.includes('success') || s.includes('تم') || s.includes('ناجح')) {
      return {
        label: 'مكتمل وشُحن بنجاح',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }
    if (s.includes('process') || s.includes('جار') || s.includes('معالجة')) {
      return {
        label: 'قيد المعالجة والإرسال',
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
        icon: <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse shrink-0" />,
      };
    }
    if (s.includes('pending') || s.includes('انتظار')) {
      return {
        label: 'قيد الانتظار',
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
        icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
      };
    }
    if (s.includes('fail') || s.includes('reject') || s.includes('فشل') || s.includes('مرفوض') || s.includes('cancel')) {
      return {
        label: 'مرفوض / لم يتم الشحن',
        bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
        icon: <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />,
      };
    }
    return {
      label: status || 'غير معروف',
      bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
      icon: <Clock className="w-4 h-4 text-[#7F00FF] dark:text-purple-400 shrink-0" />,
    };
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Info */}
      <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#7F00FF] dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-purple-100 dark:border-purple-800/40">
              خدمة الاستعلام الفوري
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-[#1A1A1A] dark:text-white mt-2">
              تتبع حالة طلبات الشحن
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              استعلم عن طلبك فورياً باستخدام رقم الطلب، أو ابحث عن عدة طلبات دفعة واحدة بفصلها بنقطتين (مثال: <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[#7F00FF] dark:text-purple-300">id1:id2</code>).
            </p>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <input
                id="order-tracking-input"
                type="text"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                placeholder="أدخل رقم الطلب هنا (مثال: NX-992014)"
                className="w-full pl-4 pr-11 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-[#1A1A1A] dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#7F00FF] dark:focus:border-purple-500 focus:bg-white dark:focus:bg-white/10 transition-all shadow-inner"
              />
              <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-3.5 top-3.5" />
            </div>

            <button
              id="submit-order-search-btn"
              type="submit"
              disabled={isLoading}
              className="bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#7F00FF]/25 cursor-pointer shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ البحث...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>استعلام فوري</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Quick Recent Chips from current user session */}
        {userOrders.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-400 dark:text-gray-500 font-medium">طلباتك الأخيرة:</span>
            {userOrders.slice(0, 4).map((order) => (
              <button
                key={order.orderId}
                type="button"
                onClick={() => {
                  setOrderQuery(order.orderId);
                  handleSearch(order.orderId);
                }}
                className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold border border-purple-200/60 dark:border-purple-800/40 transition-colors cursor-pointer"
              >
                <span>#{order.orderId}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">({order.productName})</span>
              </button>
            ))}

            {userOrders.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  const multi = userOrders.slice(0, 3).map((o) => o.orderId).join(':');
                  setOrderQuery(multi);
                  handleSearch(multi);
                }}
                className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-[#7F00FF] dark:hover:text-purple-300 underline font-medium cursor-pointer"
              >
                تتبع الكل
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 sm:p-5 text-red-700 dark:text-red-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-1">
            <h4 className="font-bold">تعذر العثور على الطلب</h4>
            <p className="text-red-600 dark:text-red-300 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Results View */}
      {queryResults && queryResults.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#7F00FF] dark:text-purple-400" />
              <span>نتائج الاستعلام ({queryResults.length} طلب)</span>
            </h3>
          </div>

          {/* Order Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {queryResults.map((item, idx) => {
              const orderId = item.orderId || item.id || item._id || `ORD-${idx + 1}`;
              const status = item.status || 'completed';
              const badge = getStatusBadge(status);
              const fields = item.dynamicFields || {};

              return (
                <div
                  key={orderId + idx}
                  className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#7F00FF]/40 dark:hover:border-purple-500/40 transition-all space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100 dark:border-white/10">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">رقم الطلب:</span>
                        <strong className="font-mono text-sm text-[#7F00FF] dark:text-purple-400 font-bold">
                          #{orderId}
                        </strong>
                        <button
                          onClick={() => handleCopy(String(orderId))}
                          className="p-1 text-gray-400 hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer"
                          title="نسخ"
                        >
                          {copiedId === String(orderId) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('ar-EG') : 'بتاريخ اليوم'}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border ${badge.bg}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                  </div>

                  {/* Order Details Body */}
                  <div className="space-y-2 text-xs">
                    {item.productName && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">المنتج:</span>
                        <span className="font-bold text-[#1A1A1A] dark:text-white">{item.productName}</span>
                      </div>
                    )}

                    {item.qty && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">الكمية:</span>
                        <span className="font-bold text-[#1A1A1A] dark:text-white">{item.qty}</span>
                      </div>
                    )}

                    {/* Dynamic Fields (e.g. Player_ID, Phone, etc) */}
                    {(() => {
                      const getFriendlyFieldLabel = (key: string) => {
                        const k = key.toLowerCase();
                        if (k.includes('player') || k === 'player_id') return 'معرف اللاعب (Player ID)';
                        if (k.includes('phone') || k.includes('mobile') || k === 'phone_number') return 'رقم الهاتف / المحفظة';
                        if (k.includes('wallet')) return 'رقم المحفظة';
                        if (k.includes('telegram') || k.includes('tg')) return 'معرف التلغرام';
                        if (k.includes('email') || k.includes('mail')) return 'البريد الإلكتروني';
                        return key;
                      };

                      if (Object.keys(fields).length > 0) {
                        return Object.entries(fields).map(([k, v]) => (
                          <div key={k} className="flex justify-between bg-purple-50/50 dark:bg-purple-950/30 p-2 rounded-xl border border-purple-100 dark:border-purple-800/30">
                            <span className="text-gray-600 dark:text-gray-300">{getFriendlyFieldLabel(k)}:</span>
                            <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300">{String(v)}</span>
                          </div>
                        ));
                      } else if (item.Player_ID) {
                        return (
                          <div className="flex justify-between bg-purple-50/50 dark:bg-purple-950/30 p-2 rounded-xl border border-purple-100 dark:border-purple-800/30">
                            <span className="text-gray-600 dark:text-gray-300">معرف الحساب / اللاعب:</span>
                            <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300">{item.Player_ID}</span>
                          </div>
                        );
                      } else if (item.mobile || item.phone_number) {
                        return (
                          <div className="flex justify-between bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                            <span className="text-gray-600 dark:text-gray-300">رقم الهاتف المحمول:</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-300">{item.mobile || item.phone_number}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {item.total && (
                      <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-white/10 font-bold">
                        <span className="text-gray-700 dark:text-gray-300">المبلغ:</span>
                        <span className="font-mono text-[#7F00FF] dark:text-purple-400">
                          {formatPriceSyp(typeof item.total === 'number' ? item.total : parseFloat(item.total) || 0, item.currency || 'USD')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Refresh this specific status */}
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      onClick={() => handleSearch(String(orderId))}
                      className="text-[11px] text-[#7F00FF] dark:text-purple-400 hover:text-[#6b00d6] dark:hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>تحديث الحالة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
