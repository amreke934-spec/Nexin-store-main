import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Mail, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Zap, 
  Phone, 
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Search,
  Check,
  Clock,
  RotateCcw,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { CustomerUser, Product, OrderItem } from '../types';
import { DEFAULT_API_KEY } from '../services/scStoreApi';
import { registerUserInDb, loginUserInDb, verifyEmailOtp, resendEmailOtp } from '../services/dbApi';
import { NexenLogo } from './NexenLogo';
import { OtpVerificationCard } from './OtpVerificationCard';

export interface CountryCodeItem {
  name: string;
  nameEn: string;
  dialCode: string;
  flag: string;
  iso: string;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { name: 'سوريا', nameEn: 'Syria', dialCode: '+963', flag: '🇸🇾', iso: 'SY' },
  { name: 'السعودية', nameEn: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', iso: 'SA' },
  { name: 'الإمارات', nameEn: 'UAE', dialCode: '+971', flag: '🇦🇪', iso: 'AE' },
  { name: 'مصر', nameEn: 'Egypt', dialCode: '+20', flag: '🇪🇬', iso: 'EG' },
  { name: 'العراق', nameEn: 'Iraq', dialCode: '+964', flag: '🇮🇶', iso: 'IQ' },
  { name: 'الكويت', nameEn: 'Kuwait', dialCode: '+965', flag: '🇰🇼', iso: 'KW' },
  { name: 'قطر', nameEn: 'Qatar', dialCode: '+974', flag: '🇶🇦', iso: 'QA' },
  { name: 'عمان', nameEn: 'Oman', dialCode: '+968', flag: '🇴🇲', iso: 'OM' },
  { name: 'البحرين', nameEn: 'Bahrain', dialCode: '+973', flag: '🇧🇭', iso: 'BH' },
  { name: 'الأردن', nameEn: 'Jordan', dialCode: '+962', flag: '🇯🇴', iso: 'JO' },
  { name: 'لبنان', nameEn: 'Lebanon', dialCode: '+961', flag: '🇱🇧', iso: 'LB' },
  { name: 'فلسطين', nameEn: 'Palestine', dialCode: '+970', flag: '🇵🇸', iso: 'PS' },
  { name: 'تركيا', nameEn: 'Turkey', dialCode: '+90', flag: '🇹🇷', iso: 'TR' },
  { name: 'ليبيا', nameEn: 'Libya', dialCode: '+218', flag: '🇱🇾', iso: 'LY' },
  { name: 'الجزائر', nameEn: 'Algeria', dialCode: '+213', flag: '🇩🇿', iso: 'DZ' },
  { name: 'تونس', nameEn: 'Tunisia', dialCode: '+216', flag: '🇹🇳', iso: 'TN' },
  { name: 'المغرب', nameEn: 'Morocco', dialCode: '+212', flag: '🇲🇦', iso: 'MA' },
  { name: 'اليمن', nameEn: 'Yemen', dialCode: '+967', flag: '🇾🇪', iso: 'YE' },
  { name: 'السودان', nameEn: 'Sudan', dialCode: '+249', flag: '🇸🇩', iso: 'SD' },
  { name: 'ألمانيا', nameEn: 'Germany', dialCode: '+49', flag: '🇩🇪', iso: 'DE' },
  { name: 'السويد', nameEn: 'Sweden', dialCode: '+46', flag: '🇸🇪', iso: 'SE' },
  { name: 'هولندا', nameEn: 'Netherlands', dialCode: '+31', flag: '🇳🇱', iso: 'NL' },
  { name: 'بريطانيا', nameEn: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', iso: 'GB' },
  { name: 'الولايات المتحدة', nameEn: 'United States', dialCode: '+1', flag: '🇺🇸', iso: 'US' },
  { name: 'كندا', nameEn: 'Canada', dialCode: '+1', flag: '🇨🇦', iso: 'CA' },
];

interface AuthPageProps {
  onLoginSuccess: (user: CustomerUser, orders?: OrderItem[]) => void;
  onBackToStore: () => void;
  pendingProduct?: Product | null;
  theme?: 'light' | 'dark';
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  onBackToStore,
  pendingProduct,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>(initialMode);

  useEffect(() => {
    if (initialMode && mode !== 'verify') {
      setMode(initialMode);
    }
  }, [initialMode]);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCodeItem>(COUNTRY_CODES[0]); // Default Syria +963
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  
  // Login field for existing users (can enter email or phone)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Email verification state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(45); // 45 seconds cooldown
  const [isResending, setIsResending] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Close country dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isCountryDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setCountrySearchQuery('');
    }
  }, [isCountryDropdownOpen]);

  // Focus OTP input when entering verify mode
  useEffect(() => {
    if (mode === 'verify') {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [mode]);

  // Expiry timer countdown
  useEffect(() => {
    if (mode !== 'verify' || expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, expirySeconds]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (mode !== 'verify' || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, resendCooldown]);

  // Filter countries based on search
  const filteredCountries = COUNTRY_CODES.filter((c) => {
    const query = countrySearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.nameEn.toLowerCase().includes(query) ||
      c.dialCode.includes(query) ||
      c.iso.toLowerCase().includes(query)
    );
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending || !verificationEmail) return;
    setIsResending(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await resendEmailOtp(verificationEmail);
      if (res.success) {
        setSuccessMessage(res.message || 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني بنجاح.');
        setResendCooldown(res.cooldownSeconds || 45);
        setExpirySeconds(600); // Reset to 10 minutes
      } else {
        setError(res.error || 'تعذر إعادة إرسال الرمز. يرجى المحاولة بعد قليل.');
        if (res.cooldownSeconds) {
          setResendCooldown(res.cooldownSeconds);
        }
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال لإعادة إرسال الرمز');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanOtp = otpCode.trim().replace(/\s+/g, '');
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام كاملاً');
      return;
    }

    if (expirySeconds <= 0) {
      setError('انتهت صلاحية الرمز. يرجى الضغط على "إعادة إرسال الرمز" لاستلام رمز جديد.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyEmailOtp(verificationEmail, cleanOtp);
      if (res.success && res.user) {
        setIsLoading(false);
        setSuccessMessage('تم التحقق بنجاح! جاري الدخول إلى حسابك...');
        setTimeout(() => {
          onLoginSuccess(res.user!, res.orders);
        }, 500);
      } else {
        setIsLoading(false);
        setError(res.error || 'رمز التحقق غير صحيح. تأكد من الأرقام وأعد المحاولة.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'حدث خطأ أثناء تأكيد الرمز');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (mode === 'register') {
      // 1. Validate Name
      if (!name.trim()) {
        setError('يرجى إدخال الاسم الكامل لإنشاء الحساب');
        return;
      }

      // 2. Validate Email
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError('يرجى إدخال البريد الإلكتروني');
        return;
      }
      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        setError('يرجى إدخال بريد إلكتروني صحيح (مثال: user@example.com)');
        return;
      }

      // 3. Validate Phone Number
      const cleanPhone = phone.trim().replace(/[\s-]/g, '');
      if (!cleanPhone) {
        setError('يرجى إدخال رقم الهاتف المحمول');
        return;
      }
      if (cleanPhone.length < 6) {
        setError('يرجى إدخال رقم هاتف محمول صالح');
        return;
      }

      // 4. Validate Password
      if (password.length > 0 && password.length < 6) {
        setError('كلمة المرور يجب أن تتكون من 6 خانات على الأقل');
        return;
      }

      setIsLoading(true);
      const fullPhoneNumber = `${selectedCountry.dialCode} ${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`;

      try {
        const res = await registerUserInDb({
          name: name.trim(),
          email: trimmedEmail,
          phone: fullPhoneNumber,
          password: password || undefined,
        });

        setIsLoading(false);

        // Verification required: redirect to OTP verification screen
        if (res.requiresVerification || (res.success && !res.user)) {
          setVerificationEmail(res.email || trimmedEmail);
          setMode('verify');
          setExpirySeconds(600); // 10 minutes
          setResendCooldown(45);
          setSuccessMessage(res.message || 'تم إرسال رمز التحقق المكون من 6 أرقام إلى بريدك الإلكتروني.');
          return;
        }

        if (res.success && res.user) {
          onLoginSuccess(res.user, res.orders);
        } else {
          setError(res.error || 'تعذر تسجيل الحساب، يرجى المحاولة مجدداً');
        }
      } catch (err: any) {
        setIsLoading(false);
        setError(err.message || 'فشل الاتصال بقاعدة البيانات لإنشاء الحساب');
      }

    } else {
      // Login Mode
      const trimmedIdentifier = loginIdentifier.trim();
      if (!trimmedIdentifier) {
        setError('يرجى إدخال البريد الإلكتروني أو رقم الهاتف المسجل');
        return;
      }

      setIsLoading(true);

      try {
        const res = await loginUserInDb({
          identifier: trimmedIdentifier,
          password: password || undefined,
        });

        setIsLoading(false);

        // Account exists but requires email verification
        if (res.requiresVerification) {
          setVerificationEmail(res.email || trimmedIdentifier);
          setMode('verify');
          setExpirySeconds(600);
          setResendCooldown(45);
          setError(res.error || 'يرجى تأكيد بريدك الإلكتروني لإكمال الدخول.');
          return;
        }

        if (res.success && res.user) {
          onLoginSuccess(res.user, res.orders);
        } else {
          setError(res.error || 'بيانات الدخول غير صحيحة أو الحساب غير مسجل في قاعدة البيانات');
        }
      } catch (err: any) {
        setIsLoading(false);
        setError(err.message || 'فشل الاتصال بقاعدة البيانات لتسجيل الدخول');
      }
    }
  };

  return (
    <div className="w-full flex flex-col justify-start items-center py-2 sm:py-4 px-2 sm:px-4 select-none animate-in fade-in duration-200">
      <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto">
        {/* Back to store navigation bar */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <button
            type="button"
            id="auth-back-to-store-btn"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer group"
          >
            <ArrowRight className="w-3.5 h-3.5 text-[#7F00FF] dark:text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            <span>الرجوع للمتجر</span>
          </button>

          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700/50">
            <Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
            بوابة الحسابات
          </span>
        </div>

        {/* Main Full-Page Auth Card */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl transition-all ${
          mode === 'verify' ? 'p-3 sm:p-5' : 'p-4 sm:p-6'
        }`}>
          {mode === 'verify' ? (
            <OtpVerificationCard
              email={verificationEmail}
              initialMessage={successMessage || error}
              onSuccess={(user, orders) => onLoginSuccess(user, orders)}
              onBack={() => {
                setMode('register');
                setError('');
                setSuccessMessage('');
              }}
            />
          ) : (
            <>
              {/* Top Brand & Header Section */}
              <div className="text-center mb-2.5 sm:mb-4">
                <div className="flex items-center justify-center gap-2 mb-1 sm:mb-1.5">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/50 flex items-center justify-center p-1.5 shadow-xs shrink-0">
                    <NexenLogo size="sm" showText={false} />
                  </div>
                  <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {mode === 'register' ? 'إنشاء حساب جديد في ' : 'تسجيل الدخول إلى '}
                    <span className="text-[#7F00FF] dark:text-purple-400">Nexen Store</span>
                  </h1>
                </div>

                {pendingProduct ? (
                  <div className="mt-1.5 p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#7F00FF] shrink-0" />
                    <span className="font-semibold truncate">
                      متابعة شحن باقة <strong className="underline decoration-purple-400 font-bold">{pendingProduct.name}</strong>
                    </span>
                  </div>
                ) : (
                  <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed mt-0.5">
                    {mode === 'register'
                      ? 'شحن فوري ومتابعة مستمرة لكافة طلباتك'
                      : 'الوصول إلى باقات الشحن ورصيدك وسجل طلباتك'}
                  </p>
                )}
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-2.5 sm:mb-3.5 border border-slate-200/60 dark:border-slate-800/60">
                <button
                  type="button"
                  id="tab-register-btn"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-800 text-[#7F00FF] dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إنشاء حساب</span>
                </button>

                <button
                  type="button"
                  id="tab-login-btn"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-800 text-[#7F00FF] dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </button>
              </div>

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3.5">
                {mode === 'register' ? (
                  <>
                    {/* 1. Full Name Field */}
                    <div className="space-y-1 animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        الاسم الكامل <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="register-fullname-input"
                          type="text"
                          placeholder="مثال: أحمد المحمد"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full h-11 sm:h-12 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 transition-colors"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* 2. Standalone Email Field */}
                    <div className="space-y-1 animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        البريد الإلكتروني <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="register-email-input"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full h-11 sm:h-12 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 transition-colors font-mono text-left dir-ltr"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* 3. Standalone Phone Number Field with Country Code Selector */}
                    <div className="space-y-1 animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        رقم الهاتف المحمول <span className="text-red-500">*</span>
                      </label>

                      <div className="flex items-stretch gap-2">
                        {/* Country Code Dropdown Selector */}
                        <div className="relative shrink-0" ref={dropdownRef}>
                          <button
                            type="button"
                            id="country-code-selector-btn"
                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            className="h-11 sm:h-12 flex items-center gap-1.5 px-2.5 bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer focus:outline-none focus:border-[#7F00FF]"
                          >
                            <span className="text-base leading-none">{selectedCountry.flag}</span>
                            <span className="font-mono text-xs font-black dir-ltr text-purple-600 dark:text-purple-400">
                              {selectedCountry.dialCode}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Dropdown Menu Popover */}
                          {isCountryDropdownOpen && (
                            <div className="absolute top-full right-0 mt-1 w-64 sm:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden animate-in fade-in duration-150">
                              <div className="relative mb-2">
                                <input
                                  ref={searchInputRef}
                                  type="text"
                                  placeholder="ابحث عن الدولة..."
                                  value={countrySearchQuery}
                                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                                  className="w-full h-9 pl-3 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF]"
                                />
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                              </div>

                              <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
                                {filteredCountries.length > 0 ? (
                                  filteredCountries.map((c) => {
                                    const isSelected = selectedCountry.iso === c.iso;
                                    return (
                                      <button
                                        key={c.iso}
                                        type="button"
                                        onClick={() => {
                                          setSelectedCountry(c);
                                          setIsCountryDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-right ${
                                          isSelected
                                            ? 'bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 font-bold'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-base">{c.flag}</span>
                                          <span className="text-xs">{c.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono text-xs text-slate-500 dir-ltr">
                                            {c.dialCode}
                                          </span>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-[#7F00FF]" />}
                                        </div>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="p-3 text-center text-xs text-slate-400">
                                    لا توجد نتائج مطابقة
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Phone Number Input */}
                        <div className="relative flex-1">
                          <input
                            id="register-phone-input"
                            type="tel"
                            placeholder="09XXXXXXXX أو 9XXXXXXXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="w-full h-11 sm:h-12 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 transition-colors font-mono text-left dir-ltr"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Login Mode Fields */
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      البريد الإلكتروني أو رقم الهاتف <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="login-identifier-input"
                        type="text"
                        placeholder="name@example.com أو 09XXXXXXXX"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        required
                        className="w-full h-11 sm:h-12 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 transition-colors font-mono text-left dir-ltr"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      كلمة المرور {mode === 'register' && <span className="text-red-500">*</span>}
                    </label>
                    {mode === 'login' && (
                      <span className="text-[11px] text-slate-400">
                        (اختياري للدخول السريع)
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 sm:h-12 pl-10 pr-10 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 transition-colors font-mono"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#7F00FF] focus:ring-[#7F00FF] border-slate-300 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">تذكر تسجيل دخولي على هذا الجهاز</span>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white font-bold px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-[#7F00FF]/25 cursor-pointer mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>جاري معالجة الطلب...</span>
                  ) : mode === 'register' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>إنشاء الحساب ومتابعة الشحن</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول والمتابعة</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Trust and Privacy Guarantee Badges */}
          {mode !== 'verify' && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-center text-[10.5px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>تشفير وحماية البيانات</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>شحن فوري ومضمون</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
