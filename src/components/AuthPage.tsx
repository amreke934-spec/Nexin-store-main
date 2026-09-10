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
  Check
} from 'lucide-react';
import { CustomerUser, Product, OrderItem } from '../types';
import { DEFAULT_API_KEY } from '../services/scStoreApi';
import { registerUserInDb, loginUserInDb } from '../services/dbApi';
import { NexenLogo } from './NexenLogo';

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
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  useEffect(() => {
    if (initialMode) {
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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

        if (res.success && res.user) {
          setIsLoading(false);
          onLoginSuccess(res.user, res.orders);
        } else {
          setIsLoading(false);
          setError(res.error || 'تعذر تسجيل الحساب في قاعدة البيانات، يرجى المحاولة مجدداً');
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

        if (res.success && res.user) {
          setIsLoading(false);
          onLoginSuccess(res.user, res.orders);
        } else {
          setIsLoading(false);
          setError(res.error || 'بيانات الدخول غير صحيحة أو الحساب غير مسجل في قاعدة البيانات');
        }
      } catch (err: any) {
        setIsLoading(false);
        setError(err.message || 'فشل الاتصال بقاعدة البيانات للتحقق من الحساب');
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 sm:py-12 px-4 select-none animate-in fade-in duration-200">
      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* Back to store navigation bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            id="auth-back-to-store-btn"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 text-[#7F00FF] dark:text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            <span>الرجوع للمتجر وتصفح المنتجات</span>
          </button>

          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700/50">
            <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            بوابة الحسابات
          </span>
        </div>

        {/* Main Full-Page Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 transition-all">
          {/* Top Brand & Header Section */}
          <div className="text-center mb-7">
            <div className="flex justify-center mb-3.5">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/50 flex items-center justify-center p-2.5 shadow-md shadow-purple-500/10 group">
                <NexenLogo size="md" showText={false} className="group-hover:scale-105 transition-transform" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              {mode === 'register' ? 'إنشاء حساب جديد في ' : 'تسجيل الدخول إلى '}
              <span className="text-[#7F00FF] dark:text-purple-400">Nexen Store</span>
            </h1>

            {pendingProduct ? (
              <div className="mt-3 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7F00FF] shrink-0" />
                <span className="font-semibold">
                  {mode === 'register' ? 'أنشئ حسابك الآن' : 'سجل دخولك الآن'} لمتابعة شحن باقة <strong className="underline decoration-purple-400 font-bold">{pendingProduct.name}</strong>
                </span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {mode === 'register'
                  ? 'أنشئ حسابك الشخصي بخطوات بسيطة للاستفادة من خدمات الشحن الفوري والتتبع المباشر لجميع طلباتك.'
                  : 'سجّل دخولك للوصول إلى باقات الشحن، ورصيدك، ومتابعة سجل طلباتك السابقة.'}
              </p>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl mb-6 border border-slate-200/60 dark:border-slate-800/60">
            <button
              type="button"
              id="tab-register-btn"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-800 text-[#7F00FF] dark:text-purple-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء حساب جديد</span>
            </button>

            <button
              type="button"
              id="tab-login-btn"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-800 text-[#7F00FF] dark:text-purple-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' ? (
              <>
                {/* 1. Full Name Field */}
                <div className="space-y-1.5 animate-in fade-in duration-200">
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
                      className="w-full pl-3 pr-10 py-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-[#7F00FF]/15 transition-all"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  </div>
                </div>

                {/* 2. Standalone Email Field */}
                <div className="space-y-1.5 animate-in fade-in duration-200">
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
                      className="w-full pl-3 pr-10 py-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-[#7F00FF]/15 transition-all font-mono text-left dir-ltr"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    يستخدم لاستلام إشعارات الطلبات وتأكيد الشحن.
                  </p>
                </div>

                {/* 3. Standalone Phone Number Field with Country Code Selector */}
                <div className="space-y-1.5 animate-in fade-in duration-200">
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
                        className="h-full flex items-center gap-1.5 px-3 py-3 bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer focus:outline-none focus:border-[#7F00FF] focus:ring-2 focus:ring-[#7F00FF]/15"
                      >
                        <span className="text-base leading-none">{selectedCountry.flag}</span>
                        <span className="font-mono text-xs font-black dir-ltr text-purple-600 dark:text-purple-400">
                          {selectedCountry.dialCode}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu Popover */}
                      {isCountryDropdownOpen && (
                        <div className="absolute top-full right-0 mt-1.5 w-64 sm:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-black/30 z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                          {/* Search box inside dropdown */}
                          <div className="relative mb-2">
                            <input
                              ref={searchInputRef}
                              type="text"
                              placeholder="ابحث عن الدولة أو الرمز..."
                              value={countrySearchQuery}
                              onChange={(e) => setCountrySearchQuery(e.target.value)}
                              className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF]"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                          </div>

                          {/* Country List Scrollable */}
                          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
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
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-right ${
                                      isSelected
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 font-bold'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">{c.flag}</span>
                                      <span>{c.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 dir-ltr">
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
                        className="w-full pl-3 pr-10 py-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-[#7F00FF]/15 transition-all font-mono text-left dir-ltr"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                  </div>

                  {phone && (
                    <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono flex items-center gap-1 mt-0.5">
                      <span>الرقم بصيغة دولية:</span>
                      <strong className="dir-ltr font-bold">
                        {selectedCountry.dialCode} {phone.trim().replace(/^0+/, '')}
                      </strong>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Login Mode Fields */
              <div className="space-y-1.5 animate-in fade-in duration-200">
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
                    className="w-full pl-3 pr-10 py-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-[#7F00FF]/15 transition-all font-mono text-left dir-ltr"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  أدخل بريدك الإلكتروني أو رقم الهاتف الذي سجلت به سابقاً.
                </p>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-1.5">
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
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-[#7F00FF]/15 transition-all font-mono"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-[#7F00FF]/25 cursor-pointer mt-3 disabled:opacity-60 flex items-center justify-center gap-2"
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

          {/* Trust and Privacy Guarantee Badges */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>حماية وتشفير للبيانات</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>شحن فوري ومضمون</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
