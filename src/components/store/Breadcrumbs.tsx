import React from 'react';
import { ChevronLeft, ArrowRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  categoryName?: string | null;
  gameName?: string | null;
  onNavigateHome: () => void;
  onNavigateCategory?: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  categoryName,
  gameName,
  onNavigateHome,
  onNavigateCategory,
}) => {
  return (
    <nav className="flex items-center justify-between flex-wrap gap-3 py-2 text-xs sm:text-sm font-medium">
      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500 dark:text-gray-400 overflow-x-auto py-1">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1 hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer text-gray-600 dark:text-gray-300 font-semibold shrink-0"
        >
          <Home className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </button>

        {categoryName && (
          <>
            <ChevronLeft className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
            <button
              onClick={() => {
                if (onNavigateCategory) onNavigateCategory();
                else onNavigateHome();
              }}
              className={`hover:text-[#7F00FF] dark:hover:text-purple-300 transition-colors cursor-pointer shrink-0 ${
                !gameName ? 'text-[#7F00FF] dark:text-purple-400 font-bold' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {categoryName}
            </button>
          </>
        )}

        {gameName && (
          <>
            <ChevronLeft className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
            <span className="text-[#7F00FF] dark:text-purple-400 font-bold shrink-0 line-clamp-1">
              {gameName}
            </span>
          </>
        )}
      </div>

      {/* Back button */}
      {(categoryName || gameName) && (
        <button
          onClick={() => {
            if (gameName && onNavigateCategory) {
              onNavigateCategory();
            } else {
              onNavigateHome();
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0 border border-transparent dark:border-white/5"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>
            {gameName ? 'العودة لقائمة التطبيقات' : 'العودة للأقسام الرئيسية'}
          </span>
        </button>
      )}
    </nav>
  );
};
