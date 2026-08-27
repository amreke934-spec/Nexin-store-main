import { StoreBanner } from '../types';

// High-fidelity SVG generators for the 3 default store banners
const createChatAppsBannerSvg = () => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480" width="1200" height="480">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070312" />
      <stop offset="40%" stop-color="#14072b" />
      <stop offset="80%" stop-color="#240b4f" />
      <stop offset="100%" stop-color="#0a0319" />
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="50%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#e9d5ff" />
    </linearGradient>
    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7F00FF" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="boxGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="480" fill="url(#bg)" rx="32" />
  
  <!-- Subtle decorative grid & circuits -->
  <g opacity="0.15" stroke="#a855f7" stroke-width="1.5">
    <path d="M 0,80 L 1200,80 M 0,240 L 1200,240 M 0,400 L 1200,400" stroke-dasharray="6,6" />
    <path d="M 200,0 L 200,480 M 600,0 L 600,480 M 1000,0 L 1000,480" stroke-dasharray="6,6" />
    <circle cx="1080" cy="400" r="4" fill="#a855f7" />
    <path d="M 1080,400 L 1140,400 L 1170,430" fill="none" stroke-width="2" />
    <circle cx="120" cy="100" r="4" fill="#a855f7" />
    <path d="M 120,100 L 60,100 L 30,70" fill="none" stroke-width="2" />
  </g>

  <!-- Glowing background orbs -->
  <circle cx="950" cy="180" r="220" fill="#7F00FF" opacity="0.3" filter="url(#glow)" />
  <circle cx="350" cy="300" r="180" fill="#a855f7" opacity="0.2" filter="url(#glow)" />

  <!-- Nexen Store Logo Top Right/Center Header -->
  <g transform="translate(920, 45)">
    <rect x="0" y="0" width="220" height="60" rx="16" fill="#180c35" stroke="#7F00FF" stroke-width="1.5" opacity="0.9" />
    <text x="110" y="38" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" text-anchor="middle" letter-spacing="1">NEXEN STORE</text>
  </g>

  <!-- Top Headline: شحن فوري لكافة تطبيقات الدردشة -->
  <g transform="translate(1140, 150)" text-anchor="end">
    <text x="0" y="0" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" filter="url(#glow)">
      ⚡ شحن فوري لكافة تطبيقات الدردشة
    </text>
    <text x="0" y="42" fill="#c084fc" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20">
      بسرعة وأمان ... دائماً معك • أفضل الأسعار والتسليم الآلي الفوري
    </text>
  </g>

  <!-- App Cards Row (Sugo, Bigo, Sima, TikTok, Likee) -->
  <g transform="translate(80, 240)">
    <!-- Sugo -->
    <g transform="translate(0, 0)">
      <rect width="180" height="180" rx="28" fill="#130a2a" stroke="#7F00FF" stroke-width="2" filter="url(#boxGlow)" />
      <rect x="25" y="25" width="130" height="95" rx="20" fill="#9333ea" opacity="0.85" />
      <text x="90" y="80" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="26" text-anchor="middle">SUGO</text>
      <text x="90" y="155" fill="#e9d5ff" font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="middle">سوجو</text>
    </g>

    <!-- Bigo Live -->
    <g transform="translate(210, 0)">
      <rect width="180" height="180" rx="28" fill="#130a2a" stroke="#06b6d4" stroke-width="2" filter="url(#boxGlow)" />
      <rect x="25" y="25" width="130" height="95" rx="20" fill="#0891b2" opacity="0.85" />
      <text x="90" y="80" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="26" text-anchor="middle">BIGO</text>
      <text x="90" y="155" fill="#cffafe" font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="middle">بيجو لايف</text>
    </g>

    <!-- Sima -->
    <g transform="translate(420, 0)">
      <rect width="180" height="180" rx="28" fill="#130a2a" stroke="#f59e0b" stroke-width="2" filter="url(#boxGlow)" />
      <rect x="25" y="25" width="130" height="95" rx="20" fill="#d97706" opacity="0.85" />
      <text x="90" y="80" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="26" text-anchor="middle">SIMA</text>
      <text x="90" y="155" fill="#fef3c7" font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="middle">سيما</text>
    </g>

    <!-- TikTok -->
    <g transform="translate(630, 0)">
      <rect width="180" height="180" rx="28" fill="#130a2a" stroke="#ec4899" stroke-width="2" filter="url(#boxGlow)" />
      <rect x="25" y="25" width="130" height="95" rx="20" fill="#be185d" opacity="0.85" />
      <text x="90" y="80" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="26" text-anchor="middle">TIKTOK</text>
      <text x="90" y="155" fill="#fce7f3" font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="middle">تيك توك</text>
    </g>

    <!-- Likee -->
    <g transform="translate(840, 0)">
      <rect width="180" height="180" rx="28" fill="#130a2a" stroke="#a855f7" stroke-width="2" filter="url(#boxGlow)" />
      <rect x="25" y="25" width="130" height="95" rx="20" fill="#7e22ce" opacity="0.85" />
      <text x="90" y="80" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="26" text-anchor="middle">LIKEE</text>
      <text x="90" y="155" fill="#f3e8ff" font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="middle">لايكي</text>
    </g>
  </g>
</svg>
  `)}`;
};

