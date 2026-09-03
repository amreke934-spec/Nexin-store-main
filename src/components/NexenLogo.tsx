import React from 'react';
import { Zap } from 'lucide-react';

export interface NexenLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const NexenLogo: React.FC<NexenLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
}) => {
  const sizeMap = {
    sm: {
      box: 'w-7 h-7 rounded-lg',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    md: {
      box: 'w-10 h-10 rounded-xl',
      icon: 'w-5 h-5',
      text: 'text-base',
    },
    lg: {
      box: 'w-12 h-12 rounded-2xl',
      icon: 'w-6 h-6',
      text: 'text-lg',
    },
    xl: {
      box: 'w-20 h-20 rounded-3xl',
      icon: 'w-10 h-10',
      text: 'text-2xl',
    },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${current.box} bg-gradient-to-tr from-[#6800D1] to-[#9d4edd] text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0 select-none`}
      >
        <Zap className={`${current.icon} fill-current text-white`} />
      </div>
      {showText && (
        <span className={`font-black tracking-tight text-slate-900 dark:text-white ${current.text}`}>
          NEXEN <span className="text-[#7F00FF] dark:text-purple-400">STORE</span>
        </span>
      )}
    </div>
  );
};
