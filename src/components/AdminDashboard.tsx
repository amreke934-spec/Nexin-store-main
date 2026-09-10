import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Users,
  TrendingUp,
  ShoppingBag,
  Wallet,
  RefreshCw,
  Search,
  Edit,
  Trash2,
  UserPlus,
  Percent,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Coins,
  Copy,
  Check,
  Building,
  Key,
  Sliders,
  AlertCircle,
  Eye,
  X,
  Plus,
  Minus,
  Image as ImageIcon,
  ShieldCheck,
  Mail,
  BadgeCheck,
  Wrench,
} from 'lucide-react';
import { CustomerUser, MerchantInfo, OrderItem, MaintenanceSettings } from '../types';
import {
  fetchAdminStats,
  fetchAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  createAdminUser,
  checkAdminOrderDetails,
  saveStoreSetting,
  syncProcessingOrdersInDb,
  AdminStatsData,
  AdminUserData,
  AdminOrderCheckResult,
} from '../services/dbApi';
import {
  getProfitMarginConfig,
  setProfitMarginConfig,
  ProfitMarginConfig,
  calculateRetailPrice,
  applyProfitMarginDirectly,
  fetchProfitMarginFromServer,
} from '../utils/profitUtils';
import { formatPriceSyp, getExchangeRate, convertToSyp, formatSypNumber } from '../utils/currencyUtils';
import {
  getScApiKeyStatus,
  updateScApiKey,
  getScSyncSettings,
  saveScSyncSettings,
  triggerScSyncNow,
  SyncSettingsData,
} from '../services/scStoreApi';
import { AdminDepositsTab } from './admin/AdminDepositsTab';
import { AdminMaintenanceTab } from './admin/AdminMaintenanceTab';

interface AdminDashboardProps {
  currentUser: CustomerUser | null;
  merchantInfo: MerchantInfo | null;
  onRefreshMerchant: () => void;
  isLoadingMerchant: boolean;
  onNavigateHome: () => void;
  onNavigateSettings: () => void;
  onOpenBannerManager?: () => void;
  onRefreshProducts?: () => void;
  initialTab?: 'stats' | 'users' | 'merchant' | 'profit' | 'order_check' | 'sync_settings' | 'deposits' | 'maintenance';
  onMaintenanceChange?: (settings: MaintenanceSettings) => void;
}

export const ADMIN_AUTHORIZED_EMAIL = 'm74321176@gmail.com';

