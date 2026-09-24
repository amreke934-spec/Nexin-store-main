import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  AlertCircle,
  Send,
  Clock,
  CheckCircle2,
  MessageSquare,
  LifeBuoy,
  RefreshCw,
  User,
  Mail,
  Phone,
  HelpCircle,
  Package,
  Wallet,
  Settings,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ImageIcon,
  UploadCloud,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { CustomerUser, SupportTicket } from '../types';
import { createSupportTicket, fetchSupportTickets } from '../services/dbApi';
import { compressImageFile } from '../utils/imageCompressor';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CustomerUser | null;
}

const CATEGORIES = [
  { id: 'order', label: 'مشكلة في شحن طلب', icon: Package, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  { id: 'deposit', label: 'مشكلة في الإيداع أو الرصيد', icon: Wallet, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  { id: 'account', label: 'مشكلة في الحساب والتسجيل', icon: User, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  { id: 'technical', label: 'عطل فني في الموقع', icon: Settings, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  { id: 'suggestion', label: 'اقتراح أو ملاحظة', icon: Sparkles, color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800' },
  { id: 'other', label: 'أخرى', icon: HelpCircle, color: 'text-slate-500 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' },
];

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Form State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [category, setCategory] = useState<string>('order');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  // Images attachment state
  const [images, setImages] = useState<string[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string; ticketId?: string } | null>(null);

  // Tickets History
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Pre-fill user data when opened
  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setUserName(currentUser.name || '');
        setUserEmail(currentUser.email || '');
        setUserPhone(currentUser.phone || '');
      }
      setFeedback(null);
      loadUserTickets();
    }
  }, [isOpen, currentUser]);

  const loadUserTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      // Find stored ticket IDs in localStorage if guest
      const storedIds: string[] = JSON.parse(localStorage.getItem('nexen_support_ticket_ids') || '[]');
      
      const res = await fetchSupportTickets({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
      });

      if (res.success) {
        let list = res.tickets;
        // If guest has tickets in localStorage that aren't tied to current email
        if (!currentUser && storedIds.length > 0) {
          const allRes = await fetchSupportTickets({ isAdmin: true });
          if (allRes.success) {
            list = allRes.tickets.filter((t) => storedIds.includes(t.id));
          }
        }
        setTickets(list);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingTickets(false);
    }
  }, [currentUser]);

  // Image upload and processing handlers
  const handleImageFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    if (images.length + fileArray.length > 4) {
      alert('الحد الأقصى المسموح به هو 4 صور لكل بلاغ');
    }

    const availableSlots = Math.max(0, 4 - images.length);
    const filesToProcess = fileArray.slice(0, availableSlots);

    if (filesToProcess.length === 0) return;

    setIsProcessingImages(true);
    try {
      const processed = await Promise.all(
        filesToProcess.map((file) => compressImageFile(file, 1280, 1280, 0.82))
      );
      setImages((prev) => [...prev, ...processed]);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'حدث خطأ أثناء معالجة الصور' });
    } finally {
      setIsProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !subject.trim() || !message.trim()) {
      setFeedback({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await createSupportTicket({
        userId: currentUser?.id || null,
        userName: userName.trim(),
        userEmail: userEmail.trim().toLowerCase(),
        userPhone: userPhone.trim() || null,
        category,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        images,
      });

      if (res.success && res.ticket) {
        // Save ID to localStorage for future lookups
        const storedIds: string[] = JSON.parse(localStorage.getItem('nexen_support_ticket_ids') || '[]');
        if (!storedIds.includes(res.ticket.id)) {
          storedIds.unshift(res.ticket.id);
          localStorage.setItem('nexen_support_ticket_ids', JSON.stringify(storedIds.slice(0, 50)));
        }

        setFeedback({
          type: 'success',
          text: res.message || 'تم إرسال بلاغك بنجاح!',
          ticketId: res.ticket.id,
        });

        // Reset form content
        setSubject('');
        setMessage('');
        setImages([]);

        // Refresh list
        loadUserTickets();

        // Switch to history tab after brief delay
        setTimeout(() => {
          setActiveTab('history');
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'تعذر إرسال البلاغ، يرجى المحاولة مرة أخرى.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'حدث خطأ غير متوقع أثناء إرسال البلاغ.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const repliedTicketsCount = tickets.filter((t) => !!t.adminReply).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#151221] w-full max-w-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7F00FF] text-white flex items-center justify-center shadow-md shadow-[#7F00FF]/25">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>الإبلاغ عن مشكلة والدعم الفني</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                أرسل استفسارك أو مشكلتك وسيصلك رد مباشر من الإدارة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs: Create New vs Previous Tickets */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-white/10 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-[#7F00FF] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>تقديم بلاغ جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              loadUserTickets();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#7F00FF] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>بلاغاتي وردود الإدارة</span>
            {tickets.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                repliedTicketsCount > 0 ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}>
                {tickets.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {activeTab === 'create' ? (
            /* ======================================================== */
            /* TAB 1: SUBMIT NEW TICKET FORM                           */
            /* ======================================================== */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p>{feedback.text}</p>
                    {feedback.ticketId && (
                      <p className="text-[11px] font-mono mt-0.5 opacity-80">
                        رقم البلاغ للمتابعة: <strong>#{feedback.ticketId}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 1. Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  نوع المشكلة أو التصنيف <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const IconComp = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-right flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#7F00FF] bg-purple-50/80 dark:bg-purple-950/50 text-[#7F00FF] dark:text-purple-300 ring-2 ring-[#7F00FF]/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${cat.color}`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. User Info Fields (Auto-filled if logged in) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="اسمك الكريم"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      className="w-full h-10 pl-3 pr-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF]"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    البريد الإلكتروني للرد <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                      className="w-full h-10 pl-3 pr-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] font-mono text-left dir-ltr"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Phone and Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    رقم الهاتف (اختياري للواتساب)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="09XXXXXXXX"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      className="w-full h-10 pl-3 pr-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] font-mono text-left dir-ltr"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    أهمية البلاغ
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-10">
                    <button
                      type="button"
                      onClick={() => setPriority('normal')}
                      className={`h-full rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        priority === 'normal'
                          ? 'bg-purple-50 dark:bg-purple-950/50 border-[#7F00FF] text-[#7F00FF]'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>عادي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('urgent')}
                      className={`h-full rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        priority === 'urgent'
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-600 dark:text-amber-400 font-black'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>عاجل</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Subject */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  عنوان المشكلة / ملخص سريع <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: لم يصلني كود الشحن للطلب رقم #ORD-12345"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              {/* 4. Message Details */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  شرح وتفاصيل المشكلة <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="يرجى كتابة كافة التفاصيل لمساعدتنا في معالجة طلبك بأسرع وقت (مثل رقم الطلب، الآيدي، المشكلة التي ظهرت لك)..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] resize-none leading-relaxed"
                />
              </div>

              {/* 5. Image Attachments (لقطات الشاشة والصور) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#7F00FF]" />
                    <span>إرفاق صور أو لقطات شاشة للمشكلة (اختياري - حتى 4 صور)</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {images.length}/4 صور
                  </span>
                </div>

                {/* Upload Trigger Dropzone */}
                {images.length < 4 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) handleImageFiles(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed border-purple-200 dark:border-purple-900/60 hover:border-[#7F00FF] dark:hover:border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl p-4 text-center cursor-pointer transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[#7F00FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isProcessingImages ? (
                          <RefreshCw className="w-5 h-5 animate-spin text-[#7F00FF]" />
                        ) : (
                          <UploadCloud className="w-5 h-5 text-[#7F00FF]" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isProcessingImages
                          ? 'جاري ضغط ومعالجة الصور المحددة...'
                          : 'اضغط لاختيار صور من جهازك أو اسحبها وأفلتها هنا'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        يدعم لقطات الشاشة والصور (PNG, JPG, WebP) مع ضغط سريع ومثالي
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Previews Strip */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {images.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video shadow-xs"
                      >
                        <img
                          src={imgSrc}
                          alt={`مرفق ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLightboxImage(imgSrc)}
                            className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white hover:text-[#7F00FF] transition-colors cursor-pointer"
                            title="تكبير ومعاينة الصورة"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1.5 rounded-lg bg-red-500/90 text-white hover:bg-red-600 transition-colors cursor-pointer"
                            title="حذف هذه الصورة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-mono">
                          صورة {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-5 rounded-2xl bg-[#7F00FF] hover:bg-[#6b00d6] disabled:opacity-50 text-white text-xs sm:text-sm font-black transition-all shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري إرسال البلاغ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال البلاغ للإدارة الآن</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ======================================================== */
            /* TAB 2: MY TICKETS & ADMIN REPLIES                       */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  سجل البلاغات ({tickets.length})
                </span>
                <button
                  type="button"
                  onClick={loadUserTickets}
                  disabled={isLoadingTickets}
                  className="text-xs text-[#7F00FF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingTickets ? 'animate-spin' : ''}`} />
                  <span>تحديث البلاغات</span>
                </button>
              </div>

              {isLoadingTickets ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7F00FF]" />
                  <p className="text-xs">جاري تحميل سجل البلاغات...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-[#7F00FF] flex items-center justify-center mx-auto">
                    <LifeBuoy className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      لا توجد بلاغات مرسلة بعد
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      إذا واجهتك أي مشكلة في شحن حسابك أو إيداع الرصيد، يمكنك إرسال بلاغ فوري من التبويب السابق وسيصلك رد الإدارة هنا.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-[#7F00FF] text-white text-xs font-bold shadow-xs hover:bg-[#6b00d6] transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>تقديم بلاغ جديد الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {tickets.map((t) => {
                    const isResolved = t.status === 'resolved' || !!t.adminReply;
                    const catObj = CATEGORIES.find((c) => c.id === t.category);

                    return (
                      <div
                        key={t.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isResolved
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-800/60'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Header: Ticket ID & Status Badge */}
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800/40">
                              #{t.id}
                            </span>
                            {catObj && (
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                {catObj.label}
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          {t.adminReply ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>تم الرد والحل ✅</span>
                            </span>
                          ) : t.status === 'in_progress' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span>قيد المتابعة والمعالجة ⏳</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>بانتظار مراجعة الإدارة</span>
                            </span>
                          )}
                        </div>

                        {/* Subject */}
                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1.5">
                          {t.subject}
                        </h4>

                        {/* User's Original Message */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {t.message}
                        </div>

                        {/* User's Attached Images (if any) */}
                        {t.images && t.images.length > 0 && (
                          <div className="mt-2.5 space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5 text-[#7F00FF]" />
                              <span>الصور والمرفقات المرفوعة ({t.images.length}):</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {t.images.map((imgSrc, imgIdx) => (
                                <button
                                  key={imgIdx}
                                  type="button"
                                  onClick={() => setLightboxImage(imgSrc)}
                                  className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video hover:ring-2 hover:ring-[#7F00FF] transition-all cursor-pointer text-right"
                                >
                                  <img
                                    src={imgSrc}
                                    alt={`مرفق ${imgIdx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Maximize2 className="w-4 h-4" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Date Info */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(t.createdAt).toLocaleString('ar-EG')}
                          </span>
                        </div>

                        {/* ============================================== */}
                        {/* ADMIN REPLY SECTION (HIGHLIGHTED IF REPLIED)   */}
                        {/* ============================================== */}
                        {t.adminReply ? (
                          <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-purple-50/30 dark:from-emerald-950/40 dark:to-purple-950/20 border-2 border-emerald-400/50 dark:border-emerald-700/60 space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                                  رد فريق الدعم الفني ({(!t.repliedBy || t.repliedBy.includes('m74321176') || t.repliedBy.includes('محمد جعفر') || t.repliedBy.includes('@')) ? 'Nexen Support' : t.repliedBy})
                                </span>
                              </div>
                              {t.repliedAt && (
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                                  {new Date(t.repliedAt).toLocaleString('ar-EG')}
                                </span>
                              )}
                            </div>

                            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap font-medium leading-relaxed bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40">
                              {t.adminReply}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                            <span>تم استلام بلاغك وهو قيد المتابعة؛ سيظهر رد الإدارة هنا فور كتابته.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Fullscreen Image Preview */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 left-0 p-2.5 text-white/90 hover:text-white bg-white/15 hover:bg-white/25 rounded-full cursor-pointer transition-all shadow-lg"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="معاينة الصورة المرفقة"
              className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};