const createTelegramBannerSvg = () => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480" width="1200" height="480">
  <defs>
    <linearGradient id="tbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090217" />
      <stop offset="50%" stop-color="#160633" />
      <stop offset="100%" stop-color="#2a085c" />
    </linearGradient>
    <linearGradient id="tgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2AABEE" />
      <stop offset="100%" stop-color="#229ED9" />
    </linearGradient>
    <linearGradient id="btnG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7F00FF" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <filter id="tglow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="480" fill="url(#tbg)" rx="32" />
  
  <!-- Glowing Background Orbs -->
  <circle cx="280" cy="240" r="220" fill="#7F00FF" opacity="0.35" filter="url(#tglow)" />
  <circle cx="950" cy="200" r="180" fill="#2AABEE" opacity="0.2" filter="url(#tglow)" />

  <!-- 3D Telegram App Icon Visual Left -->
  <g transform="translate(140, 90)">
    <!-- Podest base -->
    <ellipse cx="140" cy="280" rx="130" ry="30" fill="#190938" stroke="#7F00FF" stroke-width="2" opacity="0.8" />
    
    <!-- Telegram 3D Box -->
    <rect x="30" y="30" width="220" height="220" rx="48" fill="#1b0a3c" stroke="#a855f7" stroke-width="3" filter="url(#tglow)" />
    <circle cx="140" cy="140" r="75" fill="url(#tgGrad)" />
    
    <!-- Paper Plane Icon -->
    <path d="M 95,135 L 175,100 L 155,175 L 132,150 L 118,162 Z" fill="#ffffff" />
    <path d="M 132,150 L 155,120 L 118,142 Z" fill="#d0eaf8" />
    
    <!-- Notification Badge 9+ -->
    <g transform="translate(190, 20)">
      <circle cx="25" cy="25" r="28" fill="#ec4899" stroke="#ffffff" stroke-width="3" />
      <text x="25" y="34" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="24" text-anchor="middle">9+</text>
    </g>
  </g>

  <!-- Content Right -->
  <g transform="translate(1120, 120)" text-anchor="end">
    <text x="0" y="0" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="46" filter="url(#tglow)">
      كن أول من يعرف ما يهمك!
    </text>
    
    <!-- Pills row -->
    <g transform="translate(0, 45)">
      <rect x="-650" y="0" width="650" height="48" rx="24" fill="#14072b" stroke="#7F00FF" stroke-width="1.5" />
      <text x="-325" y="31" fill="#e9d5ff" font-family="system-ui, sans-serif" font-weight="700" font-size="18" text-anchor="middle">
        عروض حصرية 🌸 | تحديثات فورية ⚡ | محتوى مميز 💎
      </text>
    </g>

    <text x="0" y="145" fill="#c084fc" font-family="system-ui, sans-serif" font-weight="700" font-size="22">
      مجتمع واحد، مزايا لا تنتهي • انضم لقناتنا الرسمية
    </text>

    <!-- Join Telegram Button -->
    <g transform="translate(0, 185)">
      <rect x="-240" y="0" width="240" height="64" rx="24" fill="url(#btnG)" filter="url(#tglow)" />
      <text x="-120" y="40" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="22" text-anchor="middle">
        انضم الآن ✈️
      </text>
    </g>
  </g>

  <!-- Nexen Store Branding Bottom Left -->
  <g transform="translate(70, 410)">
    <text x="0" y="0" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="20" letter-spacing="1">
      🛍️ NEXEN STORE
    </text>
  </g>
</svg>
  `)}`;
};