export const AdminDashboard: React.FC<AdminDashboardProps> = React.memo(({
  currentUser,
  merchantInfo,
  onRefreshMerchant,
  isLoadingMerchant,
  onNavigateHome,
  onNavigateSettings,
  onOpenBannerManager,
  onRefreshProducts,
  initialTab,
  onMaintenanceChange,
}) => {
  // Active Tab inside Admin Panel
  const [activeAdminTab, setActiveAdminTab] = useState<'stats' | 'users' | 'merchant' | 'profit' | 'order_check' | 'sync_settings' | 'deposits' | 'maintenance'>(initialTab || 'stats');

  // Stats State
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Users Management State
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUserData | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState<boolean>(false);
  const [userActionMessage, setUserActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit User Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    balance: 0,
    role: 'customer',
    password: '',
  });

  // Create User Form State
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    phone: '',
    balance: 0,
    role: 'customer',
    password: '',
  });

  // Profit Margin State
  const [profitConfig, setProfitConfig] = useState<ProfitMarginConfig>(() => getProfitMarginConfig());
  const [profitPercentageInput, setProfitPercentageInput] = useState<string>(() => String(getProfitMarginConfig().percentage));
  const [profitFixedInput, setProfitFixedInput] = useState<string>(() => String(getProfitMarginConfig().fixedMarginUsd));
  const [isProfitSaved, setIsProfitSaved] = useState<boolean>(false);

  // Order Check State
  const [orderCheckIdInput, setOrderCheckIdInput] = useState<string>('');
  const [isCheckingOrder, setIsCheckingOrder] = useState<boolean>(false);
  const [orderCheckResult, setOrderCheckResult] = useState<AdminOrderCheckResult | null>(null);
  const [orderCheckError, setOrderCheckError] = useState<string | null>(null);

  // Bulk Processing Orders Sync State
  const [isSyncingProcessingOrders, setIsSyncingProcessingOrders] = useState<boolean>(false);
  const [syncProcessingMessage, setSyncProcessingMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // SC Store API Key Management State
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    hasCustomKey: boolean;
    isDefault: boolean;
    maskedKey: string;
    keyLength: number;
    prefix: string;
  } | null>(null);
  const [inputApiKey, setInputApiKey] = useState<string>('');
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState<boolean>(false);
  const [apiKeyFeedback, setApiKeyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

  // SC Store Product & Price Sync State
  const [syncSettings, setSyncSettings] = useState<SyncSettingsData | null>(null);
  const [syncIntervalInput, setSyncIntervalInput] = useState<string>('60');
  const [autoSyncEnabledInput, setAutoSyncEnabledInput] = useState<boolean>(true);
  const [isLoadingSyncSettings, setIsLoadingSyncSettings] = useState<boolean>(false);
  const [isTriggeringSyncNow, setIsTriggeringSyncNow] = useState<boolean>(false);
  const [isSavingSyncSettings, setIsSavingSyncSettings] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    stats?: { total: number; games: number; apps: number; cards: number; telecom: number; cash: number };
  } | null>(null);

  // UI state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Load API Key Status
  const loadApiKeyStatus = useCallback(async () => {
    try {
      const st = await getScApiKeyStatus();
      setApiKeyStatus(st);
    } catch {}
  }, []);

  // Load Sync Settings
  const loadSyncSettings = useCallback(async () => {
    setIsLoadingSyncSettings(true);
    try {
      const data = await getScSyncSettings();
      setSyncSettings(data);
      setSyncIntervalInput(String(data.intervalMinutes || 60));
      setAutoSyncEnabledInput(data.autoSyncEnabled);
    } catch (err) {
      console.error('Failed to load sync settings:', err);
    } finally {
      setIsLoadingSyncSettings(false);
    }
  }, []);

  // Save Sync Interval & Toggle
  const handleSaveSyncSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedMinutes = parseInt(syncIntervalInput.trim(), 10);
    if (isNaN(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 10080) {
      setSyncFeedback({
        type: 'error',
        text: 'يرجى إدخال زمن مزامنة صحيح بالدقائق (رقم بين 1 دقيقة و 10080 دقيقة).',
      });
      return;
    }

    setIsSavingSyncSettings(true);
    setSyncFeedback(null);
    try {
      const res = await saveScSyncSettings({
        intervalMinutes: parsedMinutes,
        autoSyncEnabled: autoSyncEnabledInput,
      });

      if (res.success) {
        if (res.settings) {
          setSyncSettings(res.settings);
        }
        setSyncFeedback({
          type: 'success',
          text: res.message || `تم حفظ زمن المزامنة بنجاح (كل ${parsedMinutes} دقيقة)!`,
        });
      } else {
        setSyncFeedback({
          type: 'error',
          text: res.message || 'تعذر حفظ إعدادات زمن المزامنة، يرجى المحاولة مرة أخرى.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء حفظ الإعدادات.',
      });
    } finally {
      setIsSavingSyncSettings(false);
    }
  };

  // Immediate Sync Now Handler
  const handleTriggerSyncNow = async () => {
    setIsTriggeringSyncNow(true);
    setSyncFeedback(null);
    try {
      const res = await triggerScSyncNow();
      if (res.success) {
        if (res.settings) {
          setSyncSettings(res.settings);
        } else {
          loadSyncSettings();
        }
        setSyncFeedback({
          type: 'success',
          text: res.message || 'تمت مزامنة المنتجات وتحديث الأسعار بنجاح!',
          stats: res.stats,
        });

        // Notify app and storefront of newly synced products & prices
        window.dispatchEvent(new CustomEvent('nexen-products-synced'));
        if (onRefreshProducts) {
          onRefreshProducts();
        }
        if (onRefreshMerchant) {
          onRefreshMerchant();
        }
        loadStats();
      } else {
        setSyncFeedback({
          type: 'error',
          text: res.message || 'تعذر تنفيذ المزامنة من المورد حالياً، يرجى التحقق من الاتصال ومفتاح API.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        text: err.message || 'حدث خطأ غير متوقع أثناء محاولة المزامنة الفورية.',
      });
    } finally {
      setIsTriggeringSyncNow(false);
    }
  };

  // Save / Update SC Store API Key with Live Verification
  const handleSaveApiKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputApiKey.trim();
    if (!cleanKey) {
      setApiKeyFeedback({ type: 'error', text: 'يرجى إدخال مفتاح API أولاً قبل الحفظ.' });
      return;
    }

    setIsUpdatingApiKey(true);
    setApiKeyFeedback(null);

    try {
      const res = await updateScApiKey(cleanKey);
      if (res.success) {
        setApiKeyFeedback({
          type: 'success',
          text: res.message || 'تم التحقق من مفتاح API بنجاح وحفظه في النظام!',
        });
        setInputApiKey('');
        setShowApiKeyInput(false);
        await loadApiKeyStatus();
        onRefreshMerchant();
      } else {
        setApiKeyFeedback({
          type: 'error',
          text: `${res.message || 'فشل التحقق من المفتاح'} ${res.detail ? `(${res.detail})` : ''}`,
        });
      }
    } catch (err: any) {
      setApiKeyFeedback({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ المفتاح' });
    } finally {
      setIsUpdatingApiKey(false);
    }
  };

  // Load Admin Stats
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await fetchAdminStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.warn('Could not load admin stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load Admin Users
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err) {
      console.warn('Could not load admin users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Initial loading
  useEffect(() => {
    loadStats();
    loadUsers();
    loadApiKeyStatus();
    loadSyncSettings();

    // Fetch live profit margin configuration from database
    fetchProfitMarginFromServer().then((remoteConfig) => {
      if (remoteConfig) {
        setProfitConfig(remoteConfig);
        setProfitPercentageInput(String(remoteConfig.percentage));
        setProfitFixedInput(String(remoteConfig.fixedMarginUsd));
      }
    });
  }, [loadStats, loadUsers, loadApiKeyStatus, loadSyncSettings]);

  // Open Edit User Modal
  const handleOpenEditUser = (user: AdminUserData) => {
    setSelectedUserForEdit(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      balance: user.balance || 0,
      role: user.role || 'customer',
      password: '',
    });
  };

  // Submit User Edit
  const handleSubmitEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    setUserActionMessage(null);
    const res = await updateAdminUser(selectedUserForEdit.id, {
      name: editFormData.name,
      email: editFormData.email,
      phone: editFormData.phone || undefined,
      balance: Number(editFormData.balance),
      role: editFormData.role,
      password: editFormData.password || undefined,
    });

    if (res.success) {
      setUserActionMessage({ type: 'success', text: `تم تحديث بيانات المستخدم ${editFormData.name} بنجاح!` });
      setSelectedUserForEdit(null);
      await loadUsers();
      await loadStats();
      setTimeout(() => setUserActionMessage(null), 4000);
    } else {
      setUserActionMessage({ type: 'error', text: res.error || 'فشل تحديث بيانات المستخدم' });
    }
  };

  // Submit Create User
  const handleSubmitCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMessage(null);

    const res = await createAdminUser({
      name: createFormData.name,
      email: createFormData.email,
      phone: createFormData.phone || undefined,
      balance: Number(createFormData.balance),
      role: createFormData.role,
      password: createFormData.password || undefined,
    });

    if (res.success) {
      setUserActionMessage({ type: 'success', text: `تم إنشاء حساب المستخدم ${createFormData.name} بنجاح!` });
      setIsCreateUserModalOpen(false);
      setCreateFormData({
        name: '',
        email: '',
        phone: '',
        balance: 0,
        role: 'customer',
        password: '',
      });
      await loadUsers();
      await loadStats();
      setTimeout(() => setUserActionMessage(null), 4000);
    } else {
      setUserActionMessage({ type: 'error', text: res.error || 'فشل إنشاء المستخدم' });
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف حساب المستخدم "${userName}" نهائياً من قاعدة البيانات؟`)) {
      return;
    }

    const res = await deleteAdminUser(userId);
    if (res.success) {
      setUserActionMessage({ type: 'success', text: `تم حذف المستخدم ${userName} بنجاح!` });
      await loadUsers();
      await loadStats();
      setTimeout(() => setUserActionMessage(null), 4000);
    } else {
      setUserActionMessage({ type: 'error', text: res.error || 'فشل حذف المستخدم' });
    }
  };

  // Save Profit Margin Settings (Immediate, Direct, and Database-Synced)
  const handleSaveProfitMargin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const percent = Math.max(0, parseFloat(profitPercentageInput) || 0);
    const fixed = Math.max(0, parseFloat(profitFixedInput) || 0);

    const savedConfig = await applyProfitMarginDirectly(percent, fixed, true);
    setProfitConfig(savedConfig);

    setIsProfitSaved(true);
    setTimeout(() => setIsProfitSaved(false), 3000);
  };

  // Immediate Quick Preset (+5%, +10%, etc.)
  const handleQuickPreset = async (percent: number) => {
    setProfitPercentageInput(String(percent));
    const fixed = Math.max(0, parseFloat(profitFixedInput) || 0);
    const savedConfig = await applyProfitMarginDirectly(percent, fixed, true);
    setProfitConfig(savedConfig);
    setIsProfitSaved(true);
    setTimeout(() => setIsProfitSaved(false), 2500);
  };

  // Immediate Percentage Input change
  const handlePercentageChange = (val: string) => {
    setProfitPercentageInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      applyProfitMarginDirectly(num, Math.max(0, parseFloat(profitFixedInput) || 0), true).then((saved) => {
        setProfitConfig(saved);
      });
    }
  };

  // Immediate Fixed Margin Input change
  const handleFixedMarginChange = (val: string) => {
    setProfitFixedInput(val);
    const fixedNum = parseFloat(val);
    if (!isNaN(fixedNum) && fixedNum >= 0) {
      applyProfitMarginDirectly(Math.max(0, parseFloat(profitPercentageInput) || 0), fixedNum, true).then((saved) => {
        setProfitConfig(saved);
      });
    }
  };

  // Toggle profit margin enabled
  const handleToggleProfitEnabled = async () => {
    const newEnabled = !profitConfig.enabled;
    const percent = Math.max(0, parseFloat(profitPercentageInput) || 0);
    const fixed = Math.max(0, parseFloat(profitFixedInput) || 0);
    const savedConfig = await applyProfitMarginDirectly(percent, fixed, newEnabled);
    setProfitConfig(savedConfig);
    setIsProfitSaved(true);
    setTimeout(() => setIsProfitSaved(false), 3000);
  };

  // Order Check lookup
  const handleCheckOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = orderCheckIdInput.trim();
    if (!cleanId) return;

    setIsCheckingOrder(true);
    setOrderCheckResult(null);
    setOrderCheckError(null);

    try {
      const result = await checkAdminOrderDetails(cleanId);
      if (result) {
        setOrderCheckResult(result);
      } else {
        setOrderCheckError(`لم يتم العثور على أي بيانات للطلب #${cleanId}`);
      }
    } catch (err: any) {
      setOrderCheckError(err.message || 'حدث خطأ أثناء فحص الطلب');
    } finally {
      setIsCheckingOrder(false);
    }
  };

  // Sync / check all processing/pending orders from SC Store API
  const handleSyncProcessingOrdersOnly = async () => {
    setIsSyncingProcessingOrders(true);
    setSyncProcessingMessage(null);
    try {
      const res = await syncProcessingOrdersInDb();
      if (res.success) {
        setSyncProcessingMessage({
          type: 'success',
          text: `تم فحص ${res.totalChecked} طلب قيد المعالجة: ${res.completedCount || 0} مكتمل، ${res.stillProcessingCount || 0} ما زال قيد المعالجة.`,
        });
        await loadStats();
      } else {
        setSyncProcessingMessage({
          type: 'error',
          text: res.message || res.error || 'فشل التحقق من الطلبات قيد المعالجة',
        });
      }
    } catch (err: any) {
      setSyncProcessingMessage({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء فحص الطلبات',
      });
    } finally {
      setIsSyncingProcessingOrders(false);
      setTimeout(() => setSyncProcessingMessage(null), 6000);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase().trim();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q))
    );
  });

  const exchangeRate = getExchangeRate();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16">
      {/* 1. TOP ADMIN HEADER */}
      <div className="bg-gradient-to-r from-[#7F00FF] via-[#6e00dd] to-[#5a00b8] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background glow & art */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-950/40 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 text-white flex items-center justify-center shadow-md shrink-0 backdrop-blur-md">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-extrabold bg-white/20 text-white px-3 py-0.5 rounded-full uppercase tracking-wider border border-white/30 backdrop-blur-sm">
                  لوحة التحكم الرئيسية للمدير
                </span>
                <span className="text-[11px] font-mono bg-emerald-400/20 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-300/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  مفعل لصاحب البريد: {ADMIN_AUTHORIZED_EMAIL}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                لوحة تحكم وإدارة المتجر الشاملة
              </h1>
              <p className="text-xs sm:text-sm text-purple-100/90 mt-1 max-w-2xl leading-relaxed">
                متابعة الإحصائيات الفورية، إدارة المستخدمين وتعديل أرصدتهم، الحساب التجاري SC Store، ضبط نسبة الربح الشاملة، والتحقق من حالة الطلبات.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                loadStats();
                loadUsers();
                onRefreshMerchant();
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 backdrop-blur-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats || isLoadingUsers || isLoadingMerchant ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>

            <button
              type="button"
              onClick={onNavigateSettings}
              className="px-3.5 py-2.5 rounded-xl bg-white text-[#7F00FF] hover:bg-purple-50 active:scale-95 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>العودة للإعدادات</span>
              <ArrowRight className="w-3.5 h-3.5 mr-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. ADMIN NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveAdminTab('stats')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'stats'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25 scale-[1.02]'
              : 'bg-white dark:bg-[#151221] text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>الإحصائيات العامة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'users'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25 scale-[1.02]'
              : 'bg-white dark:bg-[#151221] text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>إدارة المستخدمين ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('merchant')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'merchant'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25 scale-[1.02]'
              : 'bg-white dark:bg-[#151221] text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>حسابي التجاري (SC Store)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('profit')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'profit'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25 scale-[1.02]'
              : 'bg-white dark:bg-[#151221] text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>نسبة الربح الشاملة {profitConfig.enabled && profitConfig.percentage > 0 ? `(+${profitConfig.percentage}%)` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('order_check')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'order_check'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25 scale-[1.02]'
              : 'bg-white dark:bg-[#151221] text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>التحقق من حالة طلب</span>
        </button>

        <button
          id="tab-btn-sync-settings"
          type="button"
          onClick={() => setActiveAdminTab('sync_settings')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'sync_settings'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25 scale-[1.02]'
              : 'bg-white dark:bg-[#151221] text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>إعدادات المزامنة {syncSettings?.intervalMinutes ? `(كل ${syncSettings.intervalMinutes} دقيقة)` : ''}</span>
        </button>

        <button
          id="tab-btn-deposits"
          type="button"
          onClick={() => setActiveAdminTab('deposits')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'deposits'
              ? 'bg-[#7F00FF] text-white shadow-md shadow-[#7F00FF]/25 scale-[1.02]'
              : 'bg-white dark:bg-[#151221] text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>طلبات وطرق الإيداع 💰</span>
        </button>

        <button
          id="tab-btn-maintenance"
          type="button"
          onClick={() => setActiveAdminTab('maintenance')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'maintenance'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 scale-[1.02]'
              : 'bg-white dark:bg-[#151221] text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-500" />
          <span>وضع الصيانة ⚙️</span>
        </button>

        {onOpenBannerManager && (
          <button
            type="button"
            onClick={onOpenBannerManager}
            className="flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 active:scale-95"
          >
            <ImageIcon className="w-4 h-4" />
            <span>إدارة البنرات الإعلانية 🖼️</span>
          </button>
        )}
      </div>

      {/* Action Notification Message */}
      {userActionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in ${
            userActionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {userActionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <span>{userActionMessage.text}</span>
        </div>
      )}

      {/* 3. TAB CONTENT 1: STATS & OVERVIEW */}
      {activeAdminTab === 'stats' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Users */}
            <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي المستخدمين</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {stats?.totalUsers ?? users.length}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
                  مسجلين في قاعدة بيانات Neon
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Total Orders */}
            <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي الطلبات</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {stats?.totalOrders ?? 0}
                </span>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">✓ {stats?.completedOrders ?? 0} مكتمل</span>
                  <span className="text-amber-600 dark:text-amber-400">⏳ {stats?.pendingOrders ?? 0} قيد التنفيذ</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Total Sales / Revenue */}
            <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">إجمالي المبيعات</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {formatSypNumber(convertToSyp(stats?.totalRevenueUsd ?? 0, 'USD', exchangeRate, false))} ل.س
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                  إجمالي قيمة المشتريات المكتملة
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: SC Store Balance */}
            <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">رصيد الحساب المتاح</span>
                <span className="text-xl sm:text-2xl font-black text-[#7F00FF] dark:text-purple-300 font-mono">
                  {formatSypNumber(convertToSyp(merchantInfo?.balance ?? 0, 'USD', exchangeRate, false))} ل.س
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mt-1">
                  الحساب التجاري المباشر
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/60 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  أحدث الطلبات المنفذة في المتجر
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  سجل فوري لجميع عمليات الشراء المنفذة بواسطة العملاء
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Check processing orders only button */}
                <button
                  type="button"
                  id="admin-sync-processing-orders-btn"
                  onClick={handleSyncProcessingOrdersOnly}
                  disabled={isSyncingProcessingOrders}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title="التحقق من تحديثات الطلبات التي قيد المعالجة فقط عبر SC Store API"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingProcessingOrders ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingProcessingOrders ? 'جارٍ التحقق من الـ API...' : 'التحقق من الطلبات قيد المعالجة'}
                  </span>
                  {(stats?.pendingOrders ?? 0) > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-mono font-black animate-pulse">
                      {stats?.pendingOrders}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAdminTab('order_check')}
                  className="text-xs font-bold text-[#7F00FF] dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer px-2 py-1"
                >
                  <span>فحص طلب محدد</span>
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sync Feedback Alert */}
            {syncProcessingMessage && (
              <div
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
                  syncProcessingMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncProcessingMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{syncProcessingMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncProcessingMessage(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  ✕
                </button>
              </div>
            )}

            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="pb-3 pr-2">رقم الطلب</th>
                      <th className="pb-3">المنتج</th>
                      <th className="pb-3">المستخدم / العميل</th>
                      <th className="pb-3">السعر</th>
                      <th className="pb-3">الحالة</th>
                      <th className="pb-3">التاريخ</th>
                      <th className="pb-3 pl-2 text-left">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {stats.recentOrders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 pr-2 font-mono font-bold text-purple-700 dark:text-purple-300">
                          #{order.orderId}
                        </td>
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-100">
                          {order.productName}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-400">
                          {order.customerName || order.customerEmail || 'عميل مسجل'}
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                          {formatPriceSyp(order.total, 'USD')}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'completed'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : order.status === 'failed'
                                ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {order.status === 'completed'
                              ? 'مكتمل'
                              : order.status === 'failed'
                              ? 'ملغي / فشل'
                              : 'قيد المعالجة'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : 'الآن'}
                        </td>
                        <td className="py-3 pl-2 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setOrderCheckIdInput(order.orderId);
                              setActiveAdminTab('order_check');
                              setTimeout(() => {
                                handleCheckOrder();
                              }, 100);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#7F00FF] hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                            title="فحص تفاصيل الطلب"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                لا توجد طلبات مسجلة حتى الآن في قاعدة البيانات.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT 2: USERS MANAGEMENT */}
      {activeAdminTab === 'users' && (
        <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>إدارة حسابات المستخدمين</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                  {filteredUsers.length} مستخدم
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                عرض وتعديل تفاصيل المستخدمين، شحن أو خصم الأرصدة، وتغيير الأدوار.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو البريد أو الهاتف..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              {/* Add User Button */}
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(true)}
                className="px-3.5 py-2 bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إضافة مستخدم</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                  <th className="pb-3 pr-2">المستخدم</th>
                  <th className="pb-3">البريد الإلكتروني</th>
                  <th className="pb-3">الهاتف</th>
                  <th className="pb-3">الرصيد الحالي</th>
                  <th className="pb-3">الطلبات</th>
                  <th className="pb-3">الرتبة</th>
                  <th className="pb-3 pl-2 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 pr-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">ID: {u.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {u.email}
                    </td>
                    <td className="py-3.5 font-mono text-slate-500 dark:text-slate-400">
                      {u.phone || '—'}
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block text-xs sm:text-sm">
                        {formatSypNumber(convertToSyp(u.balance || 0, 'USD', exchangeRate, false))} ل.س
                      </span>
                    </td>
                    <td className="py-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                        {u.ordersCount || 0} طلب
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {u.role === 'admin' ? 'مدير' : 'عميل'}
                      </span>
                    </td>
                    <td className="py-3.5 pl-2 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="تعديل التفاصيل والرصيد"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT 3: MERCHANT ACCOUNT (SC STORE) */}
      {activeAdminTab === 'merchant' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    بيانات الحساب التجاري (SC Store)
                  </h3>
                  <p className="text-xs text-slate-400">
                    البيانات الفعلية المجلوبة مباشرة من API الحساب المزود
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onRefreshMerchant}
                disabled={isLoadingMerchant}
                className="px-4 py-2.5 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchant ? 'animate-spin' : ''}`} />
                <span>تحديث البيانات الآن</span>
              </button>
            </div>

            {/* The Single Merchant Card requested by the user */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-[#1a162b] border border-slate-200/80 dark:border-purple-900/40 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {/* 1. اسم حسابك التجاري (من name) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      اسم حسابك التجاري:
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block truncate">
                      {merchantInfo?.name || (merchantInfo?.email ? merchantInfo.email : 'لم يتم ربط الحساب بعد')}
                    </span>
                    {merchantInfo?.email && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate mt-0.5" dir="ltr">
                        {merchantInfo.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. رصيد حسابك SYP ليرة سورية (من Balance) */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20 border border-purple-200/80 dark:border-purple-800/40 shadow-xs flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#7F00FF] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-[#7F00FF]/30">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block mb-1">
                      رصيد حسابك SYP ليرة سورية:
                    </span>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black text-[#7F00FF] dark:text-purple-200 font-mono">
                        {formatSypNumber(merchantInfo?.balance ?? 0)}
                      </span>
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-300">ل.س</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      الرصيد المتاح للطلبات والشحن التلقائي
                    </span>
                  </div>
                </div>

                {/* 3. حالة توثيق بريدك لدى sc-store (من emailVerified) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    merchantInfo?.emailVerified === true
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      حالة توثيق بريدك لدى sc-store:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {merchantInfo?.emailVerified === true ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          موثق بنجاح لدى SC Store
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          غير موثق أو غير متصل
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. حالة توثيق هويتك لدى sc-store (من identityVerified) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    merchantInfo?.identityVerified === true
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      حالة توثيق هويتك لدى sc-store:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {merchantInfo?.identityVerified === true ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          الهوية موثقة ومعتمدة لدى SC Store
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          الهوية غير موثقة أو غير متصلة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SC Store API Key Management & Provider Connection */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-[#1a162b] border border-slate-200/80 dark:border-purple-900/40 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      إدارة مفتاح الربط مع المزود (SC Store API Key)
                    </h4>
                    <p className="text-xs text-slate-400">
                      المفتاح المسؤول عن تنفيذ وتمرير طلبات الشحن تلقائياً إلى sc-store.top
                    </p>
                  </div>
                </div>

                <a
                  href="https://sc-store.top"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>فتح لوحة حسابك في sc-store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Status Alert Banner */}
              {merchantInfo?.error || !merchantInfo?.name ? (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs sm:text-sm space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black block text-sm">
                        تنبيه عاجل: مفتاح API الحالي معطّل أو غير صالح (كود 403 Forbidden)
                      </span>
                      <p className="text-xs mt-1 leading-relaxed text-red-600 dark:text-red-300/90">
                        هذا هو السبب المباشر لظهور رسالة <strong>«عذراً حدث خطأ من قبلنا»</strong> عند محاولة شحن الألعاب أو البرامج أو الرصيد.
                        مزود الخدمة الخارجي يرفض قبول الطلبات بالمفتاح الحالي. يرجى إدخال مفتاح API سليم ونشط من حسابك لتفعيل الشحن التلقائي فوراً.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>مفتاح API متصل ويعمل بنجاح، وطلبات الشحن التلقائية نشطة لدى المزود.</span>
                </div>
              )}

              {/* Current Masked Key Info */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    المفتاح المستخدم حالياً في المتجر:
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                    <span>{apiKeyStatus?.maskedKey || 'sc_OdGC••••••••••••rsGI'}</span>
                    {apiKeyStatus?.isDefault ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-sans font-bold">
                        مفتاح النظام الافتراضي (معطّل)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-sans font-bold">
                        مفتاح مخصص محفوظ
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className="px-4 py-2 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {showApiKeyInput ? 'إخفاء حقل التحديث' : 'تحديث واستبدال المفتاح'}
                </button>
              </div>

              {/* Key Update Form */}
              {(showApiKeyInput || merchantInfo?.error || !merchantInfo?.name) && (
                <form onSubmit={handleSaveApiKey} className="p-5 rounded-2xl bg-white dark:bg-[#151221] border border-purple-200 dark:border-purple-900/50 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      أدخل مفتاح SC Store API الجديد:
                    </label>
                    <div className="flex items-center gap-2 flex-col sm:flex-row">
                      <input
                        type="text"
                        value={inputApiKey}
                        onChange={(e) => setInputApiKey(e.target.value)}
                        placeholder="sc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        dir="ltr"
                        className="flex-1 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                      />
                      <button
                        type="submit"
                        disabled={isUpdatingApiKey || !inputApiKey.trim()}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0"
                      >
                        {isUpdatingApiKey ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>جارٍ فحص المفتاح وتفعيله...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>فحص وتفعيل المفتاح الآن</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      ملاحظة: يقوم النظام بفحص المفتاح حياً مع خادم المزود للتأكد من رصيده وتفعيله قبل حفظه.
                    </p>
                  </div>

                  {apiKeyFeedback && (
                    <div
                      className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                        apiKeyFeedback.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {apiKeyFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      )}
                      <span>{apiKeyFeedback.text}</span>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT 4: PROFIT MARGIN (نسبة الربح الشاملة) */}
      {activeAdminTab === 'profit' && (
        <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center shrink-0">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  إضافة وضبط نسبة الربح الشاملة (تطبيق فوري ومباشر)
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                  يتم تطبيق وحساب نسبة الربح فوراً وبشكل لحظي ومباشر على كافة المنتجات وبطاقات الشحن لزبائن المتجر وتخزينها في قاعدة البيانات.
                </p>
              </div>
            </div>

            {/* Toggle Active Status */}
            <button
              type="button"
              onClick={handleToggleProfitEnabled}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                profitConfig.enabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${profitConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{profitConfig.enabled ? 'نسبة الربح: مفعلة وتعمل فوراً' : 'نسبة الربح: معطلة'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveProfitMargin} className="space-y-6 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Percentage Margin */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  النسبة المئوية لهامش الربح (%)
                </label>
                <div className="relative">
                  <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-bold">+</span>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.5"
                    value={profitPercentageInput}
                    onChange={(e) => handlePercentageChange(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                    placeholder="مثال: 10"
                  />
                  <span className="absolute left-3.5 top-3 text-xs text-slate-400 font-bold">%</span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-medium ml-1">خيارات سريعة (تطبيق فوري):</span>
                  {[0, 5, 10, 15, 20, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickPreset(pct)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        profitPercentageInput === String(pct)
                          ? 'bg-[#7F00FF] text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-400'
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed Margin Addition */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  مبلغ ربح إضافي ثابت لكل عملية (اختياري)
                </label>
                <div className="relative">
                  <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-bold">+</span>
                  <input
                    type="number"
                    min="0"
                    step="0.05"
                    value={profitFixedInput}
                    onChange={(e) => handleFixedMarginChange(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                    placeholder="مثال: 0.20"
                  />
                  <span className="absolute left-3.5 top-3 text-xs text-slate-400 font-bold">$</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  يُضاف هذا المبلغ الثابت بالدولار فوق نسبة الربح المئوية إن وُجد.
                </p>
              </div>
            </div>

            {/* Live Interactive Pricing Simulator */}
            <div className="p-5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 space-y-3">
              <h4 className="text-xs sm:text-sm font-black text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#7F00FF]" />
                <span>محاكي معاينة الأسعار الفورية للزبائن بالليرة السورية:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-purple-900/50">
                  <span className="text-[10px] text-slate-400 block font-medium">سعر الجملة الافتراضي للمنتج</span>
                  <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                    {formatSypNumber(10 * exchangeRate)} ل.س
                  </span>
                </div>

                <div className="p-3.5 bg-purple-100/80 dark:bg-purple-900/50 rounded-xl border border-purple-200 dark:border-purple-700/50">
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 block font-bold">
                    سعر البيع النهائي في المتجر ({profitConfig.enabled ? `+${profitPercentageInput || 0}%` : 'الربح معطل'})
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatSypNumber(
                      Math.round(
                        (profitConfig.enabled
                          ? (10 * (1 + (parseFloat(profitPercentageInput) || 0) / 100)) + (parseFloat(profitFixedInput) || 0)
                          : 10) * exchangeRate
                      )
                    )} ل.س
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-md shadow-[#7F00FF]/25 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وتطبيق نسبة الربح فوراً ومباشرة</span>
              </button>

              {isProfitSaved && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم تطبيق نسبة الربح فوراً وتحديث الأسعار في كامل المتجر وقاعدة البيانات!</span>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 7. TAB CONTENT 5: ORDER STATUS CHECKER */}
      {activeAdminTab === 'order_check' && (
        <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center shrink-0">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                التحقق والفحص الشامل لحالة أي طلب
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                استعلام مباشر يجمع بين سجل قاعدة بيانات Neon واستجابة خادم SC Store في الوقت الفعلي.
              </p>
            </div>
          </div>

          {/* Bulk Check Banner for Processing Orders */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  التحقق التلقائي من الطلبات قيد المعالجة فقط
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  يقوم بالاستعلام عن حالة جميع الطلبات التي ما زالت في حالة قيد التنفيذ أو معالجة وتحديثها في قاعدة البيانات.
                </span>
              </div>
            </div>

            <button
              type="button"
              id="admin-bulk-check-processing-btn"
              onClick={handleSyncProcessingOrdersOnly}
              disabled={isSyncingProcessingOrders}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingProcessingOrders ? 'animate-spin' : ''}`} />
              <span>{isSyncingProcessingOrders ? 'جارٍ فحص المعالقة...' : 'فحص الطلبات المعلقة الآن'}</span>
            </button>
          </div>

          <form onSubmit={handleCheckOrder} className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-4 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="أدخل رقم الطلب (مثال: ORD-1740502938491 أو 123456)..."
                value={orderCheckIdInput}
                onChange={(e) => setOrderCheckIdInput(e.target.value)}
                className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
              />
            </div>

            <button
              type="submit"
              disabled={isCheckingOrder || !orderCheckIdInput.trim()}
              className="px-6 py-3 bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingOrder ? 'animate-spin' : ''}`} />
              <span>{isCheckingOrder ? 'جارٍ الفحص...' : 'فحص حالة الطلب'}</span>
            </button>
          </form>

          {/* Quick Suggestions from Stats */}
          {stats?.recentOrders && stats.recentOrders.length > 0 && !orderCheckResult && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400">
              <span className="font-semibold">أحدث الطلبات للاستعلام السريع:</span>
              {stats.recentOrders.slice(0, 4).map((o) => (
                <button
                  key={o.orderId}
                  type="button"
                  onClick={() => {
                    setOrderCheckIdInput(o.orderId);
                    setTimeout(() => {
                      checkAdminOrderDetails(o.orderId).then((res) => {
                        if (res) setOrderCheckResult(res);
                      });
                    }, 50);
                  }}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 text-purple-700 dark:text-purple-300 rounded-lg font-mono text-[11px] font-bold cursor-pointer transition-colors"
                >
                  #{o.orderId}
                </button>
              ))}
            </div>
          )}

          {/* Error Message */}
          {orderCheckError && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-center gap-2">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>{orderCheckError}</span>
            </div>
          )}

          {/* Inspection Result Display */}
          {orderCheckResult && (
            <div className="space-y-4 pt-2 animate-in fade-in">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">نتيجة فحص الطلب:</span>
                    <span className="text-sm font-black text-purple-700 dark:text-purple-300 font-mono">
                      #{orderCheckResult.orderId}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      (orderCheckResult.scData?.status === 'completed' || orderCheckResult.dbOrder?.status === 'completed')
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : (orderCheckResult.scData?.status === 'failed' || orderCheckResult.dbOrder?.status === 'failed')
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {(orderCheckResult.scData?.status === 'completed' || orderCheckResult.dbOrder?.status === 'completed')
                      ? '✓ مكتمل وتم الشحن'
                      : (orderCheckResult.scData?.status === 'failed' || orderCheckResult.dbOrder?.status === 'failed')
                      ? '✗ فشل / ملغي'
                      : '⏳ قيد المعالجة'}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-400 block font-medium">اسم المنتج</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block mt-0.5">
                      {orderCheckResult.dbOrder?.productName || orderCheckResult.scData?.productName || 'منتج رقمي'}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-400 block font-medium">المبلغ الإجمالي</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm block mt-0.5">
                      {formatPriceSyp(typeof (orderCheckResult.dbOrder?.total ?? orderCheckResult.scData?.price) === 'number' ? (orderCheckResult.dbOrder?.total ?? orderCheckResult.scData?.price) : parseFloat(orderCheckResult.dbOrder?.total ?? orderCheckResult.scData?.price) || 0, 'USD')}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-400 block font-medium">المستخدم / العميل</span>
                    <span className="font-bold text-slate-900 dark:text-white block mt-0.5 truncate">
                      {orderCheckResult.dbOrder?.customerName || orderCheckResult.dbOrder?.customerEmail || 'عميل مسجل'}
                    </span>
                  </div>
                </div>

                {/* Dynamic Fields (Player ID / Phone) */}
                {orderCheckResult.dbOrder?.dynamicFields && Object.keys(orderCheckResult.dbOrder.dynamicFields).length > 0 && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 text-xs">
                    <span className="font-bold text-purple-900 dark:text-purple-300 block mb-1">
                      البيانات المدخلة للطلب (معرف اللاعب / الرقم):
                    </span>
                    <div className="flex items-center gap-3 flex-wrap font-mono">
                      {Object.entries(orderCheckResult.dbOrder.dynamicFields).map(([k, v]) => (
                        <span key={k} className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md font-bold text-slate-800 dark:text-slate-200 border border-purple-200 dark:border-purple-800">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* SC Store Raw Response JSON Viewer */}
                {orderCheckResult.scData && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>الاستجابة الخام من سيرفر SC Store API:</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify(orderCheckResult.scData, null, 2), 'raw_response')}
                        className="text-[#7F00FF] dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedText === 'raw_response' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>نسخ الاستجابة</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 scrollbar-none border border-slate-800">
                      {JSON.stringify(orderCheckResult.scData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7.5. TAB CONTENT 6: SYNC SETTINGS & CONTROLS */}
      {activeAdminTab === 'sync_settings' && (
        <div id="admin-sync-settings-section" className="space-y-6 animate-in fade-in duration-300">
          {/* Header Banner Card */}
          <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/25">
                <Clock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    إعدادات مزامنة المنتجات والأسعار من المورد
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                    SC Store API Sync
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                  تحكم بجدولة الفحص والتحديث التلقائي لكافة باقات الألعاب والتطبيقات والبطاقات والاتصالات من المورد، وتطبيق أحدث الأسعار والتغيرات تلقائياً.
                </p>
              </div>
            </div>

            {/* Sync Now Trigger Button */}
            <div className="shrink-0 flex items-center gap-3">
              <button
                id="btn-sync-now-top"
                type="button"
                onClick={handleTriggerSyncNow}
                disabled={isTriggeringSyncNow}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#7F00FF] hover:bg-[#6e00de] text-white font-bold text-sm transition-all duration-200 shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isTriggeringSyncNow ? 'animate-spin' : ''}`} />
                <span>{isTriggeringSyncNow ? 'جارٍ المزامنة وسحب الأسعار...' : 'مزامنة الآن'}</span>
              </button>
            </div>
          </div>

          {/* Sync Feedback Message */}
          {syncFeedback && (
            <div
              id="sync-feedback-banner"
              className={`p-4 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm animate-in fade-in duration-200 ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                  : syncFeedback.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
                  : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <p className="font-bold">{syncFeedback.text}</p>
                {syncFeedback.stats && (
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold">
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">إجمالي: {syncFeedback.stats.total} باقة</span>
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">ألعاب: {syncFeedback.stats.games}</span>
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">تطبيقات: {syncFeedback.stats.apps}</span>
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg">بطاقات: {syncFeedback.stats.cards}</span>
                    <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 rounded-lg">اتصالات: {syncFeedback.stats.telecom}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">كاش: {syncFeedback.stats.cash}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSyncFeedback(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 4 Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Last Sync */}
            <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">آخر مزامنة ناجحة</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#7F00FF] dark:text-purple-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {syncSettings?.lastSyncAt
                    ? new Date(syncSettings.lastSyncAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                    : 'لم تتم المزامنة بعد'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {syncSettings?.lastSyncMessage || 'جاهز للبدء'}
                </p>
              </div>
            </div>

            {/* Card 2: Next Sync */}
            <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المزامنة القادمة</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {syncSettings?.autoSyncEnabled && syncSettings?.nextSyncAt
                    ? new Date(syncSettings.nextSyncAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                    : 'المزامنة التلقائية معطلة'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {syncSettings?.autoSyncEnabled
                    ? `تلقائياً كل ${syncSettings.intervalMinutes} دقيقة`
                    : 'يمكنك تفعيلها أدناه'}
                </p>
              </div>
            </div>

            {/* Card 3: Total Synced Products */}
            <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المنتجات والباقات</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {syncSettings?.lastSyncStats?.total ? `${syncSettings.lastSyncStats.total} باقة` : '150+ باقة'}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>ألعاب: {syncSettings?.lastSyncStats?.games ?? 65}</span>
                  <span>•</span>
                  <span>تطبيقات: {syncSettings?.lastSyncStats?.apps ?? 40}</span>
                </div>
              </div>
            </div>

            {/* Card 4: Profit Integration Status */}
            <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الربح الشامل المطبق</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {profitConfig.enabled && profitConfig.percentage > 0 ? `+${profitConfig.percentage}%` : 'سعر المورد المباشر'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  يُحسب السعر النهائي فور سحب السعر الأساسي
                </p>
              </div>
            </div>
          </div>

          {/* Form & Interval Configuration */}
          <div className="bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
              <div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  تحديد زمن دورة المزامنة التلقائية (بالدقائق)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  حدد الفاصل الزمني بالدقيقة الذي يقوم بعده السيرفر بالاتصال التلقائي بمزود الخدمة وتحديث الأسعار والمخزون.
                </p>
              </div>

              {/* Auto Sync Toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 dark:bg-slate-900/60 p-2.5 px-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
                <input
                  type="checkbox"
                  checked={autoSyncEnabledInput}
                  onChange={(e) => setAutoSyncEnabledInput(e.target.checked)}
                  className="w-4 h-4 accent-[#7F00FF] cursor-pointer rounded"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  {autoSyncEnabledInput ? 'المزامنة التلقائية مفعلة ✅' : 'المزامنة التلقائية معطلة ⏸️'}
                </span>
              </label>
            </div>

            <form onSubmit={handleSaveSyncSettings} className="space-y-6">
              {/* Minutes Input with Quick Presets */}
              <div className="space-y-3">
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                  زمن المزامنة من المورد بالدقيقة (مثال: كل ٦٠ دقيقة):
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
                  <div className="relative flex-1">
                    <input
                      id="input-sync-interval-minutes"
                      type="number"
                      min={1}
                      max={10080}
                      step={1}
                      required
                      value={syncIntervalInput}
                      onChange={(e) => setSyncIntervalInput(e.target.value)}
                      placeholder="60"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-base font-mono focus:outline-none focus:border-[#7F00FF] transition-all pl-16 text-left"
                      dir="ltr"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-sans pointer-events-none">
                      دقيقة
                    </span>
                  </div>

                  <button
                    id="btn-save-sync-interval"
                    type="submit"
                    disabled={isSavingSyncSettings}
                    className="px-6 py-3 bg-[#7F00FF] hover:bg-[#6e00de] text-white rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    {isSavingSyncSettings ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جارٍ الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>حفظ زمن المزامنة</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  * مثال: عند ضبط القيمة على <strong className="text-slate-800 dark:text-slate-200">60</strong>، يقوم المتجر كل ساعة بتحديث أسعار جميع الألعاب وباقات الشحن من المورد مباشرة.
                </p>
              </div>

              {/* Quick Preset Chips */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  خيارات أوقات سريعة:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'كل 15 دقيقة', value: 15 },
                    { label: 'كل 30 دقيقة', value: 30 },
                    { label: 'كل 60 دقيقة (موصى به)', value: 60 },
                    { label: 'كل 120 دقيقة (ساعتان)', value: 120 },
                    { label: 'كل 360 دقيقة (6 ساعات)', value: 360 },
                    { label: 'كل 1440 دقيقة (24 ساعة)', value: 1440 },
                  ].map((preset) => {
                    const isSelected = syncIntervalInput === String(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setSyncIntervalInput(String(preset.value))}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#7F00FF] text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200/60 dark:border-white/5'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>

          {/* Sync Now Detailed Box */}
          <div className="bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent border border-purple-200/60 dark:border-purple-900/30 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-[#7F00FF] dark:text-purple-400" />
                  <span>المزامنة الفورية اليدوية (Sync Now)</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                  تريد تحديث الأسعار والمخزون دون انتظار الدورة المجدولة القادمة؟ اضغط على زر "مزامنة الآن" وسيتم جلب وتخزين أحدث قائمة أسعار فوراً لجميع الزوار.
                </p>
              </div>

              <button
                id="btn-sync-now-card"
                type="button"
                onClick={handleTriggerSyncNow}
                disabled={isTriggeringSyncNow}
                className="px-6 py-3.5 rounded-2xl bg-[#7F00FF] hover:bg-[#6e00de] text-white font-bold text-xs sm:text-sm transition-all duration-200 shadow-md shadow-[#7F00FF]/25 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isTriggeringSyncNow ? 'animate-spin' : ''}`} />
                <span>{isTriggeringSyncNow ? 'جارٍ فحص المورد والمزامنة...' : 'مزامنة الآن'}</span>
              </button>
            </div>
          </div>

          {/* Educational Notes & Architecture Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-[#7F00FF] dark:text-purple-400">
                <Percent className="w-4 h-4" />
                <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">حساب هامش الربح</h5>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                يتم تطبيق نسبة الربح الشاملة المحددة في لوحة التحكم (+{profitConfig.percentage}%) فوراً وتلقائياً على كل باقة بعد مزامنة سعر تكلفتها من المورد.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">توفر المخزون الحي</h5>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                تمنع المزامنة الدورية ظهور الباقات المتوقفة أو غير المتوفرة لدى المورد لتفادي أي أخطاء أثناء تنفيذ طلبات شحن العملاء.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#151221] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
                <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">ذاكرة كاش سريعة</h5>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                يتم حفظ بيانات المزامنة في ذاكرة المتجر المؤقتة وقاعدة البيانات لتوفير تصفح فائق السرعة للزبائن دون استهلاك مكثف لحدود API المورد.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7.5. TAB: DEPOSITS & METHODS MANAGEMENT */}
      {activeAdminTab === 'deposits' && (
        <AdminDepositsTab
          adminEmail={currentUser?.email || ADMIN_AUTHORIZED_EMAIL}
          onBalanceUpdated={loadUsers}
        />
      )}

      {/* 7.6. TAB: MAINTENANCE MODE MANAGEMENT */}
      {activeAdminTab === 'maintenance' && (
        <AdminMaintenanceTab
          onSettingsUpdated={(newSettings) => {
            onMaintenanceChange?.(newSettings);
          }}
        />
      )}

      {/* 8. MODAL: EDIT USER DETAILS */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151221] border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    تعديل تفاصيل المستخدم
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">ID: {selectedUserForEdit.id}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditUser} className="space-y-4 text-xs sm:text-sm">
              {/* Name */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#7F00FF]"
                  placeholder="مثال: +9639xxxxxxxx"
                />
              </div>

              {/* Wallet Balance with quick adjustment */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  رصيد المحفظة (الرصيد الأساسي)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={editFormData.balance}
                    onChange={(e) => setEditFormData({ ...editFormData, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-[#7F00FF]"
                  />
                  {/* Quick buttons */}
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, balance: editFormData.balance + 10 })}
                    className="px-2.5 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-100 cursor-pointer"
                  >
                    +150 ألف
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, balance: editFormData.balance + 50 })}
                    className="px-2.5 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-100 cursor-pointer"
                  >
                    +750 ألف
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                  القيمة الإجمالية: {formatSypNumber(convertToSyp(editFormData.balance, 'USD', exchangeRate, false))} ل.س
                </span>
              </div>

              {/* Role */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">نوع الرتبة / الصلاحية</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                >
                  <option value="customer">عميل عادي (Customer)</option>
                  <option value="admin">مدير متجر (Admin)</option>
                </select>
              </div>

              {/* Reset Password */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  تعيين كلمة مرور جديدة (اختياري)
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="اتركه فارغاً للحفاظ على كلمة المرور الحالية"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white font-bold rounded-xl transition-all shadow-md shadow-[#7F00FF]/25 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: CREATE USER MANUALLY */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151221] border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    إضافة مستخدم جديد
                  </h3>
                  <span className="text-xs text-slate-400">إنشاء حساب يدوي في قاعدة بيانات Neon</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreateUser} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  placeholder="+9639xxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">الرصيد الافتتاحي للحساب</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={createFormData.balance}
                  onChange={(e) => setCreateFormData({ ...createFormData, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">كلمة المرور (اختياري)</label>
                <input
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  placeholder="كلمة مرور الحساب"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#7F00FF] hover:bg-[#6b00d6] active:scale-98 text-white font-bold rounded-xl transition-all shadow-md shadow-[#7F00FF]/25 cursor-pointer"
                >
                  إنشاء الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

