import React from 'react';

interface NexenLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
}

export const NexenLogo: React.FC<NexenLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textClassName = '',
}) => {
  const sizeMap = {
    sm: { icon: 'w-8 h-8', text: 'text-base', subText: 'text-[9px]' },
    md: { icon: 'w-12 h-12', text: 'text-xl', subText: 'text-[11px]' },
    lg: { icon: 'w-20 h-20', text: 'text-3xl', subText: 'text-xs' },
    xl: { icon: 'w-32 h-32', text: 'text-4xl sm:text-5xl', subText: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Polygon Origami 'N' Symbol matching official artwork */}
      <div className={`relative ${currentSize.icon} flex items-center justify-center`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full filter drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients matching the origami facets */}
            <linearGradient id="facet-top-left" x1="40" y1="30" x2="90" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9D4EDD" />
              <stop offset="100%" stopColor="#7F00FF" />
            </linearGradient>

            <linearGradient id="facet-left-outer" x1="20" y1="70" x2="70" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7F00FF" />
              <stop offset="100%" stopColor="#5A189A" />
            </linearGradient>

            <linearGradient id="facet-left-inner" x1="50" y1="90" x2="100" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#B5179E" />
              <stop offset="50%" stopColor="#7209B7" />
              <stop offset="100%" stopColor="#560BAD" />
            </linearGradient>

            <linearGradient id="facet-diagonal-main" x1="70" y1="40" x2="140" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9D4EDD" />
              <stop offset="50%" stopColor="#7F00FF" />
              <stop offset="100%" stopColor="#480CA8" />
            </linearGradient>

            <linearGradient id="facet-diagonal-shadow" x1="80" y1="90" x2="130" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5A189A" />
              <stop offset="100%" stopColor="#3A0CA3" />
            </linearGradient>

            <linearGradient id="facet-right-top" x1="120" y1="20" x2="170" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C77DFF" />
              <stop offset="60%" stopColor="#9D4EDD" />
              <stop offset="100%" stopColor="#7F00FF" />
            </linearGradient>

            <linearGradient id="facet-right-outer" x1="130" y1="70" x2="180" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7209B7" />
              <stop offset="100%" stopColor="#3F37C9" />
            </linearGradient>

            <linearGradient id="facet-right-inner" x1="110" y1="80" x2="150" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7F00FF" />
              <stop offset="100%" stopColor="#480CA8" />
            </linearGradient>
          </defs>

          {/* Left Vertical Column Facets */}
          {/* Top-left cap fold */}
          <polygon
            points="80,25 98,38 72,98 42,92"
            fill="url(#facet-top-left)"
          />
          {/* Left outer wing */}
          <polygon
            points="42,92 72,98 40,165"
            fill="url(#facet-left-outer)"
          />
          {/* Left bottom point accent */}
          <polygon
            points="72,98 88,145 40,165"
            fill="url(#facet-left-inner)"
          />

          {/* Central Diagonal Fold & Shading */}
          {/* Upper diagonal facet */}
          <polygon
            points="98,38 135,108 92,150 72,98"
            fill="url(#facet-diagonal-main)"
          />
          {/* Lower diagonal facet / underside */}
          <polygon
            points="135,108 118,172 92,150"
            fill="url(#facet-diagonal-shadow)"
          />

          {/* Right Vertical Column Facets */}
          {/* Right top peak */}
          <polygon
            points="138,22 170,68 140,105 118,65"
            fill="url(#facet-right-top)"
          />
          {/* Right outer spike/wing */}
          <polygon
            points="170,68 185,92 140,105"
            fill="url(#facet-right-outer)"
          />
          {/* Right bottom stem */}
          <polygon
            points="140,105 148,162 118,172 135,108"
            fill="url(#facet-right-inner)"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className={`text-center mt-3 ${textClassName}`}>
          <span className={`font-black tracking-tight text-[#1A1A1A] dark:text-white block font-sans ${currentSize.text} leading-none`}>
            Nexen <span className="text-[#7F00FF] dark:text-[#9D4EDD]">Store</span>
          </span>
        </div>
      )}
    </div>
  );
};