const createGamingRechargeBannerSvg = () => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480" width="1200" height="480">
  <defs>
    <linearGradient id="gbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05010e" />
      <stop offset="50%" stop-color="#120429" />
      <stop offset="100%" stop-color="#280854" />
    </linearGradient>
    <linearGradient id="neonPurple" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7F00FF" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <filter id="gglow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="480" fill="url(#gbg)" rx="32" />
  
  <!-- Glowing Orbs -->
  <circle cx="580" cy="240" r="200" fill="#7F00FF" opacity="0.3" filter="url(#gglow)" />
  <circle cx="150" cy="180" r="160" fill="#a855f7" opacity="0.25" filter="url(#gglow)" />

  <!-- Branding Top Left -->
  <g transform="translate(80, 60)">
    <rect width="200" height="52" rx="16" fill="#160833" stroke="#7F00FF" stroke-width="1.5" />
    <text x="100" y="34" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="20" text-anchor="middle">
      🛍️ Nexen Store
    </text>
  </g>

  <!-- Center Airdrop / Gaming Loot Crate Graphic -->
  <g transform="translate(480, 120)">
    <!-- Parachute strings -->
    <path d="M 120, -50 L 50, 80 M 120, -50 L 190, 80 M 120, -50 L 120, 80" stroke="#7F00FF" stroke-width="2" opacity="0.6" />
    <!-- Crate -->
    <rect x="40" y="80" width="160" height="150" rx="20" fill="#1b0840" stroke="#a855f7" stroke-width="3" filter="url(#gglow)" />
    <rect x="55" y="95" width="130" height="35" rx="8" fill="#7F00FF" />
    <text x="120" y="120" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="18" text-anchor="middle">متجر NEXEN</text>
    <circle cx="120" cy="180" r="24" fill="#3b0764" stroke="#c084fc" stroke-width="2" />
    <text x="120" y="188" fill="#ffd700" font-family="system-ui, sans-serif" font-weight="900" font-size="20" text-anchor="middle">👑</text>
  </g>

  <!-- Left Side Text: ارتقِ بتجربتك -->
  <g transform="translate(80, 240)">
    <text x="0" y="0" fill="#e9d5ff" font-family="system-ui, sans-serif" font-weight="800" font-size="28">
      ارتقِ بتجربتك مع
    </text>
    <text x="0" y="65" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="52" filter="url(#gglow)">
      متجر Nexen
    </text>

    <!-- Badges Row: سرعة / دعم 24/7 / أمان -->
    <g transform="translate(0, 115)">
      <g transform="translate(0, 0)">
        <rect width="90" height="40" rx="12" fill="#180b33" stroke="#7F00FF" stroke-width="1" />
        <text x="45" y="26" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">⚡ سرعة</text>
      </g>
      <g transform="translate(105, 0)">
        <rect width="110" height="40" rx="12" fill="#180b33" stroke="#7F00FF" stroke-width="1" />
        <text x="55" y="26" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">🎧 دعم 24/7</text>
      </g>
      <g transform="translate(230, 0)">
        <rect width="90" height="40" rx="12" fill="#180b33" stroke="#7F00FF" stroke-width="1" />
        <text x="45" y="26" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">🛡️ أمان</text>
      </g>
    </g>
  </g>

  <!-- Right Side: Top Headings & Apps -->
  <g transform="translate(1120, 90)" text-anchor="end">
    <text x="0" y="0" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="42" filter="url(#gglow)">
      ⚡ شحن فوري لكافة التطبيقات
    </text>
    <text x="0" y="38" fill="#c084fc" font-family="system-ui, sans-serif" font-weight="700" font-size="18">
      بسرعة وأمان ... دائماً معك
    </text>

    <!-- Mini app icons -->
    <g transform="translate(0, 80)">
      <g transform="translate(-130, 0)">
        <rect width="120" height="120" rx="22" fill="#180838" stroke="#7F00FF" stroke-width="2" />
        <text x="60" y="55" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="18" text-anchor="middle">SUGO</text>
        <text x="60" y="95" fill="#c084fc" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">سوجو</text>
      </g>
      <g transform="translate(-270, 0)">
        <rect width="120" height="120" rx="22" fill="#180838" stroke="#06b6d4" stroke-width="2" />
        <text x="60" y="55" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="18" text-anchor="middle">BIGO</text>
        <text x="60" y="95" fill="#67e8f9" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">بيجو</text>
      </g>
      <g transform="translate(-410, 0)">
        <rect width="120" height="120" rx="22" fill="#180838" stroke="#f59e0b" stroke-width="2" />
        <text x="60" y="55" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="18" text-anchor="middle">FREE FIRE</text>
        <text x="60" y="95" fill="#fde68a" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">فري فاير</text>
      </g>
    </g>
  </g>
