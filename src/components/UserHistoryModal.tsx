import React, { useState } from 'react';
import { User, LogOut, Package, Clock, CheckCircle2, ChevronRight, Copy, Check, Zap } from 'lucide-react';
import { CustomerUser, OrderItem } from '../types';
import { formatPriceSyp } from '../utils/currencyUtils';

interface UserHistoryModalProps {
  isOpen: boolean;
  currentUser: CustomerUser | null;
  orders: OrderItem[];
  onClose: () => void;
  onLogout: () => void;
  onTrackOrder: (orderId: string) => void;
}

export const UserHistoryModal: React.FC<UserHistoryModalProps> = ({
  isOpen,
  currentUser,
  orders,
  onClose,
  onLogout,
  onTrackOrder,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#151221] rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-colors">
        <div className="h-2 bg-[#7F00FF] shrink-0" />

        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="p-5 sm:p-8 overflow-y-auto space-y-6">
          {/* User Profile Header */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#7F00FF] text-white flex items-center justify-center font-bold text-lg shadow-md shadow-[#7F00FF]/25 shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#1A1A1A] dark:text-white">{currentUser.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                {currentUser.phone && <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{currentUser.phone}</p>}
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>

          {/* Orders History List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#7F00FF] dark:text-purple-400" />
                <span>سجل طلباتك ({orders.length})</span>
              </h4>
            </div>

            {orders.length > 0 ? (
              <div className="space-y-2.5">
                {orders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-gray-50 dark:bg-white/5 hover:bg-gray-100/80 dark:hover:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-[#1A1A1A] dark:text-white">
                          {order.productName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <span>رقم الطلب:</span>
                          <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-400">#{order.orderId}</span>
                          <button
                            onClick={() => handleCopy(order.orderId)}
                            className="text-gray-400 hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer"
                            title="نسخ"
                          >
                            {copiedId === order.orderId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <span className="text-xs font-black text-[#7F00FF] dark:text-purple-400 font-mono shrink-0">
                        {formatPriceSyp(order.total, order.currency)}
                      </span>
                    </div>

                    {/* Dynamic Fields summary */}
                    {Object.entries(order.dynamicFields).map(([k, v]) => (
                      <div key={k} className="text-[11px] text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-200/50 dark:border-white/10 flex justify-between">
                        <span>{k}:</span>
                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{String(v)}</span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {new Date(order.createdAt).toLocaleString('ar-EG')}
                      </span>

                      <button
                        onClick={() => {
                          onClose();
                          onTrackOrder(order.orderId);
                        }}
                        className="text-xs font-bold text-[#7F00FF] dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3" />
                        <span>تتبع الحالة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 space-y-2">
                <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-xs text-gray-500 dark:text-gray-400">لم تقم بأي عمليات شراء بعد.</p>
                <button
                  onClick={onClose}
                  className="text-xs font-bold text-[#7F00FF] dark:text-purple-400 underline cursor-pointer"
                >
                  تصفح المنتجات وابدأ الشحن
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
