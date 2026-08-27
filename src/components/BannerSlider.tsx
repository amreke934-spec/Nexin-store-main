import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  ExternalLink, 
  Settings2, 
  Play, 
  Pause,
  Image as ImageIcon 
} from 'lucide-react';
import { StoreBanner } from '../types';

interface BannerSliderProps {
  banners: StoreBanner[];
  onOpenManageModal?: () => void;
  canManage?: boolean;
  onSelectCategory?: (category: string) => void;
  autoPlayInterval?: number; // default 4500ms
}

export const BannerSlider: React.FC<BannerSliderProps> = React.memo(({
  banners,
  onOpenManageModal,
  canManage = true,
  onSelectCategory,
  autoPlayInterval = 4500,
}) => {
  const activeBanners = banners.filter((b) => b.isActive !== false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // If active banners list changes and index is out of range
  useEffect(() => {
    if (currentIndex >= activeBanners.length && activeBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  const goToNext = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const goToPrev = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-play timer
  useEffect(() => {
    if (isPaused || activeBanners.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, activeBanners.length, autoPlayInterval, goToNext]);

  // Touch Swipe Handlers (RTL aware)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 45;

    // In RTL, positive distance (swiping left) moves forward
    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrev();
    }
  };

  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentIndex];

  const handleBannerClick = (banner: StoreBanner) => {
    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
    } else if (banner.actionType === 'category' && banner.targetCategory && onSelectCategory) {
      onSelectCategory(banner.targetCategory);
    }
  };

  return (
    <div 
      className="relative group w-full mb-6 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Outer Banner Container with Glowing Border */}
      <div 
        id="nexen-banner-slider"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-[16/7] sm:aspect-[21/8] md:aspect-[21/7] rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#0b031c] via-[#160633] to-[#080214] border border-purple-500/30 dark:border-purple-500/40 shadow-xl shadow-purple-950/20 transition-all duration-300"
      >
        {/* Banner Images Slides */}
        {activeBanners.map((banner, index) => {
          const isCurrent = index === currentIndex;
          const hasAction = !!banner.linkUrl || (banner.actionType === 'category' && !!banner.targetCategory);

          return (
            <div
              key={banner.id || index}
              onClick={() => hasAction && handleBannerClick(banner)}
              className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-out will-change-[opacity] gpu-layer ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              } ${hasAction ? 'cursor-pointer' : ''}`}
            >
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-full object-cover object-center"
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />

              {/* Optional Subtle Dark Overlay for contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

              {/* Floating Action Indicator Pill if banner is interactive */}
              {hasAction && isCurrent && (
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-auto">
                  {banner.linkUrl ? (
                    <a
                      href={banner.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-[#7F00FF] backdrop-blur-md text-white text-[11px] sm:text-xs font-black border border-white/25 shadow-lg hover:border-purple-300 hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      <span>{banner.badgeText || 'انقر للمزيد'}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-purple-300" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBannerClick(banner);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold border border-white/20 shadow-md hover:bg-black/80 transition-colors cursor-pointer"
                    >
                      <span>{banner.badgeText || 'انقر للمزيد'}</span>
                      <ExternalLink className="w-3 h-3 text-purple-300" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Navigation Arrows (Prev / Next) */}
        {activeBanners.length > 1 && (
          <>
            {/* Right Arrow (Next in RTL) */}
            <button
              type="button"
              id="slider-btn-prev"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              aria-label="Previous Slide"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-[#7F00FF]/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all duration-200 opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Left Arrow (Prev in RTL) */}
            <button
              type="button"
              id="slider-btn-next"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label="Next Slide"
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-[#7F00FF]/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all duration-200 opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Top Control Bar: Manage Button for Admin/Store Owner */}
        {canManage && onOpenManageModal && (
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              id="open-banner-manager-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenManageModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-[#7F00FF] backdrop-blur-md text-white text-[11px] font-bold border border-white/20 shadow-lg cursor-pointer transition-all hover:scale-105"
            >
              <Settings2 className="w-3.5 h-3.5 text-purple-300" />
              <span>إدارة البنرات</span>
            </button>
          </div>
        )}

        {/* Bottom Indicator Dots */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-6 h-2 bg-[#7F00FF] shadow-xs shadow-purple-500'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

BannerSlider.displayName = 'BannerSlider';
