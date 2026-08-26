import React, { useState, useEffect, useCallback } from 'react';
import { MerchantInfo, Product, CustomerUser, OrderItem, OrderOptions } from './types';
import { fetchMerchantInfo, fetchProducts } from './services/scStoreApi';
import { fetchUserOrdersFromDb, fetchStoreSetting } from './services/dbApi';
import { setExchangeRate } from './utils/currencyUtils';
import { setProfitMarginConfig, ProfitMarginConfig } from './utils/profitUtils';
import { Navbar } from './components/Navbar';
import { ProductGrid } from './components/ProductGrid';
import { OrderTrackingSection } from './components/OrderTrackingSection';
import { WalletPage } from './components/WalletPage';
import { SettingsPage } from './components/SettingsPage';
import { AdminDashboard, ADMIN_AUTHORIZED_EMAIL } from './components/AdminDashboard';
import { AuthPage } from './components/AuthPage';
import { OrderModal } from './components/OrderModal';
import { UserHistoryModal } from './components/UserHistoryModal';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';
import { NexenLogo } from './components/NexenLogo';
import { ShieldCheck, Wallet } from 'lucide-react';

export default function App() {
  // Splash Screen initial state
  const [isSplashScreenVisible, setIsSplashScreenVisible] = useState<boolean>(true);

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<'products' | 'track' | 'wallet' | 'settings' | 'history' | 'auth' | 'admin'>('products');
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
  const [isUserHistoryOpen, setIsUserHistoryOpen] = useState<boolean>(false);

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

  // Sync saved exchange rate and user orders from Neon DB
  useEffect(() => {
    // 1. Fetch DB exchange rate & profit margin
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

    // 2. Fetch user orders from Neon DB if logged in
    if (currentUser && currentUser.id) {
      fetchUserOrdersFromDb(currentUser.id).then((dbOrders) => {
        if (dbOrders && dbOrders.length > 0) {
          setOrders((prev) => {
            const map = new Map<string, OrderItem>();
            // Add DB orders first
            dbOrders.forEach((o) => map.set(o.orderId, o));
            // Add any local-only orders
            prev.forEach((o) => {
              if (!map.has(o.orderId)) map.set(o.orderId, o);
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          });
        }
      }).catch(() => {});
    }
  }, [currentUser?.id]);

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

  // Handle product selection (Rule 1: Enforce login before checkout)
  const handleSelectProduct = (product: Product, options?: OrderOptions) => {
    setSelectedOrderOptions(options || null);
    if (!currentUser) {
      setPendingProductForAuth(product);
      setActiveTab('auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSelectedProductForOrder(product);
    }
  };

  // Handle successful login from full-page view
  const handleLoginSuccess = (user: CustomerUser, userOrders?: OrderItem[]) => {
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

    // If user clicked a product beforehand, redirect to products and open order modal for that product
    if (pendingProductForAuth) {
      const p = pendingProductForAuth;
      setPendingProductForAuth(null);
      setActiveTab('products');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        setSelectedProductForOrder(p);
      }, 100);
    } else {
      setActiveTab('products');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle successful order creation
  const handleOrderSuccess = (newOrder: OrderItem) => {
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
  };

  // Handle navigate to tracking
  const handleNavigateToTracking = (orderId: string) => {
    setTrackingOrderId(orderId);
    setActiveTab('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Delete account handler
  const handleDeleteAccount = () => {
    setCurrentUser(null);
    setOrders([]);
    localStorage.removeItem('nexen_user_session');
    localStorage.removeItem('nexen_orders_history');
  };

  const handleOpenWallet = () => {
    setActiveTab('wallet');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      {/* Top Navbar */}
      <Navbar
        merchantInfo={merchantInfo}
        isLoadingMerchant={isLoadingMerchant}
        onRefreshMerchant={loadMerchantData}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenUserOrders={() => setIsUserHistoryOpen(true)}
        onOpenSettings={() => {
          setActiveTab('settings');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ordersCount={orders.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
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
          />
        ) : activeTab === 'wallet' ? (
          <WalletPage
            merchantInfo={merchantInfo}
            currentUser={currentUser}
            orders={orders}
            isLoadingMerchant={isLoadingMerchant}
            onRefreshMerchant={loadMerchantData}
            onNavigateHome={() => {
              setActiveTab('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            theme={theme}
          />
        ) : activeTab === 'track' ? (
          <OrderTrackingSection
            initialOrderId={trackingOrderId}
            userOrders={orders}
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
        ) : null}
      </main>

      {/* Bottom Floating Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        authMode={authMode}
        onNavigateHome={() => {
          setActiveTab('products');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateLogin={() => handleOpenAuth('login')}
        onNavigateRegister={() => handleOpenAuth('register')}
        onNavigateWallet={handleOpenWallet}
        onNavigateTrack={() => {
          setActiveTab('track');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSettings={() => {
          setActiveTab('settings');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        ordersCount={orders.length}
        isLoggedIn={!!currentUser}
      />

      {/* Modals */}
      {/* 1. Order / Checkout Modal (Player ID input) */}
      <OrderModal
        isOpen={!!selectedProductForOrder}
        product={selectedProductForOrder}
        currentUser={currentUser}
        orderOptions={selectedOrderOptions}
        onClose={() => {
          setSelectedProductForOrder(null);
          setSelectedOrderOptions(null);
        }}
        onOrderSuccess={handleOrderSuccess}
        onNavigateToTracking={handleNavigateToTracking}
      />

      {/* 2. Customer User History Modal */}
      <UserHistoryModal
        isOpen={isUserHistoryOpen}
        currentUser={currentUser}
        orders={orders}
        onClose={() => setIsUserHistoryOpen(false)}
        onLogout={handleLogout}
        onTrackOrder={handleNavigateToTracking}
      />

      {/* Clean Footer */}
      <footer className="bg-slate-100/70 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800/80 mt-12 py-8 px-4 sm:px-8 text-xs text-slate-500 dark:text-slate-400 pb-24 sm:pb-12 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center p-1 shadow-xs">
              <NexenLogo size="sm" showText={false} />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight block">
                NEXEN STORE
              </span>
              <span className="text-[11px] text-slate-400">
                منصة شحن المنتجات الرقمية والألعاب
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button 
              onClick={() => {
                setActiveTab('products');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer"
            >
              الرئيسية (المنتجات)
            </button>

            {currentUser ? (
              <>
                <button 
                  onClick={handleOpenWallet} 
                  className="hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>المحفظة</span>
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('track');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  className="hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer"
                >
                  تتبع الطلبات
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('settings');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  className="hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer"
                >
                  الإعدادات
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleOpenAuth('login')} 
                  className="hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer"
                >
                  تسجيل الدخول
                </button>
                <button 
                  onClick={() => handleOpenAuth('register')} 
                  className="hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer"
                >
                  إنشاء حساب جديد
                </button>
              </div>
            )}
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              خدمة شحن فورية وآمنة
            </span>
          </div>

          <div className="text-[11px] text-slate-400 text-center md:text-left">
            جميع الحقوق محفوظة © {new Date().getFullYear()} Nexen Store
          </div>
        </div>
      </footer>
    </div>
  );
}
