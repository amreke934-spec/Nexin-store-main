import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Mail, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { CustomerUser, OrderItem } from '../types';
import { verifyEmailOtp, resendEmailOtp } from '../services/dbApi';

interface OtpVerificationCardProps {
  email: string;
  onSuccess: (user: CustomerUser, orders?: OrderItem[]) => void;
  onBack: () => void;
  initialMessage?: string;
}

export const OtpVerificationCard: React.FC<OtpVerificationCardProps> = ({
  email,
  onSuccess,
  onBack,
  initialMessage,
}) => {
  // 6 individual digit inputs
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(45); // 45 seconds
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(initialMessage || '');
  
  // Animation state for dynamic lock: 'idle' | 'shake' | 'unlock'
  const [lockStatus, setLockStatus] = useState<'idle' | 'shake' | 'unlock'>('idle');

  // Virtual keyboard awareness state
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // References to the 6 input elements
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first empty input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Detect virtual keyboard via window resize / visualViewport
  useEffect(() => {
    const handleViewportResize = () => {
      if (window.visualViewport) {
        // If the visual viewport height is noticeably smaller than screen height (typical of soft keyboard)
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        // If viewport shrunk by > 140px or is less than 520px high, keyboard is up
        setIsKeyboardOpen(viewportHeight < 520 || (windowHeight - viewportHeight > 140));
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      }
    };
  }, []);

  // Expiry countdown timer (10 mins)
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  // Resend cooldown timer (45s)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentCode = digits.join('');

  // Auto-verify when 6 digits are completely entered
  const submitVerification = async (codeToVerify: string) => {
    if (codeToVerify.length < 6 || isLoading) return;

    if (expirySeconds <= 0) {
      setError('انتهت صلاحية رمز التحقق. اضغط على إعادة إرسال الرمز لاستلام رمز جديد.');
      setLockStatus('shake');
      setTimeout(() => setLockStatus('idle'), 600);
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await verifyEmailOtp(email, codeToVerify);
      if (res.success && res.user) {
        setIsLoading(false);
        setLockStatus('unlock');
        setSuccessMessage('تم تأكيد الحساب بنجاح! جاري تسجيل الدخول...');
        setTimeout(() => {
          onSuccess(res.user!, res.orders);
        }, 700);
      } else {
        setIsLoading(false);
        setLockStatus('shake');
        setError(res.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
        setTimeout(() => setLockStatus('idle'), 600);
      }
    } catch (err: any) {
      setIsLoading(false);
      setLockStatus('shake');
      setError(err.message || 'حدث خطأ أثناء تأكيد رمز التحقق');
      setTimeout(() => setLockStatus('idle'), 600);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerification(currentCode);
  };

  // Handle individual digit input change
  const handleDigitChange = (index: number, value: string) => {
    const cleanNumbers = value.replace(/[^0-9]/g, '');
    
    if (cleanNumbers.length > 1) {
      // User pasted or typed multiple digits
      const newDigits = [...digits];
      const chars = cleanNumbers.slice(0, 6).split('');
      chars.forEach((char, i) => {
        if (index + i < 6) {
          newDigits[index + i] = char;
        }
      });
      setDigits(newDigits);
      const nextFocus = Math.min(index + chars.length, 5);
      inputRefs.current[nextFocus]?.focus();

      const assembled = newDigits.join('');
      if (assembled.length === 6) {
        submitVerification(assembled);
      }
      return;
    }

    const singleDigit = cleanNumbers.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);

    // If a digit was entered, shift focus to next input
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const assembled = newDigits.join('');
    if (assembled.length === 6) {
      submitVerification(assembled);
    }
  };

  // Handle Backspace and arrow keys
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current is already empty, move to previous and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft') {
      if (index < 5) inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'ArrowRight') {
      if (index > 0) inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle clipboard paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    const focusIdx = Math.min(pastedData.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pastedData.length === 6) {
      submitVerification(pastedData);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await resendEmailOtp(email);
      if (res.success) {
        setSuccessMessage(res.message || 'تم إرسال رمز تحقق جديد بنجاح');
        setResendCooldown(res.cooldownSeconds || 45);
        setExpirySeconds(600);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(res.error || 'تعذر إعادة إرسال الرمز، يرجى المحاولة بعد قليل');
        if (res.cooldownSeconds) {
          setResendCooldown(res.cooldownSeconds);
        }
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بالخادم لإعادة الإرسال');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center justify-center transition-all duration-300 ${
      isKeyboardOpen ? 'space-y-1.5 py-0' : 'space-y-2.5 sm:space-y-3.5 py-0.5'
    }`}>
      
      {/* 1. Dynamic Interactive Animated Lock Icon (scales smoothly when keyboard is open) */}
      <div className="flex justify-center items-center">
        <div 
          className={`relative flex items-center justify-center transition-all duration-300 rounded-full ${
            isKeyboardOpen 
              ? 'w-10 h-10 sm:w-12 sm:h-12' 
              : 'w-13 h-13 sm:w-16 sm:h-16'
          } ${
            lockStatus === 'unlock'
              ? 'bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 animate-glow-success scale-105'
              : lockStatus === 'shake'
              ? 'bg-red-500/15 border-2 border-red-500 text-red-400 animate-shake-lock'
              : 'bg-purple-950/40 border-2 border-purple-500/40 text-[#A855F7] shadow-md shadow-purple-900/30'
          }`}
        >
          {/* Subtle radiating aura */}
          <div className={`absolute inset-0 rounded-full blur-xs opacity-40 transition-colors ${
            lockStatus === 'unlock' ? 'bg-emerald-500' : lockStatus === 'shake' ? 'bg-red-500' : 'bg-[#7F00FF]'
          }`} />

          {lockStatus === 'unlock' ? (
            <Unlock className={`${isKeyboardOpen ? 'w-5 h-5' : 'w-6 h-6 sm:w-8 sm:h-8'} text-emerald-400 relative z-10 transition-transform duration-300 rotate-[-10deg]` } />
          ) : (
            <Lock className={`${isKeyboardOpen ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 sm:h-7'} relative z-10 transition-transform duration-200 ${
              lockStatus === 'shake' ? 'text-red-400' : 'text-[#C084FC]'
            }`} />
          )}
        </div>
      </div>

      {/* 2. Simplified Clean Titles & Email Display */}
      <div className={`text-center transition-all duration-200 w-full ${isKeyboardOpen ? 'space-y-0.5' : 'space-y-1'}`}>
        <h2 className={`font-black text-white tracking-tight transition-all duration-200 ${
          isKeyboardOpen ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg'
        }`}>
          تأكيد البريد الإلكتروني
        </h2>

        {/* Clean Email Display */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-slate-300 font-mono dir-ltr py-0">
          <Mail className="w-3 h-3 text-purple-400 shrink-0" />
          <span className="font-semibold text-purple-200 truncate max-w-[240px] sm:max-w-xs">{email}</span>
        </div>
      </div>

      {/* 3. 6 Separate Outline / Ghost Input Boxes - responsive dimensions */}
      <form onSubmit={handleVerify} className={`w-full transition-all duration-200 ${isKeyboardOpen ? 'space-y-2' : 'space-y-2.5 sm:space-y-3'}`}>
        <div 
          className="flex items-center justify-center gap-1.5 sm:gap-2.5 dir-ltr py-0.5"
          onPaste={handlePaste}
        >
          {digits.map((digit, idx) => {
            const isSuccess = lockStatus === 'unlock';
            const isError = lockStatus === 'shake';

            return (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete="one-time-code"
                value={digit}
                onFocus={() => setIsKeyboardOpen(true)}
                onBlur={() => {
                  // Wait briefly before clearing keyboard state in case of moving between inputs
                  setTimeout(() => {
                    if (!document.activeElement || document.activeElement.tagName !== 'INPUT') {
                      setIsKeyboardOpen(false);
                    }
                  }, 120);
                }}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`text-center font-mono font-black rounded-xl transition-all duration-150 select-none outline-none ${
                  isKeyboardOpen
                    ? 'w-9 h-10 sm:w-11 sm:h-12 text-base sm:text-lg'
                    : 'w-10 h-11 sm:w-13 sm:h-14 text-lg sm:text-2xl'
                } ${
                  isSuccess
                    ? 'bg-emerald-950/30 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.35)]'
                    : isError
                    ? 'bg-red-950/30 border-2 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                    : digit
                    ? 'bg-[#141224] border-2 border-purple-500/70 text-white shadow-[0_0_10px_rgba(127,0,255,0.25)]'
                    : 'bg-[#0E0C18]/80 border border-purple-900/50 hover:border-purple-600/60 text-white placeholder-slate-600'
                } focus:border-[#A855F7] focus:ring-2 focus:ring-[#7F00FF]/25 focus:shadow-[0_0_15px_rgba(168,85,247,0.5)]`}
              />
            );
          })}
        </div>

        {/* Dynamic Error / Success Messages */}
        {error && (
          <div className="p-1.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-center">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-center">{successMessage}</span>
          </div>
        )}

        {/* 4. Elevated Vibrant Purple Confirmation Button - stays prominent */}
        <button
          id="verify-submit-button"
          type="submit"
          disabled={isLoading || currentCode.length < 6 || expirySeconds <= 0}
          className={`w-full bg-[#7F00FF] hover:bg-[#6e00de] active:scale-98 text-white font-bold rounded-xl transition-all shadow-md shadow-[#7F00FF]/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 border-t border-purple-400/30 ${
            isKeyboardOpen ? 'py-2 px-3 text-xs' : 'py-2.5 sm:py-3 px-4 text-xs sm:text-sm'
          }`}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري تفعيل الحساب...
            </span>
          ) : lockStatus === 'unlock' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
              تم التفعيل بنجاح
            </span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد وتفعيل الحساب</span>
            </>
          )}
        </button>
      </form>

      {/* 5. Simplified Resend & Return Controls */}
      <div className={`w-full transition-all duration-200 ${isKeyboardOpen ? 'space-y-1 pt-0' : 'space-y-1.5 pt-0.5'}`}>
        {/* Resend description text */}
        <div className="flex items-center justify-center gap-1.5 text-[10.5px] sm:text-[11px] text-slate-400">
          <span>إعادة إرسال الرمز، يرجى</span>
          {resendCooldown > 0 ? (
            <span className="text-purple-400 font-mono font-bold">
              الانتظار ({resendCooldown}ث)
            </span>
          ) : (
            <button
              type="button"
              id="resend-otp-button"
              onClick={handleResend}
              disabled={isResending}
              className="text-[#A855F7] hover:text-purple-300 font-bold underline decoration-purple-500/50 hover:decoration-purple-400 cursor-pointer transition-colors"
            >
              {isResending ? 'جاري الإرسال...' : 'الضغط هنا'}
            </button>
          )}
        </div>

        {/* Change email / Back button */}
        <div className="text-center">
          <button
            type="button"
            id="otp-back-button"
            onClick={onBack}
            className="text-[10.5px] sm:text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>تعديل البريد الإلكتروني</span>
            <ArrowRight className="w-3 h-3 text-purple-400 rotate-180" />
          </button>
        </div>
      </div>

      {/* 6. Discreet Security & Encryption Footer Tag */}
      <div className="w-full pt-1.5 border-t border-purple-900/30 flex items-center justify-center gap-1 text-[10px] sm:text-[10.5px] text-slate-400">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span>تشفير وحماية البيانات</span>
      </div>

    </div>
  );
};
