import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ShoppingBag,
  Clock,
  UserCheck,
  Phone,
  Wallet,
  X,
  ExternalLink,
} from 'lucide-react';
import { OrderItem } from '../types';
import { extractChargedAccount } from '../utils/orderUtils';
import { formatPriceSyp, formatSypNumber } from '../utils/currencyUtils';

interface OrderSuccessModalProps {
  isOpen: boolean;
  order: OrderItem | null;
  onClose: () => void;
  onNavigateToTracking?: (orderId: string) => void;
  onNavigateHome?: () => void;
  remainingBalance?: number | null;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  order,
  onClose,
  onNavigateToTracking,
  onNavigateHome,
  remainingBalance,
}) => {
  const [copiedId, setCopiedId] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const charged = extractChargedAccount(order.dynamicFields);

  const handleCopyOrderId = () => {
    if (!order.orderId) return;
    navigator.clipboard.writeText(order.orderId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('ar-SY', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      id="order-success-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="order-success-modal-card"
        className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#151221] rounded-2xl sm:rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xl shadow-emerald-950/20 transform transition-all duration-300 animate-in zoom-in-95 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white text-center relative">
          <button
            id="order-success-close-x-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Success Badge */}
          <div className="w-16 h-16 rounded-full bg-white text-emerald-600 mx-auto flex items-center justify-center shadow-lg ring-8 ring-white/20 mb-3 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            تم إرسال الطلب بنجاح!
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xs mx-auto">
            تم استلام بيانات طلبك بنجاح وجارٍ تنفيذه آلياً عبر السيرفر
          </p>
        </div>

        {/* Modal Body & Receipt Details */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Detailed receipt card */}
          <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 text-right space-y-3 text-xs sm:text-sm">
            {/* 1. اسم المنتج / الخدمة */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10 gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                <ShoppingBag className="w-4 h-4 text-[#7F00FF] dark:text-purple-400" />
                <span>المنتج المشحون:</span>
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white truncate">
                {order.productName}
              </span>
            </div>

            {/* 2. رقم الطلب الفريد مع زر النسخ */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">رقم الطلب الفريد:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#7F00FF] dark:text-purple-300">
                  #{order.orderId}
                </span>
                <button
                  id="order-success-copy-order-id-btn"
                  type="button"
                  onClick={handleCopyOrderId}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  title="نسخ رقم الطلب"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. الحساب المشحون */}
            {charged.value && (
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10 gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  {charged.isPhone ? <Phone className="w-4 h-4 text-emerald-500" /> : <UserCheck className="w-4 h-4 text-blue-500" />}
                  <span>{charged.label}:</span>
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white dir-ltr truncate">
                  {charged.value}
                </span>
              </div>
            )}

            {/* 4. الكمية إذا كانت أكثر من 1 */}
            {order.qty > 1 && (
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400 font-medium">الكمية:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {order.qty}
                </span>
              </div>
            )}

            {/* 5. المبلغ الإجمالي بالليرة السورية */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">المبلغ الإجمالي:</span>
              <span className="font-mono font-black text-sm sm:text-base text-[#7F00FF] dark:text-purple-400">
                {formatPriceSyp(order.total, order.currency)}
              </span>
            </div>

            {/* 6. حالة الطلب */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">حالة الطلب:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                <Clock className="w-3.5 h-3.5" />
                <span>قيد المعالجة والتنفيذ الآلي</span>
              </span>
            </div>

            {/* 7. تاريخ ووقت الإرسال */}
            {formattedDate && (
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400 font-medium">وقت الإرسال:</span>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                  {formattedDate}
                </span>
              </div>
            )}

            {/* 8. رصيد المحفظة المتبقي إن وجد */}
            {remainingBalance !== undefined && remainingBalance !== null && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <span>رصيد المحفظة المتبقي:</span>
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                  {formatSypNumber(remainingBalance)} ل.س
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {onNavigateToTracking && (
              <button
                id="order-success-track-action-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToTracking(order.orderId);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>متابعة حالة الطلب</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {onNavigateHome && (
              <button
                id="order-success-home-action-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateHome();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>العودة إلى المتجر</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
