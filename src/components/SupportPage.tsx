import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  Send,
  LifeBuoy,
  ShieldCheck,
  Clock,
  CheckCheck,
  User,
  Phone,
  Mail,
  RefreshCw,
  Sparkles,
  AlertCircle,
  ImageIcon,
  Maximize2,
  Trash2,
  X,
  Download,
} from 'lucide-react';
import { CustomerUser, SupportTicket } from '../types';
import { fetchSupportTickets, createSupportTicket } from '../services/dbApi';
import { compressImageFile } from '../utils/imageCompressor';

interface SupportPageProps {
  currentUser: CustomerUser | null;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'support';
  senderName: string;
  text: string;
  time: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'seen';
  ticketId?: string;
  images?: string[];
}

export const SupportPage: React.FC<SupportPageProps> = ({ currentUser, onBack }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Guest user contact information if not logged in
  const [guestName, setGuestName] = useState(() => localStorage.getItem('nexen_guest_name') || '');
  const [guestContact, setGuestContact] = useState(() => localStorage.getItem('nexen_guest_contact') || '');
  const [showContactForm, setShowContactForm] = useState(!currentUser);

  // Chat Image Attachments
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isProcessingChatImages, setIsProcessingChatImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Prevent outer page / body scrolling when in full-screen support chat
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Chat image file upload
  const handleChatImageFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    if (attachedImages.length + fileArray.length > 3) {
      alert('الحد الأقصى المسموح به هو 3 صور لكل رسالة');
    }

    const availableSlots = Math.max(0, 3 - attachedImages.length);
    const filesToProcess = fileArray.slice(0, availableSlots);
    if (filesToProcess.length === 0) return;

    setIsProcessingChatImages(true);
    try {
      const processed = await Promise.all(
        filesToProcess.map((f) => compressImageFile(f, 1280, 1280, 0.82))
      );
      setAttachedImages((prev) => [...prev, ...processed]);
    } catch (err: any) {
      setErrorBanner(err?.message || 'حدث خطأ أثناء معالجة الصور');
    } finally {
      setIsProcessingChatImages(false);
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
    }
  };

  const handleRemoveChatImage = (idx: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Convert support tickets into a unified chat message stream
  const convertTicketsToMessages = useCallback((ticketList: SupportTicket[]): ChatMessage[] => {
    const list: ChatMessage[] = [];

    // Sort tickets from oldest to newest for a natural chat stream
    const sorted = [...ticketList].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((t) => {
      // 1. User Message
      list.push({
        id: `msg-${t.id}-user`,
        sender: 'user',
        senderName: t.userName || 'أنت',
        text: t.message,
        images: t.images || [],
        time: new Date(t.createdAt).toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: t.createdAt,
        status: t.adminReply ? 'seen' : 'delivered',
        ticketId: t.id,
      });

      // 2. Support Admin Reply (if replied)
      if (t.adminReply) {
        let cleanSenderName = t.repliedBy || 'فريق الدعم الفني | Nexen Support';
        if (
          cleanSenderName.includes('m74321176') ||
          cleanSenderName.includes('محمد جعفر') ||
          cleanSenderName.includes('@')
        ) {
          cleanSenderName = 'فريق الدعم الفني | Nexen Support';
        }

        list.push({
          id: `msg-${t.id}-reply`,
          sender: 'support',
          senderName: cleanSenderName,
          text: t.adminReply,
          time: t.repliedAt
            ? new Date(t.repliedAt).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : new Date(t.updatedAt || t.createdAt).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
              }),
          createdAt: t.repliedAt || t.updatedAt || t.createdAt,
          status: 'seen',
          ticketId: t.id,
        });
      }
    });

    return list;
  }, []);

  // Fetch tickets for current user / guest
  const loadChat = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const email = currentUser?.email || guestContact.includes('@') ? guestContact : undefined;
      const uid = currentUser?.id;

      const res = await fetchSupportTickets({
        userId: uid,
        userEmail: email,
      });

      if (res.success && Array.isArray(res.tickets)) {
        setTickets(res.tickets);
        const chatMsgs = convertTicketsToMessages(res.tickets);
        setMessages(chatMsgs);
      }
    } catch (err: any) {
      if (isInitial) setErrorBanner(err.message || 'تعذر تحميل المحادثة');
    } finally {
      if (isInitial) {
        setIsLoading(false);
        setTimeout(() => scrollToBottom(false), 100);
      }
    }
  }, [currentUser, guestContact, convertTicketsToMessages]);

  // Initial load
  useEffect(() => {
    loadChat(true);
  }, [loadChat]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  // Auto-polling for new replies every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadChat(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadChat]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if ((!text && attachedImages.length === 0) || isSending) return;

    const messageText = text || 'مرفق صورة توضيحية للمشكلة';

    // Determine sender identity
    let senderName = currentUser?.name;
    let senderEmail = currentUser?.email;
    let senderPhone = currentUser?.phone;

    if (!currentUser) {
      if (!guestName.trim()) {
        setShowContactForm(true);
        setErrorBanner('يرجى كتابة اسمك لنتمكن من الرد عليك ومتابعة مشكلتك.');
        return;
      }
      senderName = guestName.trim();
      localStorage.setItem('nexen_guest_name', senderName);

      if (guestContact.trim()) {
        localStorage.setItem('nexen_guest_contact', guestContact.trim());
        if (guestContact.includes('@')) {
          senderEmail = guestContact.trim().toLowerCase();
        } else {
          senderPhone = guestContact.trim();
          senderEmail = `guest_${Date.now().toString().slice(-4)}@nexenstore.com`;
        }
      } else {
        senderEmail = `guest_${Date.now().toString().slice(-4)}@nexenstore.com`;
      }
    }

    setIsSending(true);
    setErrorBanner(null);

    const currentImages = [...attachedImages];

    // Optimistically append message to chat
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: 'user',
      senderName: senderName || 'أنت',
      text: messageText,
      images: currentImages,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setAttachedImages([]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await createSupportTicket({
        userId: currentUser?.id || null,
        userName: senderName || 'عميل المتجر',
        userEmail: senderEmail || 'support@nexenstore.com',
        userPhone: senderPhone || null,
        subject: messageText.slice(0, 40) + (messageText.length > 40 ? '...' : ''),
        category: 'chat',
        message: messageText,
        priority: 'normal',
        images: currentImages,
      });

      if (res.success && res.ticket) {
        // Refresh with real server ticket
        await loadChat(false);
      } else {
        setErrorBanner(res.error || 'فشل إرسال الرسالة، يرجى إعادة المحاولة.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'حدث خطأ أثناء إرسال الرسالة.');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col bg-slate-50 dark:bg-[#0c0f17] overflow-hidden select-text animate-in fade-in duration-200">
      {/* 1. FULL PAGE CHAT HEADER */}
      <div className="w-full bg-white/95 dark:bg-[#121624]/95 border-b border-slate-200/80 dark:border-white/10 shrink-0 backdrop-blur-md z-20 shadow-xs">
        <div className="max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Back button */}
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="رجوع"
            >
              <ArrowRight className="w-5 h-5 text-[#7F00FF] dark:text-purple-400" />
            </button>

            {/* Support Avatar & Info */}
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7F00FF] to-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                <LifeBuoy className="w-5 h-5" />
              </div>
              {/* Live Online Badge */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121624]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none">
                  الدعم الفني المباشر
                </h2>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 font-mono">
                  Nexen Support
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>متصل الآن • جاهزون للمساعدة والرد</span>
              </div>
            </div>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => loadChat(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="تحديث المحادثة"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. GUEST CONTACT INFO BAR (SHOWN IF NOT LOGGED IN) */}
      {!currentUser && showContactForm && (
        <div className="w-full bg-purple-50/90 dark:bg-purple-950/50 border-b border-purple-200/60 dark:border-purple-800/40 text-xs shrink-0 z-10">
          <div className="max-w-4xl w-full mx-auto p-3 sm:px-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#7F00FF]" />
                <span>أنت تتحدث كـ زائر، يرجى كتابة اسمك ورقم هاتفك/إيميلك لنتمكن من متابعة الرد معك:</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="اسمك الكامل *"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF]"
              />
              <input
                type="text"
                placeholder="رقم الهاتف أو الواتساب أو الإيميل"
                value={guestContact}
                onChange={(e) => setGuestContact(e.target.value)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error alert if any */}
      {errorBanner && (
        <div className="w-full bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold shrink-0 z-10">
          <div className="max-w-4xl w-full mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-red-400 hover:text-red-600 text-sm font-black px-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 3. CHAT MESSAGES STREAM */}
      <div
        ref={chatContainerRef}
        className="flex-1 w-full overflow-y-auto overscroll-contain px-3 sm:px-6 py-4 space-y-4 scroll-smooth"
      >
        <div className="max-w-4xl w-full mx-auto space-y-4 pb-2">
          {/* Welcome message bubble */}
          <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[80%]">
            <div className="w-8 h-8 rounded-xl bg-[#7F00FF] text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="p-3.5 sm:p-4 rounded-2xl rounded-tr-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed shadow-xs">
                <p className="font-bold text-slate-900 dark:text-white mb-1">
                  مرحباً بك في خدمة دعم Nexen Store 👋
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  اكتب أي مشكلة تواجهك في شحن طلب، رصيد الحساب، أو استفسار وسيقوم فريق الدعم بمراجعتها والرد عليك هنا مباشرة.
                </p>
              </div>
              <span className="text-[10px] text-slate-400 block px-1">
                خدمة الدعم المباشر
              </span>
            </div>
          </div>

          {/* Loading placeholder */}
          {isLoading && (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#7F00FF]" />
              <span>جاري تحميل المحادثة...</span>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 animate-in fade-in duration-200 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#7F00FF] to-purple-500 text-white flex items-center justify-center shrink-0 mb-1 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] space-y-1 ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs break-words ${
                      isUser
                        ? 'bg-[#7F00FF] text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 rounded-bl-xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-[#7F00FF] dark:text-purple-400">
                        <Sparkles className="w-3 h-3" />
                        <span>{msg.senderName}</span>
                      </div>
                    )}

                    {/* Attached images in message (if any) */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {msg.images.map((imgSrc, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() => setLightboxImage(imgSrc)}
                            className="relative group rounded-xl overflow-hidden aspect-video cursor-pointer border border-white/20 bg-black/20"
                          >
                            <img
                              src={imgSrc}
                              alt="مرفق"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                  </div>

                  {/* Timestamp & Status */}
                  <div
                    className={`flex items-center gap-1.5 text-[10px] text-slate-400 px-1 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {isUser && (
                      <CheckCheck
                        className={`w-3.5 h-3.5 ${
                          msg.status === 'seen'
                            ? 'text-emerald-500'
                            : 'text-slate-400'
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 4. BOTTOM CHAT INPUT BAR (PINNED AT BOTTOM) */}
      <div className="w-full bg-white dark:bg-[#121624] border-t border-slate-200/80 dark:border-white/10 shrink-0 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg z-20">
        <div className="max-w-4xl w-full mx-auto">
          {/* Previews strip if images attached */}
          {attachedImages.length > 0 && (
            <div className="flex items-center gap-2 pb-2.5 overflow-x-auto">
              {attachedImages.map((imgSrc, i) => (
                <div
                  key={i}
                  className="relative w-16 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-900 shadow-xs"
                >
                  <img src={imgSrc} alt="معاينة" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveChatImage(i)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
            <input
              ref={chatFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && handleChatImageFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              disabled={isSending || attachedImages.length >= 3}
              className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
              title="إرفاق صورة أو لقطة شاشة"
            >
              {isProcessingChatImages ? (
                <RefreshCw className="w-5 h-5 animate-spin text-[#7F00FF]" />
              ) : (
                <ImageIcon className="w-5 h-5 text-[#7F00FF]" />
              )}
            </button>

            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالتك أو مشكلتك هنا..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] resize-none max-h-32 leading-relaxed transition-colors"
                style={{ minHeight: '48px' }}
              />
            </div>

            <button
              type="submit"
              disabled={(!inputText.trim() && attachedImages.length === 0) || isSending}
              className="w-12 h-12 rounded-2xl bg-[#7F00FF] hover:bg-[#6b00d6] disabled:opacity-40 disabled:hover:bg-[#7F00FF] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#7F00FF]/25 active:scale-95 transition-all cursor-pointer"
              title="إرسال"
            >
              {isSending ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 -rotate-90" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
          >
            <div className="absolute -top-12 left-0 flex items-center gap-2">
              <a
                href={lightboxImage}
                download="chat-attachment.jpg"
                className="p-2.5 text-white/90 hover:text-white bg-white/15 hover:bg-white/25 rounded-full cursor-pointer transition-all shadow-lg flex items-center gap-1.5 text-xs font-bold"
                title="تحميل الصورة"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2.5 text-white/90 hover:text-white bg-white/15 hover:bg-white/25 rounded-full cursor-pointer transition-all shadow-lg"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="معاينة الصورة"
              className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};
