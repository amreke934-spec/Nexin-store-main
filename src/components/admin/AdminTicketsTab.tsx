import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  User,
  Mail,
  Phone,
  AlertTriangle,
  Package,
  Wallet,
  Settings,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Edit3,
  X,
  ShieldCheck,
} from 'lucide-react';
import { CustomerUser, SupportTicket } from '../../types';
import {
  fetchSupportTickets,
  replySupportTicket,
  deleteSupportTicket,
  updateSupportTicketStatus,
} from '../../services/dbApi';

interface AdminTicketsTabProps {
  currentUser: CustomerUser | null;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  chat: { label: 'محادثة دعم', icon: MessageSquare, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' },
  order: { label: 'شحن طلب', icon: Package, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' },
  deposit: { label: 'إيداع / رصيد', icon: Wallet, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
  account: { label: 'حساب / تسجيل', icon: User, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' },
  technical: { label: 'عطل فني', icon: Settings, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' },
  suggestion: { label: 'اقتراح', icon: Sparkles, color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800' },
  other: { label: 'أخرى', icon: HelpCircle, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800' },
};

export const AdminTicketsTab: React.FC<AdminTicketsTabProps> = ({ currentUser }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Replying state
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<string>('resolved');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Quick feedback alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchSupportTickets({ isAdmin: true });
      if (res.success) {
        setTickets(res.tickets);
      } else {
        setFeedback({ type: 'error', message: res.error || 'تعذر تحميل البلاغات' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'حدث خطأ أثناء تحميل البلاغات' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartReply = (ticket: SupportTicket) => {
    setReplyingTicketId(ticket.id);
    setReplyText(ticket.adminReply || '');
    setReplyStatus(ticket.status === 'resolved' ? 'resolved' : 'resolved');
  };

  const handleCancelReply = () => {
    setReplyingTicketId(null);
    setReplyText('');
  };

  const handleSubmitReply = async (ticketId: string) => {
    if (!replyText.trim()) {
      setFeedback({ type: 'error', message: 'يرجى كتابة نص الرد أولاً' });
      return;
    }

    setIsSubmittingReply(true);
    setFeedback(null);

    try {
      const supportSenderTitle = 'فريق الدعم الفني | Nexen Support';

      const res = await replySupportTicket(ticketId, replyText.trim(), replyStatus, supportSenderTitle);

      if (res.success) {
        setFeedback({ type: 'success', message: 'تم إرسال الرد وحفظه بنجاح وسيظهر للعميل فوراً!' });
        setReplyingTicketId(null);
        setReplyText('');
        loadTickets();
      } else {
        setFeedback({ type: 'error', message: res.error || 'فشل إرسال الرد' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'حدث خطأ أثناء الرد' });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا البلاغ نهائياً؟')) {
      return;
    }

    try {
      const res = await deleteSupportTicket(ticketId);
      if (res.success) {
        setFeedback({ type: 'success', message: 'تم حذف البلاغ بنجاح' });
        loadTickets();
      } else {
        setFeedback({ type: 'error', message: res.error || 'تعذر حذف البلاغ' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'حدث خطأ أثناء حذف البلاغ' });
    }
  };

  const handleStatusToggle = async (ticketId: string, newStatus: string) => {
    try {
      const res = await updateSupportTicketStatus(ticketId, newStatus);
      if (res.success) {
        loadTickets();
      }
    } catch {
      // ignore
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    // Status filter
    if (statusFilter === 'pending' && (t.status === 'resolved' || !!t.adminReply)) return false;
    if (statusFilter === 'resolved' && !(t.status === 'resolved' || !!t.adminReply)) return false;

    // Category filter
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = t.userName?.toLowerCase().includes(q);
      const matchEmail = t.userEmail?.toLowerCase().includes(q);
      const matchPhone = t.userPhone?.toLowerCase().includes(q);
      const matchId = t.id?.toLowerCase().includes(q);
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchMessage = t.message?.toLowerCase().includes(q);
      const matchReply = t.adminReply?.toLowerCase().includes(q);

      if (!matchName && !matchEmail && !matchPhone && !matchId && !matchSubject && !matchMessage && !matchReply) {
        return false;
      }
    }

    return true;
  });

  const totalTickets = tickets.length;
  const pendingTickets = tickets.filter((t) => !t.adminReply && t.status !== 'resolved').length;
  const resolvedTickets = tickets.filter((t) => !!t.adminReply || t.status === 'resolved').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tickets */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي البلاغات</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalTickets}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] flex items-center justify-center">
            <LifeBuoy className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">بانتظار الرد (معلقة)</span>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingTickets}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Resolved Tickets */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">تم الرد والحل</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{resolvedTickets}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Filter Bar & Search */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ابحث برقم البلاغ، اسم العميل، الإيميل، رقم الهاتف، أو نص المشكلة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-4 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadTickets}
            disabled={isLoading}
            className="h-11 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث البلاغات</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold ml-2">
            <Filter className="w-3.5 h-3.5" />
            <span>الحالة:</span>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#7F00FF] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            الكل ({tickets.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            <span>بانتظار الرد ({pendingTickets})</span>
            {pendingTickets > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('resolved')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            تم الرد والحل ({resolvedTickets})
          </button>

          {/* Category Dropdown */}
          <div className="mr-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-bold focus:outline-none focus:border-[#7F00FF]"
            >
              <option value="all">كل التصنيفات</option>
              <option value="order">شحن طلب</option>
              <option value="deposit">إيداع / رصيد</option>
              <option value="account">حساب / تسجيل</option>
              <option value="technical">عطل فني</option>
              <option value="suggestion">اقتراح</option>
              <option value="other">أخرى</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Tickets List */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7F00FF]" />
          <p className="text-xs sm:text-sm font-bold">جاري تحميل البلاغات...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-3xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#7F00FF] flex items-center justify-center mx-auto">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            لا توجد بلاغات تطابق الفلتر الحالي
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            أي بلاغ يتم تقديمه من قبل المستخدمين في الإعدادات سيصل إلى هنا مباشرة لتتمكن من مراجعته والرد عليه.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((t) => {
            const isResolved = t.status === 'resolved' || !!t.adminReply;
            const catInfo = CATEGORY_MAP[t.category] || CATEGORY_MAP.other;
            const CatIcon = catInfo.icon;
            const isReplyingCurrent = replyingTicketId === t.id;

            return (
              <div
                key={t.id}
                className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-xs ${
                  isResolved
                    ? 'bg-white dark:bg-[#151221] border-slate-200/80 dark:border-white/10'
                    : 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-300/80 dark:border-amber-700/60 ring-1 ring-amber-400/20'
                }`}
              >
                {/* Top Row: Ticket ID, Category, Priority, and Status */}
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-[#7F00FF] bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-xl border border-purple-200 dark:border-purple-800/50">
                      #{t.id}
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${catInfo.color}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                      <span>{catInfo.label}</span>
                    </span>

                    {t.priority === 'urgent' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span>عاجل</span>
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(t.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    {t.adminReply ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم الرد والحل ✅</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>بانتظار ردك ⏳</span>
                      </span>
                    )}

                    {/* Delete Ticket Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      title="حذف البلاغ"
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Customer Details Pill Card */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    {/* Customer Name */}
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold">
                      <User className="w-3.5 h-3.5 text-purple-500" />
                      <span>{t.userName}</span>
                      {t.userId && (
                        <span className="text-[10px] text-slate-400 font-mono">({t.userId})</span>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      <a href={`mailto:${t.userEmail}`} className="hover:underline">
                        {t.userEmail}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(t.userEmail, `email-${t.id}`)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="نسخ الإيميل"
                      >
                        {copiedId === `email-${t.id}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Phone (WhatsApp) */}
                    {t.userPhone && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <a
                          href={`https://wa.me/${t.userPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-emerald-500"
                        >
                          {t.userPhone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Problem Subject & Full Message */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {t.subject}
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-normal">
                    {t.message}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* EXISTING ADMIN REPLY (IF REPLIED)                         */}
                {/* ========================================================= */}
                {t.adminReply && !isReplyingCurrent && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-purple-50/20 dark:from-emerald-950/30 dark:to-purple-950/20 border-2 border-emerald-400/50 dark:border-emerald-700/60 space-y-2.5 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                          رد الدعم الفني ({(!t.repliedBy || t.repliedBy.includes('m74321176') || t.repliedBy.includes('محمد جعفر') || t.repliedBy.includes('@')) ? 'فريق الدعم الفني | Nexen Support' : t.repliedBy}):
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.repliedAt && (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                            {new Date(t.repliedAt).toLocaleString('ar-EG')}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartReply(t)}
                          className="text-xs text-[#7F00FF] hover:underline flex items-center gap-1 font-bold cursor-pointer bg-white/80 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>تعديل الرد</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40">
                      {t.adminReply}
                    </p>
                  </div>
                )}

                {/* ========================================================= */}
                {/* INLINE REPLY FORM                                         */}
                {/* ========================================================= */}
                {isReplyingCurrent ? (
                  <div className="mt-4 p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-[#7F00FF]" />
                        <span>اكتب ردك على هذه المشكلة (سيظهر مباشرة في حساب العميل):</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleCancelReply}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      placeholder="اكتب ردك الواضح والشامل للعميل هنا (مثال: تم فحص الطلب وإعادة الشحن بنجاح، أو تم تصحيح الرصيد)..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] resize-none leading-relaxed"
                    />

                    {/* Reply Options & Actions */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">حالة البلاغ بعد الرد:</span>
                        <select
                          value={replyStatus}
                          onChange={(e) => setReplyStatus(e.target.value)}
                          className="h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#7F00FF]"
                        >
                          <option value="resolved">تم الحل والرد (Resolved) ✅</option>
                          <option value="in_progress">قيد المتابعة والمعالجة (In Progress) ⏳</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelReply}
                          className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitReply(t.id)}
                          disabled={isSubmittingReply}
                          className="h-9 px-4 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#7F00FF]/25 cursor-pointer"
                        >
                          {isSubmittingReply ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>جاري الحفظ...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>إرسال الرد للعميل</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  !t.adminReply && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleStartReply(t)}
                        className="py-2.5 px-4 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>الرد على هذه المشكلة الآن</span>
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
