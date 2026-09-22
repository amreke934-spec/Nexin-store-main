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
} from 'lucide-react';
import { CustomerUser, SupportTicket } from '../types';
import { fetchSupportTickets, createSupportTicket } from '../services/dbApi';

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
    if (!text || isSending) return;

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

    // Optimistically append message to chat
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: 'user',
      senderName: senderName || 'أنت',
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await createSupportTicket({
        userId: currentUser?.id || null,
        userName: senderName || 'عميل المتجر',
        userEmail: senderEmail || 'support@nexenstore.com',
        userPhone: senderPhone || null,
        subject: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
        category: 'chat',
        message: text,
        priority: 'normal',
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
          <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
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
              disabled={!inputText.trim() || isSending}
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
    </div>
  );
};