</svg>
  `)}`;
};

export const DEFAULT_STORE_BANNERS: StoreBanner[] = [
  {
    id: 'banner-chat-apps',
    title: 'شحن فوري لكافة تطبيقات الدردشة',
    subtitle: 'Sugo, Bigo, Sima, TikTok, Likee بأفضل الأسعار وبسرعة فائقة',
    imageUrl: createChatAppsBannerSvg(),
    linkUrl: '',
    actionType: 'none',
    badgeText: 'تسليم فوري وآلي ⚡',
    isActive: true,
    order: 1,
  },
  {
    id: 'banner-telegram',
    title: 'كن أول من يعرف ما يهمك!',
    subtitle: 'عروض حصرية، تحديثات فورية، ومسابقات مستمرة على قناتنا',
    imageUrl: createTelegramBannerSvg(),
    linkUrl: 'https://t.me/nexen_store',
    actionType: 'url',
    badgeText: 'قناة التيليجرام ✈️',
    isActive: true,
    order: 2,
  },
  {
    id: 'banner-gaming-crate',
    title: 'ارتقِ بتجربتك مع متجر Nexen',
    subtitle: 'شحن فوري، دعم فني 24/7، وأمان معتمد 100%',
    imageUrl: createGamingRechargeBannerSvg(),
    linkUrl: '',
    actionType: 'none',
    badgeText: 'ضمان وأمان 100% 🛡️',
    isActive: true,
    order: 3,
  },
];

const LOCAL_STORAGE_BANNERS_KEY = 'nexen_store_banners_v1';

export function getSavedBanners(): StoreBanner[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BANNERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure Telegram banner always points to https://t.me/nexen_store
        return parsed.map((b: StoreBanner) => {
          if (
            b.id === 'banner-telegram' || 
            b.title?.includes('تيليجرام') || 
            b.subtitle?.includes('قناتنا') ||
            b.badgeText?.includes('تيليجرام') ||
            (b.linkUrl && b.linkUrl.includes('t.me'))
          ) {
            return {
              ...b,
              linkUrl: 'https://t.me/nexen_store',
              actionType: 'url',
              badgeText: b.badgeText || 'انضم لقناة التيليجرام ✈️',
            };
          }
          return b;
        });
      }
    }
  } catch (e) {
    console.warn('Error reading banners from local storage:', e);
  }
  return DEFAULT_STORE_BANNERS;
}

export function saveBannersLocally(banners: StoreBanner[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_BANNERS_KEY, JSON.stringify(banners));
  } catch (e) {
    console.warn('Error saving banners to local storage:', e);
  }
}
