import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
} from 'lucide-react';
import { Product, StoreBanner } from '../types';
import { Breadcrumbs } from './store/Breadcrumbs';
import { CategoryCard, CategorySummary } from './store/CategoryCard';
import { GameCard, GameGroup } from './store/GameCard';
import { PackageCard } from './store/PackageCard';
import { GamePackagesView } from './store/GamePackagesView';
import { BannerSlider } from './BannerSlider';

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onSelectProduct: (product: Product, options?: { playerId?: string; qty?: number }) => void;
  banners?: StoreBanner[];
  onOpenBannerManager?: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = React.memo(({
  products,
  isLoading,
  error,
  onRefresh,
  onSelectProduct,
  banners = [],
  onOpenBannerManager,
}) => {
  // Navigation states for the 3 Tiers
  // Tier 1: selectedCategory === null && selectedGame === null (Home Categories View)
  // Tier 2: selectedCategory !== null && selectedGame === null (Games / Apps List in Category)
  // Tier 3: selectedCategory !== null && selectedGame !== null (Game Packages & Pricing View)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Scroll to top on tier transition
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handlers for hierarchical navigation
  const handleNavigateHome = useCallback(() => {
    setSelectedCategory(null);
    setSelectedGame(null);
    setSearchQuery('');
    scrollToTop();
  }, [scrollToTop]);

  const handleSelectCategory = useCallback((categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedGame(null);
    setSearchQuery('');
    scrollToTop();
  }, [scrollToTop]);

  const handleSelectGame = useCallback((gameName: string) => {
    setSelectedGame(gameName);
    setSearchQuery('');
    scrollToTop();
  }, [scrollToTop]);

  const handleNavigateBackToCategory = useCallback(() => {
    setSelectedGame(null);
    setSearchQuery('');
    scrollToTop();
  }, [scrollToTop]);

  // 1. Group products by Category (Tier 1 Data)
  const categoriesData = useMemo(() => {
    const map = new Map<string, { games: Map<string, Product[]>; totalPackages: number }>();

    products.forEach((p) => {
      const cat = p.category || 'أخرى';
      const gName = p.gameName || p.name || 'عام';

      if (!map.has(cat)) {
        map.set(cat, { games: new Map(), totalPackages: 0 });
      }

      const catEntry = map.get(cat)!;
      catEntry.totalPackages += 1;

      if (!catEntry.games.has(gName)) {
        catEntry.games.set(gName, []);
      }
      catEntry.games.get(gName)!.push(p);
    });

    const result: CategorySummary[] = [];

    map.forEach((data, catName) => {
      const sampleItems = Array.from(data.games.keys());
      result.push({
        name: catName,
        gamesCount: data.games.size,
        packagesCount: data.totalPackages,
        sampleItems,
      });
    });

    return result;
  }, [products]);

  // 2. Group games inside the selected category (Tier 2 Data)
  const gamesInCategory = useMemo<GameGroup[]>(() => {
    if (!selectedCategory) return [];

    const categoryProducts = products.filter((p) => (p.category || 'أخرى') === selectedCategory);
    const gamesMap = new Map<string, Product[]>();

    categoryProducts.forEach((p) => {
      const gName = p.gameName || p.name || 'عام';
      if (!gamesMap.has(gName)) {
        gamesMap.set(gName, []);
      }
      gamesMap.get(gName)!.push(p);
    });

    let list: GameGroup[] = [];
    gamesMap.forEach((packages, gName) => {
      // Find lowest and highest price
      const prices = packages.map((pkg) => pkg.price || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      // First available image
      const image = packages.find((pkg) => pkg.image)?.image || '';

      list.push({
        gameName: gName,
        category: selectedCategory,
        packagesCount: packages.length,
        minPrice,
        maxPrice,
        currency: packages[0]?.currency || 'USD',
        image,
        packages,
      });
    });

    // Filter by search query if user types in category view
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.gameName.toLowerCase().includes(q) ||
          g.packages.some(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              String(p.productId).toLowerCase().includes(q)
          )
      );
    }

    return list;
  }, [products, selectedCategory, searchQuery]);

  // 3. Packages for selected Game (Tier 3 Data)
  const packagesInGame = useMemo<Product[]>(() => {
    if (!selectedCategory || !selectedGame) return [];

    const list = products.filter((p) => {
      const catMatch = (p.category || 'أخرى') === selectedCategory;
      const gameMatch = (p.gameName || p.name || 'عام') === selectedGame;
      return catMatch && gameMatch;
    });

    // Filter by search query if user types in package view
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        String(p.productId).toLowerCase().includes(q) ||
        String(p.price).includes(q)
      );
    });
  }, [products, selectedCategory, selectedGame, searchQuery]);

  // Global search matching for Tier 1 (if user searches from Home)
  const globalSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || selectedCategory !== null) return [];

    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        (p.gameName && p.gameName.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        String(p.productId).toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Breadcrumb Navigation */}
      {(selectedCategory || selectedGame) && (
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl px-4 py-2.5 shadow-xs transition-colors">
          <Breadcrumbs
            categoryName={selectedCategory}
            gameName={selectedGame}
            onNavigateHome={handleNavigateHome}
            onNavigateCategory={handleNavigateBackToCategory}
          />
        </div>
      )}

      {/* Main Screen Animated Banner Slider (Directly below top header, above search and categories) */}
      {!selectedCategory && !selectedGame && !searchQuery.trim() && banners && banners.length > 0 && (
        <BannerSlider
          banners={banners}
          onOpenManageModal={onOpenBannerManager}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {/* Global & Contextual Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <input
          id="search-store-input"
          type="text"
          placeholder={
            selectedGame
              ? `ابحث في باقات ${selectedGame}...`
              : selectedCategory
              ? `ابحث في ألعاب وتطبيقات ${selectedCategory}...`
              : 'ابحث عن أي قسم، لعبة، تطبيق، أو باقة شحن...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-12 py-3.5 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] focus:ring-4 focus:ring-[#7F00FF]/15 transition-all shadow-xs"
        />
        <Search className="w-5 h-5 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-4 top-3.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={onRefresh}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && products.length === 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="bg-white dark:bg-[#151221] border border-gray-100 dark:border-white/10 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 animate-pulse space-y-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 dark:bg-white/10 rounded-lg sm:rounded-xl" />
              <div className="h-3.5 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
              <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded w-full" />
              <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-lg mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* ========================================================
          TIER 1: MAIN HOME - CATEGORIES GRID
          ======================================================== */}
      {!isLoading && selectedCategory === null && (
        <div className="space-y-6">
          {/* If user searched on Home screen */}
          {searchQuery.trim() ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#1A1A1A] dark:text-white">
                  نتائج البحث عن: "{searchQuery}"
                </h2>
                <span className="text-xs font-bold text-[#7F00FF] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-full">
                  {globalSearchResults.length} نتيجة مطابقة
                </span>
              </div>

              {globalSearchResults.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                  {globalSearchResults.map((prod) => (
                    <PackageCard
                      key={prod.id}
                      product={prod}
                      onSelect={onSelectProduct}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-12 text-center max-w-md mx-auto space-y-2">
                  <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">لم يتم العثور على نتائج</p>
                  <p className="text-xs text-gray-400">جرب البحث باسم قسم أو لعبة أخرى</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Grid of Compact Category Cards (3 Cards Per Row on all screens) */}
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                {categoriesData.map((cat) => (
                  <CategoryCard
                    key={cat.name}
                    category={cat}
                    onSelectCategory={handleSelectCategory}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TIER 2: CATEGORY SUB-PAGE - GAMES / APPS LIST
          ======================================================== */}
      {!isLoading && selectedCategory !== null && selectedGame === null && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Clean Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-5 bg-[#7F00FF] rounded-full inline-block" />
                <span>{selectedCategory}</span>
              </h2>
              <span className="text-xs font-bold text-[#7F00FF] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 px-2.5 py-0.5 rounded-full">
                {gamesInCategory.length} متوفر
              </span>
            </div>

            <button
              onClick={handleNavigateHome}
              className="text-xs text-[#7F00FF] dark:text-purple-300 hover:text-[#6b00d6] font-bold inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-xl cursor-pointer transition-colors border border-purple-100 dark:border-purple-800/40"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للأقسام</span>
            </button>
          </div>

          {/* Games / Apps Grid (3 Cards Per Row) */}
          <div className="space-y-3">
            {gamesInCategory.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                {gamesInCategory.map((game) => (
                  <GameCard
                    key={game.gameName}
                    game={game}
                    onSelectGame={handleSelectGame}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#151221] border border-gray-200/80 dark:border-white/10 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">لا توجد عناصر مطابقة</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  تأكد من كتابة اسم اللعبة أو التطبيق بشكل صحيح
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-[#7F00FF] dark:text-purple-300 font-bold underline underline-offset-4 cursor-pointer"
                >
                  مسح البحث
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TIER 3: GAME / APP DETAILS - PACKAGES & PRICING PAGE
          ======================================================== */}
      {!isLoading && selectedCategory !== null && selectedGame !== null && (
        <GamePackagesView
          gameName={selectedGame}
          categoryName={selectedCategory}
          packages={packagesInGame}
          onBack={handleNavigateBackToCategory}
          onSelectProduct={onSelectProduct}
        />
      )}
    </div>
  );
});

ProductGrid.displayName = 'ProductGrid';

