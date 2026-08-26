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
} from 'lucide-react';
import { CustomerUser, MerchantInfo, OrderItem } from '../types';
import {
  fetchAdminStats,
  fetchAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  createAdminUser,
  checkAdminOrderDetails,
  saveStoreSetting,
  AdminStatsData,
  AdminUserData,
  AdminOrderCheckResult,
} from '../services/dbApi';
import {
  getProfitMarginConfig,
  setProfitMarginConfig,
  ProfitMarginConfig,
  calculateRetailPrice,
} from '../utils/profitUtils';
import { formatPriceSyp, getExchangeRate, convertToSyp, formatSypNumber } from '../utils/currencyUtils';

interface AdminDashboardProps {
  currentUser: CustomerUser | null;
  merchantInfo: MerchantInfo | null;
  onRefreshMerchant: () => void;
  isLoadingMerchant: boolean;
  onNavigateHome: () => void;
  onNavigateSettings: () => void;
}

export const ADMIN_AUTHORIZED_EMAIL = 'm74321176@gmail.com';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  merchantInfo,
  onRefreshMerchant,
  isLoadingMerchant,
  onNavigateHome,
  onNavigateSettings,
}) => {
  // Active Tab inside Admin Panel
  const [activeAdminTab, setActiveAdminTab] = useState<'stats' | 'users' | 'merchant' | 'profit' | 'order_check'>('stats');

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

  // UI state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
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
      console.error('Failed to load stats:', err);
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
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Initial loading
  useEffect(() => {
    loadStats();
    loadUsers();
  }, [loadStats, loadUsers]);

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

  // Save Profit Margin Settings
  const handleSaveProfitMargin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const percent = Math.max(0, parseFloat(profitPercentageInput) || 0);
    const fixed = Math.max(0, parseFloat(profitFixedInput) || 0);

    const newConfig: ProfitMarginConfig = {
      percentage: percent,
      fixedMarginUsd: fixed,
      enabled: profitConfig.enabled,
    };

    setProfitConfig(newConfig);
    setProfitMarginConfig(newConfig);

    // Save to Neon DB
    await saveStoreSetting('profit_margin', newConfig).catch(() => {});

    setIsProfitSaved(true);
    setTimeout(() => setIsProfitSaved(false), 3000);
  };

  // Toggle profit margin enabled
  const handleToggleProfitEnabled = () => {
    const newConfig: ProfitMarginConfig = {
      ...profitConfig,
      enabled: !profitConfig.enabled,
    };
    setProfitConfig(newConfig);
    setProfitMarginConfig(newConfig);
    saveStoreSetting('profit_margin', newConfig).catch(() => {});
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  أحدث الطلبات المنفذة في المتجر
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  سجل فوري لجميع عمليات الشراء المنفذة بواسطة العملاء
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveAdminTab('order_check')}
                className="text-xs font-bold text-[#7F00FF] dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>فحص طلب محدد</span>
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-[#7F00FF] dark:text-purple-300 flex items-center justify-center">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    بيانات حساب التاجر (SC Store API)
                  </h3>
                  <p className="text-xs text-slate-400">
                    الحساب المتصل بالخادم المزود لتنفيذ الطلبات والشحن التلقائي
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
                <span>تحديث الرصيد الآن</span>
              </button>
            </div>

            {/* Merchant Details Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {/* Account Balance */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/60 dark:from-purple-950/40 dark:to-purple-900/20 border border-purple-200/80 dark:border-purple-800/50">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block mb-1">
                  رصيد الحساب التجاري المتاح
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#7F00FF] dark:text-purple-200 font-mono block">
                  {formatSypNumber(convertToSyp(merchantInfo?.balance ?? 0, 'USD', exchangeRate, false))} ل.س
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                  رصيد الشحن الآلي المباشر
                </span>
              </div>

              {/* Account Username / Name */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">اسم الحساب / التاجر</span>
                <span className="text-lg font-black text-slate-900 dark:text-white block truncate">
                  {merchantInfo?.name || merchantInfo?.username || 'SC Store Merchant'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                  المعرف: #{merchantInfo?.id || '2456'}
                </span>
              </div>

              {/* Status & Gateway */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">حالة الاتصال بالـ API</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    متصل ونشط (SC Store v1)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  آخر فحص: {merchantInfo?.lastUpdated || 'الآن'}
                </span>
              </div>
            </div>

            {/* API Key Security Note */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-900/60 text-purple-300 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">مفتاح API الخاص بالمتجر (SC_STORE_API_KEY)</h4>
                  <p className="text-[11px] text-slate-400">
                    يتم الحفاظ على المفتاح بأمان تام على الخادم الخلفي (Server-Side) لحماية الرصيد
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-mono text-purple-300 border border-slate-700">
                sc_xIfr••••••••••••••••••••••••Kag2
              </span>
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
                  إضافة وضبط نسبة الربح الشاملة
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                  تتيح لك هذه الميزة وضع نسبة مئوية (هامش ربح) على أسعار الجملة القادمة من SC Store، ليتم تطبيقها وحسابها تلقائياً على كافة المنتجات وبطاقات الشحن لزبائن المتجر.
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
              <span>{profitConfig.enabled ? 'نسبة الربح: مفعلة' : 'نسبة الربح: معطلة'}</span>
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
                    onChange={(e) => setProfitPercentageInput(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                    placeholder="مثال: 10"
                  />
                  <span className="absolute left-3.5 top-3 text-xs text-slate-400 font-bold">%</span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-medium ml-1">خيارات سريعة:</span>
                  {[5, 10, 15, 20, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setProfitPercentageInput(String(pct));
                      }}
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
                    onChange={(e) => setProfitFixedInput(e.target.value)}
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
                    سعر البيع النهائي في المتجر (+{profitPercentageInput || 0}%)
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatPriceSyp(10, 'USD', {
                      customRate: exchangeRate,
                      applyMargin: profitConfig.enabled,
                    })}
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
                <span>حفظ وتطبيق نسبة الربح على المتجر فوراً</span>
              </button>

              {isProfitSaved && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ وتحديث نسبة الربح بنجاح ومزامنتها في قاعدة البيانات!</span>
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
};
