import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { MerchantInfo, Product, CustomerUser, OrderItem, OrderOptions, StoreBanner } from './types';
import { fetchMerchantInfo, fetchProducts } from './services/scStoreApi';
import { fetchUserOrdersFromDb, fetchStoreSetting, saveStoreSetting, fetchUserProfile, clearUserOrdersInDb } from './services/dbApi';
import { setExchangeRate } from './utils/currencyUtils';
import { setProfitMarginConfig, ProfitMarginConfig } from './utils/profitUtils';
import { getSavedBanners, saveBannersLocally } from './data/defaultBanners';
import { getInitialTheme, applyTheme, ThemeMode } from './utils/themeUtils';
import { Navbar } from './components/Navbar';
import { ProductGrid } from './components/ProductGrid';
import { OrdersHistoryPage } from './components/OrdersHistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthPage } from './components/AuthPage';
import { CheckoutPage } from './components/CheckoutPage';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';
import { SidebarDrawer } from './components/SidebarDrawer';
import { AboutPage } from './components/AboutPage';
import { BannerManagementModal } from './components/BannerManagementModal';
import { FloatingSupportWidget } from './components/FloatingSupportWidget';
import { DepositPage } from './components/DepositPage';
import { PullToRefresh } from './components/PullToRefresh';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { GuestAccessModal } from './components/GuestAccessModal';
import { SupportPage } from './components/SupportPage';
import { MaintenanceSettings } from './types';
import { isUserAdmin, DEFAULT_MAINTENANCE_SETTINGS } from './utils/adminUtils';

