import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { MerchantInfo, Product, CustomerUser, OrderItem, OrderOptions, StoreBanner } from './types';
import { fetchMerchantInfo, fetchProducts } from './services/scStoreApi';
import { fetchUserOrdersFromDb, fetchStoreSetting, saveStoreSetting, fetchUserProfile } from './services/dbApi';
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
import { DepositModal } from './components/DepositModal';
import { PullToRefresh } from './components/PullToRefresh';
import { MaintenanceScreen } from './components/MaintenanceScreen';
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

  // User Deposit Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);

  // Maintenance Mode state
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>(DEFAULT_MAINTENANCE_SETTINGS);
  const [adminInitialTab, setAdminInitialTab] = useState<'stats' | 'users' | 'merchant' | 'profit' | 'order_check' | 'sync_settings' | 'deposits' | 'maintenance'>('stats');

  // Navigation & View state: 'products' | 'orders' | 'settings' | 'auth' | 'admin' | 'track' | 'about' | 'checkout'
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings' | 'history' | 'auth' | 'admin' | 'track' | 'about' | 'checkout'>('products');
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
      return saved ? JSON.parse(saved) : null;
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

  // Profit Margin Version for immediate storefront price reactivity
  const [profitMarginVersion, setProfitMarginVersion] = useState(0);

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
        setBanners(savedBanners);
        saveBannersLocally(savedBanners);
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
      setPendingProductForAuth(product);
      setActiveTab('auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
  }, [merchantInfo, loadMerchantData]);

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

  const handleNavigateAdmin = useCallback((targetTab?: 'stats' | 'users' | 'merchant' | 'profit' | 'order_check' | 'sync_settings' | 'deposits' | 'maintenance') => {
    if (targetTab) {
      setAdminInitialTab(targetTab);
    }
    setActiveTab('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

  // Deposit modal helpers
  const handleOpenDeposit = useCallback(() => {
    if (isLockedForCurrentUser) {
      alert('الموقع في وضع الصيانة حالياً - عمليات الإيداع متوقفة مؤقتاً.');
      return;
    }
    setIsDepositModalOpen(true);
  }, [isLockedForCurrentUser]);

  const handleCloseDeposit = useCallback(() => setIsDepositModalOpen(false), []);
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

      {/* Pull To Refresh Wrapped Main Content */}
      <PullToRefresh onRefresh={handlePullRefresh}>
        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 sm:pb-32 min-h-[calc(100vh-140px)]">
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
            />
          ) : isLockedForCurrentUser ? (
            <MaintenanceScreen
              settings={maintenanceSettings}
              currentUser={currentUser}
            />
          ) : null}
        </main>
      </PullToRefresh>

      {/* Bottom Floating Navigation Bar (Clean 3-item layout: Home, Orders, Account) */}
      <BottomNav
        activeTab={activeTab}
        authMode={authMode}
        onNavigateHome={handleNavigateHome}
        onNavigateOrders={handleNavigateOrders}
        onNavigateLogin={() => handleOpenAuth('login')}
        onNavigateRegister={() => handleOpenAuth('register')}
        onNavigateTrack={handleNavigateOrders}
        onOpenSettings={handleNavigateSettings}
        ordersCount={orders.length}
        isLoggedIn={!!currentUser}
        isMaintenanceLocked={isLockedForCurrentUser}
      />

      {/* Banner Upload & Management Modal */}
      <BannerManagementModal
        isOpen={isBannerModalOpen}
        onClose={handleCloseBannerManager}
        banners={banners}
        onSaveBanners={handleSaveBanners}
      />

      {/* User Deposit Modal */}
      {currentUser && (
        <DepositModal
          isOpen={isDepositModalOpen}
          onClose={handleCloseDeposit}
          currentUser={currentUser}
          onSuccess={handleDepositSuccess}
        />
      )}

      {/* Floating 3-Dots Support & Social Media Action Widget */}
      {!isSplashScreenVisible && <FloatingSupportWidget />}
    </div>
  );
}

