import React, { useEffect, useState } from 'react';
import { NexenLogo } from './NexenLogo';

interface SplashScreenProps {
  onComplete: (isLoggedIn: boolean) => void;
  isLoggedIn: boolean;
  isLoadingData?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isLoggedIn,
}) => {
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Snappy, lightweight introduction
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onComplete(isLoggedIn);
      }, 250);
    }, 700);

    return () => clearTimeout(timer);
  }, [isLoggedIn, onComplete]);

  return (
    <div
      id="splash-screen-container"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 bg-white dark:bg-[#0C0A14] text-[#1A1A1A] dark:text-white transition-opacity duration-250 select-none overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Spacer */}
      <div className="w-full max-w-sm flex items-center justify-center pt-2 z-10">
        <span className="font-bold text-[11px] bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800/50">
          بوابة الشحن المباشر
        </span>
      </div>

      {/* Center Section: Logo + Title */}
      <div className="flex flex-col items-center justify-center text-center my-auto z-10 max-w-md w-full">
        {/* Central Logo */}
        <div className="relative mb-5">
          <NexenLogo size="xl" showText={false} className="relative transform hover:scale-105 transition-transform duration-200" />
        </div>

        {/* Brand Name Typography */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1A1A1A] dark:text-white mb-2">
          Nexen <span className="text-[#7F00FF] dark:text-purple-400">Store</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
          متجر المنتجات والشحن الرقمي الفوري
        </p>

        {/* Subtle lightweight loading indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <span className="w-2 h-2 rounded-full bg-[#7F00FF] opacity-75" />
          <span className="w-2 h-2 rounded-full bg-[#7F00FF]" />
          <span className="w-2 h-2 rounded-full bg-[#7F00FF] opacity-75" />
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="w-full max-w-sm text-center z-10 pb-4">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
          NEXEN STORE © 2025
        </p>
      </div>
    </div>
  );
};
