import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDown, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
}) => {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const pullYRef = useRef(0);
  const isRefreshingRef = useRef(false);

  pullYRef.current = pullY;
  isRefreshingRef.current = isRefreshing;

  const PULL_THRESHOLD = 70; // pixels to trigger refresh
  const MAX_PULL = 110;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshingRef.current) return;
      // Only initiate pull-to-refresh if at top of page
      if (window.scrollY <= 2) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        startYRef.current = null;
        isPullingRef.current = false;
      }
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPullingRef.current || startYRef.current === null || isRefreshingRef.current || disabled) {
        return;
      }

      // If user has scrolled down, cancel pulling
      if (window.scrollY > 2) {
        setPullY(0);
        isPullingRef.current = false;
        startYRef.current = null;
        return;
      }

      const currentY = e.touches[0].clientY;
      const diffY = currentY - startYRef.current;

      if (diffY > 0) {
        // Damping resistance
        const dampened = Math.min(MAX_PULL, diffY * 0.45);
        setPullY(dampened);

        // Prevent native overscroll / bounce if pulling at top
        if (e.cancelable && dampened > 10) {
          e.preventDefault();
        }
      } else {
        setPullY(0);
      }
    },
    [disabled]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current && !isRefreshingRef.current) return;
    isPullingRef.current = false;
    startYRef.current = null;

    if (pullYRef.current >= PULL_THRESHOLD && !isRefreshingRef.current) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullY(56); // Hold at active height

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {}
      }

      try {
        await onRefresh();
        setIsDone(true);
        setTimeout(() => {
          setIsDone(false);
          setIsRefreshing(false);
          setPullY(0);
        }, 600);
      } catch (err) {
        console.error('Pull to refresh failed:', err);
        setIsRefreshing(false);
        setPullY(0);
      }
    } else {
      // Snap back
      setPullY(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const isTriggerable = pullY >= PULL_THRESHOLD;
  const progressRatio = Math.min(1, pullY / PULL_THRESHOLD);

  return (
    <div className="relative w-full">
      {/* Pull Indicator Header */}
      <div
        style={{
          height: `${pullY}px`,
          opacity: pullY > 5 ? 1 : 0,
          transition: isPullingRef.current ? 'none' : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="overflow-hidden flex items-center justify-center pointer-events-none sticky top-16 z-30 w-full"
      >
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-md rounded-full text-xs font-bold text-slate-700 dark:text-slate-200">
          {isDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in-75 duration-200" />
              <span className="text-emerald-600 dark:text-emerald-400">تم تحديث البيانات بنجاح</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 text-[#7F00FF] animate-spin" />
              <span>جارٍ تحديث البيانات...</span>
            </>
          ) : (
            <>
              <ArrowDown
                style={{
                  transform: `rotate(${isTriggerable ? 180 : progressRatio * 180}deg)`,
                  transition: 'transform 0.15s ease',
                }}
                className={`w-4 h-4 ${isTriggerable ? 'text-[#7F00FF]' : 'text-slate-400'}`}
              />
              <span>{isTriggerable ? 'أفلت للتحديث الآن' : 'اسحب للأسفل للتحديث'}</span>
            </>
          )}
        </div>
      </div>

      {/* Children content */}
      <div
        style={{
          transform: pullY > 0 ? `translateY(${Math.min(pullY * 0.3, 20)}px)` : undefined,
          transition: isPullingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
