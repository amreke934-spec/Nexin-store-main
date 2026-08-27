import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageCircle, 
  Send, 
  Users, 
  Headphones, 
  MoreVertical,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface FloatingSupportWidgetProps {}

export const FloatingSupportWidget: React.FC<FloatingSupportWidgetProps> = React.memo(() => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const whatsappUrl = 'https://wa.me/963933829164';
  const telegramSupportUrl = 'https://t.me/+963933829164';
  const telegramChannelUrl = 'https://t.me/nexen_store';

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div 
      ref={widgetRef}
      className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-50 select-none"
      dir="rtl"
    >
      {/* Modal Dialog with Darkened Blur Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-modal-title"
        >
          {/* Popup Card Box */}
          <div 
            id="support-popup-menu"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121624] border border-purple-200/80 dark:border-purple-800/60 shadow-2xl p-5 sm:p-6 space-y-4 transform transition-all duration-300 scale-100 animate-scaleUp"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7F00FF] to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-[#7F00FF]/25 shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="support-modal-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>خدمة العملاء والدعم</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تواصل معنا مباشرة 24/7
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-support-popup-btn"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options List */}
            <div className="space-y-2.5 pt-1">
              {/* 1. WhatsApp Direct Chat */}
              <a
                id="support-opt-whatsapp"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 transition-all duration-200 group active:scale-98 shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform shrink-0">
                    {/* WhatsApp SVG Icon */}
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.905.815 2.796.815 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.767-5.768-5.767zm0-2c4.28 0 7.768 3.487 7.768 7.767 0 4.28-3.488 7.767-7.768 7.767-1.328 0-2.58-.337-3.673-.927l-4.358 1.144 1.164-4.254c-.672-1.143-1.033-2.457-1.033-3.73 0-4.28 3.488-7.767 7.768-7.767z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>محادثة واتساب مباشرة</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold">
                        فوري
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                      +963 933 829 164
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-500 opacity-70 group-hover:opacity-100 group-hover:translate-x-[-2px] transition-all shrink-0" />
              </a>

              {/* 2. Telegram Direct Support Chat */}
              <a
                id="support-opt-telegram-chat"
                href={telegramSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800/50 text-slate-800 dark:text-slate-100 transition-all duration-200 group active:scale-98 shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform shrink-0">
                    <Send className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      مراسلة دعم التيليجرام
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                      محادثة خاصة ومباشرة مع الدعم
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-sky-500 opacity-70 group-hover:opacity-100 group-hover:translate-x-[-2px] transition-all shrink-0" />
              </a>

              {/* 3. Telegram Group / Channel */}
              <a
                id="support-opt-telegram-group"
                href={telegramChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/50 text-slate-800 dark:text-slate-100 transition-all duration-200 group active:scale-98 shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7F00FF] to-indigo-600 text-white flex items-center justify-center shadow-md shadow-[#7F00FF]/25 group-hover:scale-105 transition-transform shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>قناة ومجموعة التليجرام</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#7F00FF]" />
                    </div>
                    <span className="text-xs text-purple-600 dark:text-purple-300 font-mono font-medium block mt-0.5">
                      t.me/nexen_store
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#7F00FF] dark:text-purple-300 opacity-70 group-hover:opacity-100 group-hover:translate-x-[-2px] transition-all shrink-0" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Floating 3-Dots Action Button */}
      <div className="relative group">
        <button
          type="button"
          id="floating-support-toggle-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label="قائمة الدعم الفني والتواصل الاجتماعي"
          className={`relative z-50 w-13 h-13 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white shadow-xl transition-all duration-300 active:scale-95 cursor-pointer gpu-layer ${
            isOpen
              ? 'bg-slate-900 dark:bg-slate-800 rotate-90 scale-95 border-2 border-purple-500 shadow-purple-500/30'
              : 'bg-gradient-to-tr from-[#7F00FF] via-[#8B1AFF] to-indigo-600 hover:scale-108 hover:shadow-[#7F00FF]/40 border-2 border-white/30 dark:border-purple-400/30'
          }`}
        >
          {/* Animated Background Ring / Pulse when closed */}
          {!isOpen && (
            <span className="absolute -inset-1 rounded-2xl sm:rounded-3xl bg-[#7F00FF]/30 animate-ping pointer-events-none opacity-60" />
          )}

          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <MoreVertical className="w-6 h-6 text-white transform group-hover:scale-110 transition-transform" />
            </div>
          )}

          {/* Notification Dot */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs" />
          )}
        </button>

        {/* Floating Tooltip Pill (Shows on hover on desktop when closed) */}
        {!isOpen && (
          <div className="hidden sm:block absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 backdrop-blur-md shadow-lg border border-slate-700/60">
            الدعم الفني والتواصل
          </div>
        )}
      </div>
    </div>
  );
});

FloatingSupportWidget.displayName = 'FloatingSupportWidget';
