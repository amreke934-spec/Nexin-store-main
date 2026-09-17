import React, { useState, useEffect, useRef } from 'react';
import { 
  KeyRound, 
  Mail, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Send
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
  const [otpCode, setOtpCode] = useState('');
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(45); // 45 seconds
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(initialMessage || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on mount
  useEffect(() => {
    inputRef.current?.focus();
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanCode = otpCode.trim().replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length < 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    if (expirySeconds <= 0) {
      setError('انتهت صلاحية رمز التحقق. اضغط على "إعادة إرسال الرمز" لاستلام رمز جديد.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyEmailOtp(email, cleanCode);
      if (res.success && res.user) {
        setIsLoading(false);
        setSuccessMessage('تم تأكيد الحساب بنجاح! جاري تسجيل الدخول...');
        setTimeout(() => {
          onSuccess(res.user!, res.orders);
        }, 400);
      } else {
        setIsLoading(false);
        setError(res.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'حدث خطأ أثناء تأكيد رمز التحقق');
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
        setSuccessMessage(res.message || 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني بنجاح');
        setResendCooldown(res.cooldownSeconds || 45);
        setExpirySeconds(600); // Reset to 10 minutes
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
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header section */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-[#7F00FF] dark:text-purple-300 shadow-sm mx-auto">
          <KeyRound className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          تأكيد البريد الإلكتروني
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          أدخل رمز التحقق المكون من 6 أرقام المرسل إلى:
        </p>

        {/* Target email badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 text-xs font-mono font-bold text-purple-700 dark:text-purple-300 dir-ltr max-w-full truncate">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{email}</span>
        </div>

        {/* Sender verification reassurance */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 pt-0.5">
          <span>المرسل المعتمد:</span>
          <strong className="font-mono text-purple-600 dark:text-purple-400 dir-ltr font-bold">
            no-reply@nexin-store.top
          </strong>
        </div>
      </div>

      {/* Expiry Countdown Card */}
      <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-colors ${
        expirySeconds <= 120
          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 shrink-0 ${expirySeconds <= 120 ? 'text-amber-600' : 'text-[#7F00FF]'}`} />
          <span>صلاحية رمز التحقق:</span>
        </div>
        <span className="font-mono font-bold text-sm dir-ltr">
          {formatTime(expirySeconds)}
        </span>
      </div>

      {/* Code Input Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 text-center">
            رمز التحقق (OTP)
          </label>

          <div className="relative">
            <input
              ref={inputRef}
              id="otp-verification-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                setOtpCode(val);
              }}
              className="w-full py-3.5 px-4 text-center bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 focus:border-[#7F00FF] focus:ring-4 focus:ring-[#7F00FF]/15 rounded-2xl text-2xl sm:text-3xl font-black font-mono tracking-widest text-slate-900 dark:text-white transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
            />
          </div>

          {/* SPECIFICATION MANDATORY HELPER NOTE */}
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl text-center">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
              يرجى التحقق من مجلد الرسائل غير المرغوب بها (Spam / Junk) إذا لم يصلك الرمز.
            </p>
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          id="verify-submit-button"
          type="submit"
          disabled={isLoading || otpCode.length < 6 || expirySeconds <= 0}
          className="w-full bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-[#7F00FF]/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span>جاري التحقق وتفعيل الحساب...</span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد وتفعيل الحساب</span>
            </>
          )}
        </button>
      </form>

      {/* Action Footer: Resend & Edit Email */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <button
          type="button"
          id="resend-otp-button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            resendCooldown > 0 || isResending
              ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-[#7F00FF] dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 cursor-pointer'
          }`}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
          {resendCooldown > 0 ? (
            <span>إعادة إرسال الرمز بعد ({resendCooldown} ثانية)</span>
          ) : (
            <span>إعادة إرسال الرمز الآن</span>
          )}
        </button>

        <button
          type="button"
          id="otp-back-button"
          onClick={onBack}
          className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer text-center"
        >
          تعديل البريد الإلكتروني أو العودة
        </button>
      </div>
    </div>
  );
};