export default function App() {
  // Splash Screen initial state
  const [isSplashScreenVisible, setIsSplashScreenVisible] = useState<boolean>(true);

  // Sidebar Drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Banner Slider State & Management
  const [banners, setBanners] = useState<StoreBanner[]>(() => getSavedBanners());
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);

  // Maintenance Mode state
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>(DEFAULT_MAINTENANCE_SETTINGS);
  const [adminInitialTab, setAdminInitialTab] = useState<'stats' | 'users' | 'merchant' | 'profit' | 'order_check' | 'sync_settings' | 'deposits' | 'maintenance' | 'tickets'>('stats');

  // Navigation & View state: 'products' | 'orders' | 'settings' | 'auth' | 'admin' | 'track' | 'about' | 'checkout' | 'deposit' | 'support'
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings' | 'history' | 'auth' | 'admin' | 'track' | 'about' | 'checkout' | 'deposit' | 'support'>('products');
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');

  // Theme state (Dark / Light Mode) initialized from storage or system preference
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  // Instant Theme Toggle with zero-lag transition suppression
  const handleToggleTheme = useCallback((newTheme: ThemeMode) => {
    // 1. Immediately apply class to <html> and save to localStorage (0ms blocking)
    applyTheme(newTheme, true);
    // 2. Schedule React state update to avoid interrupting frame rate
    startTransition(() => {
      setTheme(newTheme);
    });
  }, []);

  // Ensure theme is applied on initial mount
  useEffect(() => {
    applyTheme(theme, false);
  }, []);

  // Merchant & API state
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [isLoadingMerchant, setIsLoadingMerchant] = useState<boolean>(true);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Customer Auth state (persisted locally + in Neon DB)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(() => {
    try {
      const saved = localStorage.getItem('nexen_user_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // If a non-admin session had the legacy 150,000 SYP demo balance, reset it to 0
      if (parsed && parsed.role !== 'admin' && parsed.balance === 150000) {
        parsed.balance = 0;
        localStorage.setItem('nexen_user_session', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const currentUserRef = useRef<CustomerUser | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Track single sync on entry
  const hasSyncedUserOnEntryRef = useRef(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Orders list (persisted locally + in Neon DB)
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('nexen_orders_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected product & modals
  const [pendingProductForAuth, setPendingProductForAuth] = useState<Product | null>(null);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [selectedOrderOptions, setSelectedOrderOptions] = useState<OrderOptions | null>(null);
  const [guestAccessProduct, setGuestAccessProduct] = useState<Product | null>(null);

  // Profit Margin Version for immediate storefront price reactivity
  const [profitMarginVersion, setProfitMarginVersion] = useState(0);

  // Virtual keyboard awareness for mobile devices
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        if (window.innerWidth <= 768) {
          setIsKeyboardOpen(true);
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA' && activeEl.tagName !== 'SELECT')) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const heightRatio = window.visualViewport.height / window.innerHeight;
        if (heightRatio < 0.78 && window.innerWidth <= 768) {
          setIsKeyboardOpen(true);
        } else if (heightRatio >= 0.88) {
          const activeEl = document.activeElement;
          if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
            setIsKeyboardOpen(false);
          }
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('keyboard-open', isKeyboardOpen);
  }, [isKeyboardOpen]);

  useEffect(() => {
    const onProfitChanged = () => {
      setProfitMarginVersion((v) => v + 1);
    };
    window.addEventListener('nexen-profit-margin-changed', onProfitChanged);
    window.addEventListener('storage', onProfitChanged);
    return () => {
      window.removeEventListener('nexen-profit-margin-changed', onProfitChanged);
      window.removeEventListener('storage', onProfitChanged);
    };
  }, []);

  // Save auth state to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('nexen_user_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('nexen_user_session');
    }
  }, [currentUser]);

  // Save orders history to localStorage
  useEffect(() => {
    localStorage.setItem('nexen_orders_history', JSON.stringify(orders));
  }, [orders]);

  // Function to refresh orders from Neon DB without infinite loops
  const refreshUserOrders = useCallback(async (targetUserId?: string) => {
    const uid = targetUserId || currentUserRef.current?.id;
    if (!uid) return;
    try {
      const dbOrders = await fetchUserOrdersFromDb(uid);
      if (dbOrders && dbOrders.length > 0) {
        setOrders((prev) => {
          const map = new Map<string, OrderItem>();
          dbOrders.forEach((o) => map.set(o.orderId, o));
          prev.forEach((o) => {
            if (!map.has(o.orderId)) map.set(o.orderId, o);
          });
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        });
      }
    } catch (e) {
      console.warn('Error refreshing user orders from DB:', e);
    }
  }, []);

  // Function to clear user orders history
  const handleClearOrders = useCallback(async () => {
    setOrders([]);
    try {
      localStorage.removeItem('nexen_orders_history');
    } catch (e) {
      console.warn('Error removing local orders history:', e);
    }
    const uid = currentUserRef.current?.id;
    const email = currentUserRef.current?.email;
    try {
      await clearUserOrdersInDb(uid, email);
    } catch (e) {
      console.warn('Error clearing orders from DB:', e);
    }
  }, []);

  // Handle saving and persisting store banners
  const handleSaveBanners = useCallback((updatedBanners: StoreBanner[]) => {
    setBanners(updatedBanners);
    saveBannersLocally(updatedBanners);
    saveStoreSetting('store_banners', updatedBanners);
  }, []);

  // Load Merchant info (does not mutate currentUser)
  const loadMerchantData = useCallback(async () => {
    setIsLoadingMerchant(true);
    try {
      const res = await fetchMerchantInfo();
      if (res.data) {
        setMerchantInfo(res.data);
      }
    } catch (e) {
      console.error('Error loading merchant:', e);
    } finally {
      setIsLoadingMerchant(false);
    }
  }, []);

  // Load Products list
  const loadProductsData = useCallback(async () => {
    setIsLoadingProducts(true);
    setProductsError(null);
    try {
      const res = await fetchProducts();
      setProducts(res.products);
      if (res.error && (!res.products || res.products.length === 0)) {
        setProductsError(res.error);
      }
    } catch (e: any) {
      console.error('Error loading products:', e);
      setProductsError(e.message || 'فشل الاتصال بالـ API');
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // 1. Initial load on entry to website (Runs strictly ONCE upon entering)
  useEffect(() => {
    // Sync store settings
    fetchStoreSetting<{ usd_to_syp?: number }>('exchange_rate').then((setting) => {
      if (setting && setting.usd_to_syp && typeof setting.usd_to_syp === 'number') {
        setExchangeRate(setting.usd_to_syp);
      }
    }).catch(() => {});

    fetchStoreSetting<ProfitMarginConfig>('profit_margin').then((profitSetting) => {
      if (profitSetting && typeof profitSetting.percentage === 'number') {
        setProfitMarginConfig(profitSetting);
      }
    }).catch(() => {});

    fetchStoreSetting<StoreBanner[]>('store_banners').then((savedBanners) => {
      if (savedBanners && Array.isArray(savedBanners) && savedBanners.length > 0) {
        const normalized = savedBanners.map((b) => {
          const isTg =
            b.id === 'banner-telegram' ||
            b.title?.includes('تيليجرام') ||
            b.title?.includes('تليجرام') ||
            b.title?.toLowerCase().includes('telegram') ||
            b.subtitle?.includes('قناتنا') ||
            b.badgeText?.includes('تيليجرام') ||
            b.badgeText?.includes('تليجرام') ||
            b.badgeText?.toLowerCase().includes('telegram') ||
            (b.linkUrl && b.linkUrl.toLowerCase().includes('t.me')) ||
            (b.linkUrl && b.linkUrl.toLowerCase().includes('telegram'));

          if (isTg) {
            return {
              ...b,
              linkUrl: 'https://t.me/Nexin_Store',
              actionType: 'url' as const,
              badgeText: b.badgeText || 'انضم لقناة التيليجرام ✈️',
            };
          }
          return b;
        });
        setBanners(normalized);
        saveBannersLocally(normalized);
      }
    }).catch(() => {});

    // Sync site maintenance settings
    fetchStoreSetting<MaintenanceSettings>('site_maintenance', DEFAULT_MAINTENANCE_SETTINGS).then((savedMaintenance) => {
      if (savedMaintenance) {
        setMaintenanceSettings(savedMaintenance);
      }
    }).catch(() => {});

    // Initial load of merchant and products
    loadMerchantData();
    loadProductsData();

    // User data update: strictly ONCE upon entering the website
    if (!hasSyncedUserOnEntryRef.current) {
      hasSyncedUserOnEntryRef.current = true;
      const initialUser = currentUserRef.current;
      if (initialUser && (initialUser.id || initialUser.email)) {
        refreshUserOrders(initialUser.id);
        fetchUserProfile(initialUser.id || initialUser.email)
          .then((freshUser) => {
            if (freshUser) {
              setCurrentUser(freshUser);
            }
          })
          .catch((e) => console.warn('Could not sync user profile from DB on entry:', e));
      }
    }

    const handleProductsSynced = () => {
      loadProductsData();
      setProfitMarginVersion((v) => v + 1);
    };

    const handleMaintenanceSynced = (e: any) => {
      if (e?.detail) {
        setMaintenanceSettings(e.detail);
      } else {
        fetchStoreSetting<MaintenanceSettings>('site_maintenance', DEFAULT_MAINTENANCE_SETTINGS).then((data) => {
          if (data) setMaintenanceSettings(data);
        });
      }
    };

    const handleBalanceUpdated = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setCurrentUser((prev) => (prev ? { ...prev, balance: e.detail.balance } : null));
      } else if (currentUserRef.current?.id) {
        fetchUserProfile(currentUserRef.current.id).then((fresh) => {
          if (fresh) setCurrentUser(fresh);
        });
      }
      if (currentUserRef.current?.id) {
        refreshUserOrders(currentUserRef.current.id);
      }
    };

    window.addEventListener('nexen-products-synced', handleProductsSynced);
    window.addEventListener('nexen-maintenance-changed', handleMaintenanceSynced);
    window.addEventListener('nexen-balance-updated', handleBalanceUpdated);
    return () => {
      window.removeEventListener('nexen-products-synced', handleProductsSynced);
      window.removeEventListener('nexen-maintenance-changed', handleMaintenanceSynced);
      window.removeEventListener('nexen-balance-updated', handleBalanceUpdated);
    };
  }, [loadMerchantData, loadProductsData, refreshUserOrders]);

  // Unified Pull to Refresh handler (السحب للتحديث أو النقر للتحديث)
  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      const user = currentUserRef.current;
      if (user && (user.id || user.email)) {
        try {
          const freshUser = await fetchUserProfile(user.id || user.email);
          if (freshUser) {
            setCurrentUser(freshUser);
          }
          if (user.id) {
            await refreshUserOrders(user.id);
          }
        } catch (e) {
          console.warn('Pull-to-refresh user sync error:', e);
        }
      }

      await Promise.allSettled([
        loadMerchantData(),
        loadProductsData(),
        fetchStoreSetting<{ usd_to_syp?: number }>('exchange_rate').then((setting) => {
          if (setting && setting.usd_to_syp && typeof setting.usd_to_syp === 'number') {
            setExchangeRate(setting.usd_to_syp);
          }
        }),
        fetchStoreSetting<ProfitMarginConfig>('profit_margin').then((profitSetting) => {
          if (profitSetting && typeof profitSetting.percentage === 'number') {
            setProfitMarginConfig(profitSetting);
          }
        }),
      ]);
    } catch (err) {
      console.error('Error during pull-to-refresh:', err);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [loadMerchantData, loadProductsData, refreshUserOrders]);

  // Check admin status and maintenance locking
  const isAdmin = isUserAdmin(currentUser);
  const isMaintenanceActive = !!maintenanceSettings?.isEnabled;
  const isLockedForCurrentUser = isMaintenanceActive && !isAdmin;

  // Handle Splash Screen completion
  const handleSplashComplete = useCallback(() => {
    setIsSplashScreenVisible(false);
  }, []);

  // Open full-page auth
  const handleOpenAuth = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setActiveTab('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle product selection (Enforce login before checkout, navigate to dedicated checkout screen)
  const handleSelectProduct = useCallback((product: Product, options?: OrderOptions) => {
    if (isLockedForCurrentUser) {
      alert('الموقع في وضع الصيانة حالياً - تم إيقاف الطلبات مؤقتاً.');
      return;
    }
    setSelectedOrderOptions(options || null);
    if (!currentUser) {
      setGuestAccessProduct(product);
      setPendingProductForAuth(product);
    } else {
      setSelectedProductForOrder(product);
      setActiveTab('checkout');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentUser, isLockedForCurrentUser]);

  // Handle successful login from full-page view
  const handleLoginSuccess = useCallback((user: CustomerUser, userOrders?: OrderItem[]) => {
    setCurrentUser(user);
    if (userOrders && userOrders.length > 0) {
      setOrders((prev) => {
        const map = new Map<string, OrderItem>();
        userOrders.forEach((o) => map.set(o.orderId, o));
        prev.forEach((o) => {
          if (!map.has(o.orderId)) map.set(o.orderId, o);
        });
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      });
    }

    if (pendingProductForAuth) {
      const p = pendingProductForAuth;
      setPendingProductForAuth(null);
      setSelectedProductForOrder(p);
      setActiveTab('checkout');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab('products');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pendingProductForAuth]);

  // Handle successful order creation
  const handleOrderSuccess = useCallback((newOrder: OrderItem) => {
    setOrders((prev) => [newOrder, ...prev]);
    // Refresh user profile and balance immediately
    if (currentUserRef.current?.id) {
      fetchUserProfile(currentUserRef.current.id).then((fresh) => {
        if (fresh) setCurrentUser(fresh);
      });
      refreshUserOrders(currentUserRef.current.id);
    }
    // Refresh merchant balance if applicable
    if (merchantInfo && merchantInfo.balance >= newOrder.total) {
      setMerchantInfo((prev) =>
        prev
          ? {
              ...prev,
              balance: Math.max(0, prev.balance - newOrder.total),
              lastUpdated: new Date().toLocaleTimeString('ar-EG'),
            }
          : null
      );
    } else {
      loadMerchantData();
    }
  }, [merchantInfo, loadMerchantData, refreshUserOrders]);

  // Navigation callbacks
  const handleNavigate = useCallback((tab: any) => {
    if (isLockedForCurrentUser && (tab === 'checkout' || tab === 'orders')) {
      alert('الموقع في وضع الصيانة حالياً - تم قفل هذه الصفحة مؤقتاً.');
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isLockedForCurrentUser]);

  const handleNavigateHome = useCallback(() => {
    setSelectedProductForOrder(null);
    setSelectedOrderOptions(null);
    setActiveTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateOrders = useCallback(() => {
    if (isLockedForCurrentUser) {
      alert('الموقع في وضع الصيانة حالياً - قسم الطلبات مقفل مؤقتاً.');
      return;
    }
    setActiveTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isLockedForCurrentUser]);

  const handleNavigateSettings = useCallback(() => {
    setActiveTab('settings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateSupport = useCallback(() => {
    setActiveTab('support');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateAdmin = useCallback((targetTab?: 'stats' | 'users' | 'merchant' | 'profit' | 'order_check' | 'sync_settings' | 'deposits' | 'maintenance' | 'tickets') => {
    const isUserAdmin = currentUser && (currentUser.role === 'admin' || ['m74321176@gmail.com', 'amreke934@gmail.com'].includes(currentUser.email?.toLowerCase() || ''));
    if (!isUserAdmin) {
      alert('غير مصرح لك بالدخول إلى لوحة التحكم.');
      setActiveTab('products');
      return;
    }
    if (targetTab) {
      setAdminInitialTab(targetTab);
    }
    setActiveTab('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentUser]);

  const handleNavigateToTracking = useCallback((orderId: string) => {
    setTrackingOrderId(orderId);
    setActiveTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Open / Close modal helpers
  const handleOpenBannerManager = useCallback(() => setIsBannerModalOpen(true), []);
  const handleCloseBannerManager = useCallback(() => setIsBannerModalOpen(false), []);
  const handleOpenSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);

  // Deposit navigation helpers
  const handleNavigateDeposit = useCallback(() => {
    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    if (isLockedForCurrentUser) {
      alert('الموقع في وضع الصيانة حالياً - عمليات الإيداع متوقفة مؤقتاً.');
      return;
    }
    setActiveTab('deposit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentUser, isLockedForCurrentUser, handleOpenAuth]);

  const handleOpenDeposit = useCallback(() => {
    handleNavigateDeposit();
  }, [handleNavigateDeposit]);

  const handleDepositSuccess = useCallback(async () => {
    if (currentUser) {
      try {
        const updated = await fetchUserProfile(currentUser.email || currentUser.id);
        if (updated) {
          setCurrentUser(updated);
        }
      } catch (err) {
        console.error('Failed to reload profile after deposit:', err);
      }
    }
  }, [currentUser]);

  // Logout handler
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('nexen_user_session');
      localStorage.removeItem('nexen_auth_token');
    } catch {}
  }, []);

  // Delete account handler
  const handleDeleteAccount = useCallback(() => {
    setCurrentUser(null);
    setOrders([]);
    localStorage.removeItem('nexen_user_session');
    localStorage.removeItem('nexen_orders_history');
    setActiveTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-[#7F00FF] selection:text-white">
      {/* 0. Initial Welcome Splash Screen */}
      {isSplashScreenVisible && (
        <SplashScreen
          onComplete={handleSplashComplete}
          isLoggedIn={!!currentUser}
          isLoadingData={isLoadingMerchant || isLoadingProducts}
        />
      )}

      {/* Top Navbar with Real-time Header Wallet Balance Display & Sidebar Trigger */}
      <Navbar
        merchantInfo={merchantInfo}
        isLoadingMerchant={isLoadingMerchant}
        onRefreshMerchant={loadMerchantData}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenUserOrders={handleNavigateOrders}
        onOpenSettings={handleNavigateSettings}
        onOpenSidebar={handleOpenSidebar}
        onOpenDeposit={handleOpenDeposit}
        onPullRefresh={handlePullRefresh}
        isRefreshing={isPullRefreshing}
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        ordersCount={orders.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isMaintenanceActive={isMaintenanceActive}
        isAdmin={isAdmin}
        onNavigateAdminMaintenance={() => handleNavigateAdmin('maintenance')}
      />

      {/* Sidebar / Drawer Navigation Overlay */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        currentUser={currentUser}
        merchantInfo={merchantInfo}
        isLoadingMerchant={isLoadingMerchant}
        onRefreshMerchant={loadMerchantData}
        onOpenDeposit={handleOpenDeposit}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        ordersCount={orders.length}
        isMaintenanceActive={isMaintenanceActive}
      />

      {/* Main Content: Full Screen for Support Page, otherwise Pull To Refresh */}
      {activeTab === 'support' ? (
        <main className="w-full flex-1 h-[calc(100dvh-56px)] sm:h-[calc(100dvh-64px)] overflow-hidden flex flex-col p-0 m-0">
          <SupportPage
            currentUser={currentUser}
            onBack={handleNavigateSettings}
          />
        </main>
      ) : (
        <PullToRefresh onRefresh={handlePullRefresh} disabled={activeTab === 'auth'}>
          {/* Main Content Area */}
          <main className={`flex-1 max-w-7xl w-full mx-auto ${
            activeTab === 'auth'
              ? `px-2 sm:px-6 py-1 sm:py-6 ${isKeyboardOpen ? 'pb-80' : 'pb-20 sm:pb-28'} flex flex-col items-center justify-start min-h-[calc(100dvh-80px)]`
              : 'px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 pb-28 sm:pb-32 min-h-[calc(100dvh-130px)]'
          }`}>
            {activeTab === 'products' ? (
              isLockedForCurrentUser ? (
                <MaintenanceScreen
                  settings={maintenanceSettings}
                  currentUser={currentUser}
                />
              ) : (
                <ProductGrid
                  key={`products-grid-${profitMarginVersion}`}
                  products={products}
                  isLoading={isLoadingProducts}
                  error={productsError}
                  onRefresh={loadProductsData}
                  onSelectProduct={handleSelectProduct}
                  banners={banners}
                  onOpenBannerManager={handleOpenBannerManager}
                  currentUser={currentUser}
                  onOpenAuth={handleOpenAuth}
                />
              )
            ) : activeTab === 'orders' || activeTab === 'track' ? (
              isLockedForCurrentUser ? (
                <MaintenanceScreen
                  settings={maintenanceSettings}
                  currentUser={currentUser}
                />
              ) : (
                <OrdersHistoryPage
                  currentUser={currentUser}
                  orders={orders}
                  onRefreshOrders={refreshUserOrders}
                  onClearOrders={handleClearOrders}
                  onNavigateHome={handleNavigateHome}
                  onOpenAuth={handleOpenAuth}
                  initialQuery={trackingOrderId}
                />
              )
            ) : activeTab === 'about' ? (
              <AboutPage
                onNavigateHome={handleNavigateHome}
              />
            ) : activeTab === 'settings' ? (
              <SettingsPage
                currentUser={currentUser}
                merchantInfo={merchantInfo}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                onOpenAuth={handleOpenAuth}
                onLogout={handleLogout}
                onDeleteAccount={handleDeleteAccount}
                onNavigateHome={handleNavigateHome}
                onNavigateOrders={handleNavigateOrders}
                onRefreshMerchant={loadMerchantData}
                isLoadingMerchant={isLoadingMerchant}
                onOpenAdmin={handleNavigateAdmin}
                onOpenSupport={handleNavigateSupport}
              />
            ) : activeTab === 'admin' ? (
              <AdminDashboard
                currentUser={currentUser}
                merchantInfo={merchantInfo}
                onRefreshMerchant={loadMerchantData}
                isLoadingMerchant={isLoadingMerchant}
                onOpenBannerManager={handleOpenBannerManager}
                onRefreshProducts={loadProductsData}
                onNavigateHome={handleNavigateHome}
                onNavigateSettings={handleNavigateSettings}
                initialTab={adminInitialTab}
                onMaintenanceChange={(updated) => setMaintenanceSettings(updated)}
              />
            ) : activeTab === 'auth' ? (
              <AuthPage
                onLoginSuccess={handleLoginSuccess}
                onBackToStore={handleNavigateHome}
                pendingProduct={pendingProductForAuth}
                initialMode={authMode}
                theme={theme}
              />
            ) : activeTab === 'deposit' ? (
              isLockedForCurrentUser ? (
                <MaintenanceScreen
                  settings={maintenanceSettings}
                  currentUser={currentUser}
                />
              ) : (
                <DepositPage
                  currentUser={currentUser}
                  onNavigateHome={handleNavigateHome}
                  onOpenAuth={handleOpenAuth}
                  onDepositSuccess={handleDepositSuccess}
                  onRefreshUser={() => {
                    if (currentUser?.email || currentUser?.id) {
                      fetchUserProfile(currentUser.email || currentUser.id).then((updated) => {
                        if (updated) setCurrentUser(updated);
                      });
                    }
                  }}
                />
              )
            ) : activeTab === 'checkout' && selectedProductForOrder && !isLockedForCurrentUser ? (
              <CheckoutPage
                product={selectedProductForOrder}
                currentUser={currentUser}
                orderOptions={selectedOrderOptions}
                onBack={handleNavigateHome}
                onOrderSuccess={handleOrderSuccess}
                onNavigateToTracking={handleNavigateToTracking}
                onNavigateHome={handleNavigateHome}
                onNavigateAdmin={(tab) => handleNavigateAdmin(tab as any)}
                onNavigateDeposit={handleNavigateDeposit}
                onOpenAuth={handleOpenAuth}
              />
            ) : isLockedForCurrentUser ? (
              <MaintenanceScreen
                settings={maintenanceSettings}
                currentUser={currentUser}
              />
            ) : null}
          </main>
        </PullToRefresh>
      )}

      {/* Bottom Floating Navigation Bar (4-item layout: Home, Orders, Deposit, Account) */}
      {activeTab !== 'support' && (
        <BottomNav
          activeTab={activeTab}
          authMode={authMode}
          onNavigateHome={handleNavigateHome}
          onNavigateOrders={handleNavigateOrders}
          onNavigateDeposit={handleNavigateDeposit}
          onNavigateLogin={() => handleOpenAuth('login')}
          onNavigateRegister={() => handleOpenAuth('register')}
          onNavigateTrack={handleNavigateOrders}
          onOpenSettings={handleNavigateSettings}
          ordersCount={orders.length}
          isLoggedIn={!!currentUser}
          isMaintenanceLocked={isLockedForCurrentUser}
          isKeyboardOpen={isKeyboardOpen}
        />
      )}

      {/* Banner Upload & Management Modal */}
      <BannerManagementModal
        isOpen={isBannerModalOpen}
        onClose={handleCloseBannerManager}
        banners={banners}
        onSaveBanners={handleSaveBanners}
      />

      {/* Guest Access Prompt Modal */}
      <GuestAccessModal
        isOpen={!!guestAccessProduct}
        onClose={() => setGuestAccessProduct(null)}
        onLogin={() => {
          setGuestAccessProduct(null);
          handleOpenAuth('login');
        }}
        onRegister={() => {
          setGuestAccessProduct(null);
          handleOpenAuth('register');
        }}
        targetProductName={guestAccessProduct?.name}
        targetProductImage={guestAccessProduct?.image}
      />

      {/* Floating 3-Dots Support & Social Media Action Widget */}
      {!isSplashScreenVisible && activeTab !== 'auth' && !isKeyboardOpen && (
        <FloatingSupportWidget isKeyboardOpen={isKeyboardOpen} />
      )}
    </div>
  );
}

