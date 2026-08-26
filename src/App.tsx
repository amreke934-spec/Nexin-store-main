import React, { useState, useEffect, useCallback } from 'react';
import { MerchantInfo, Product, CustomerUser, OrderItem, OrderOptions, StoreBanner } from './types';
import { fetchMerchantInfo, fetchProducts } from './services/scStoreApi';
import { fetchUserOrdersFromDb, fetchStoreSetting, saveStoreSetting } from './services/dbApi';
import { setExchangeRate } from './utils/currencyUtils';
import { setProfitMarginConfig, ProfitMarginConfig } from './utils/profitUtils';
import { getSavedBanners, saveBannersLocally } from './data/defaultBanners';
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
import { SupportPage } from './components/SupportPage';
import { AboutPage } from './components/AboutPage';
import { BannerManagementModal } from './components/BannerManagementModal';

export default function App() {
  // Splash Screen initial state
  const [isSplashScreenVisible, setIsSplashScreenVisible] = useState<boolean>(true);

  // Sidebar Drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Banner Slider State & Management
  const [banners, setBanners] = useState<StoreBanner[]>(() => getSavedBanners());
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);

  // Navigation & View state: 'products' | 'orders' | 'settings' | 'auth' | 'admin' | 'track' | 'support' | 'about' | 'checkout'
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings' | 'history' | 'auth' | 'admin' | 'track' | 'support' | 'about' | 'checkout'>('products');
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');

  // Theme state (Dark / Light Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('nexen_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Apply theme class to <html> / root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('nexen_theme', theme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  }, [theme]);

  const handleToggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

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

  // Function to refresh orders from Neon DB
  const refreshUserOrders = useCallback(async () => {
    if (!currentUser || !currentUser.id) return;
    try {
      const dbOrders = await fetchUserOrdersFromDb(currentUser.id);
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
  }, [currentUser]);

  // Sync saved exchange rate and user orders from Neon DB on mount / user change
  useEffect(() => {
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

    // Sync Store Banners from Neon DB / API
    fetchStoreSetting<StoreBanner[]>('store_banners').then((savedBanners) => {
      if (savedBanners && Array.isArray(savedBanners) && savedBanners.length > 0) {
        setBanners(savedBanners);
        saveBannersLocally(savedBanners);
      }
    }).catch(() => {});

    if (currentUser && currentUser.id) {
      refreshUserOrders();
    }
  }, [currentUser?.id, refreshUserOrders]);

  // Handle saving and persisting store banners
  const handleSaveBanners = (updatedBanners: StoreBanner[]) => {
    setBanners(updatedBanners);
    saveBannersLocally(updatedBanners);
    saveStoreSetting('store_banners', updatedBanners);
  };

  // Load Merchant info
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
      if (res.error) {
        setProductsError(res.error);
      }
    } catch (e: any) {
      console.error('Error loading products:', e);
      setProductsError(e.message || 'فشل الاتصال بالـ API');
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMerchantData();
    loadProductsData();
  }, [loadMerchantData, loadProductsData]);

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
  }, [currentUser]);

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

  // Handle navigate to tracking / orders
  const handleNavigateToTracking = useCallback((orderId: string) => {
    setTrackingOrderId(orderId);
    setActiveTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-[#7F00FF] selection:text-white transition-colors duration-200">
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
        onOpenUserOrders={() => {
          setActiveTab('orders');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSettings={() => {
          setActiveTab('settings');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab as any);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        ordersCount={orders.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Sidebar / Drawer Navigation Overlay */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        merchantInfo={merchantInfo}
        isLoadingMerchant={isLoadingMerchant}
        onRefreshMerchant={loadMerchantData}
        activeTab={activeTab}
        onNavigate={(tab) => {
          setActiveTab(tab as any);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        ordersCount={orders.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 sm:pb-32">
        {activeTab === 'products' ? (
          <ProductGrid
            products={products}
            isLoading={isLoadingProducts}
            error={productsError}
            onRefresh={loadProductsData}
            onSelectProduct={handleSelectProduct}
            banners={banners}
            onOpenBannerManager={() => setIsBannerModalOpen(true)}
          />
        ) : activeTab === 'orders' || activeTab === 'track' ? (
          <OrdersHistoryPage
            currentUser={currentUser}
            orders={orders}
            onRefreshOrders={refreshUserOrders}
            onNavigateHome={() => {
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAuth={handleOpenAuth}
            initialQuery={trackingOrderId}
          />
        ) : activeTab === 'support' ? (
          <SupportPage
            onNavigateHome={() => {
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeTab === 'about' ? (
          <AboutPage
            onNavigateHome={() => {
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateSupport={() => {
              setActiveTab('support');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
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
            onNavigateHome={() => {
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateOrders={() => {
              setActiveTab('orders');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRefreshMerchant={loadMerchantData}
            isLoadingMerchant={isLoadingMerchant}
            onOpenAdmin={() => {
              setActiveTab('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeTab === 'admin' ? (
          <AdminDashboard
            currentUser={currentUser}
            merchantInfo={merchantInfo}
            onRefreshMerchant={loadMerchantData}
            isLoadingMerchant={isLoadingMerchant}
            onOpenBannerManager={() => setIsBannerModalOpen(true)}
            onNavigateHome={() => {
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateSettings={() => {
              setActiveTab('settings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeTab === 'auth' ? (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
            onBackToStore={() => {
              setPendingProductForAuth(null);
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            pendingProduct={pendingProductForAuth}
            initialMode={authMode}
            theme={theme}
          />
        ) : activeTab === 'checkout' && selectedProductForOrder ? (
          <CheckoutPage
            product={selectedProductForOrder}
            currentUser={currentUser}
            orderOptions={selectedOrderOptions}
            onBack={() => {
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOrderSuccess={handleOrderSuccess}
            onNavigateToTracking={handleNavigateToTracking}
            onNavigateHome={() => {
              setSelectedProductForOrder(null);
              setSelectedOrderOptions(null);
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : null}
      </main>

      {/* Bottom Floating Navigation Bar (Clean 3-item layout: Home, Orders, Account) */}
      <BottomNav
        activeTab={activeTab}
        authMode={authMode}
        onNavigateHome={() => {
          setActiveTab('products');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateOrders={() => {
          setActiveTab('orders');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateLogin={() => handleOpenAuth('login')}
        onNavigateRegister={() => handleOpenAuth('register')}
        onNavigateTrack={() => {
          setActiveTab('orders');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSettings={() => {
          setActiveTab('settings');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        ordersCount={orders.length}
        isLoggedIn={!!currentUser}
      />

      {/* Banner Upload & Management Modal */}
      <BannerManagementModal
        isOpen={isBannerModalOpen}
        onClose={() => setIsBannerModalOpen(false)}
        banners={banners}
        onSaveBanners={handleSaveBanners}
      />
    </div>
  );
}
