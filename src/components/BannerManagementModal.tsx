import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Link as LinkIcon, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { StoreBanner } from '../types';
import { DEFAULT_STORE_BANNERS } from '../data/defaultBanners';

interface BannerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  banners: StoreBanner[];
  onSaveBanners: (updatedBanners: StoreBanner[]) => void;
}

export const BannerManagementModal: React.FC<BannerManagementModalProps> = ({
  isOpen,
  onClose,
  banners,
  onSaveBanners,
}) => {
  const [bannerList, setBannerList] = useState<StoreBanner[]>(banners);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  
  // New/Edit Banner form state
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [badgeText, setBadgeText] = useState<string>('');
  const [actionType, setActionType] = useState<'url' | 'none'>('none');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP, GIF, SVG)');
      return;
    }

    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageUrl(base64);
      setIsUploading(false);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.onerror = () => {
      setError('حدث خطأ أثناء قراءة ملف الصورة');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Add or Update Banner
  const handleSaveBannerItem = () => {
    if (!imageUrl) {
      setError('يرجى رفع صورة أو إدخال رابط الصورة أولاً');
      return;
    }

    if (editingBannerId) {
      // Update existing
      setBannerList((prev) =>
        prev.map((b) =>
          b.id === editingBannerId
            ? {
                ...b,
                title: title.trim() || 'بنر إعلاني',
                subtitle: subtitle.trim(),
                imageUrl,
                linkUrl: linkUrl.trim(),
                badgeText: badgeText.trim(),
                actionType: linkUrl.trim() ? 'url' : 'none',
              }
            : b
        )
      );
    } else {
      // Add new
      const newBanner: StoreBanner = {
        id: `banner-${Date.now()}`,
        title: title.trim() || `بنر إعلاني ${bannerList.length + 1}`,
        subtitle: subtitle.trim(),
        imageUrl,
        linkUrl: linkUrl.trim(),
        badgeText: badgeText.trim() || (linkUrl.trim() ? 'انقر هنا' : ''),
        actionType: linkUrl.trim() ? 'url' : 'none',
        isActive: true,
        order: bannerList.length + 1,
      };
      setBannerList((prev) => [...prev, newBanner]);
    }

    // Reset Form
    resetForm();
  };

  const resetForm = () => {
    setEditingBannerId(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setLinkUrl('');
    setBadgeText('');
    setActionType('none');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditClick = (b: StoreBanner) => {
    setEditingBannerId(b.id);
    setTitle(b.title);
    setSubtitle(b.subtitle || '');
    setImageUrl(b.imageUrl);
    setLinkUrl(b.linkUrl || '');
    setBadgeText(b.badgeText || '');
    setActionType(b.actionType === 'url' ? 'url' : 'none');
    setError(null);
  };

  const handleDelete = (id: string) => {
    setBannerList((prev) => prev.filter((b) => b.id !== id));
    if (editingBannerId === id) resetForm();
  };

  const handleToggleActive = (id: string) => {
    setBannerList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: b.isActive === false ? true : false } : b))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setBannerList((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === bannerList.length - 1) return;
    setBannerList((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleResetToDefault = () => {
    if (window.confirm('هل تريد استعادة البنرات الإعلانية الافتراضية الخاصة بـ Nexen Store؟')) {
      setBannerList(DEFAULT_STORE_BANNERS);
      resetForm();
    }
  };

  const handleSaveAllAndClose = () => {
    onSaveBanners(bannerList);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="banner-management-modal"
        className="bg-white dark:bg-[#130d24] border border-slate-200 dark:border-purple-900/50 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-[#7F00FF] dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>إدارة عارض البنرات الإعلانية</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-[#7F00FF] dark:text-purple-300">
                  {bannerList.length} بنرات
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                رفع وتحديث صور البنرات المتحركة في الصفحة الرئيسية لمتجر Nexen Store
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* 1. Add / Edit Banner Form */}
          <div className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#7F00FF]" />
                <span>{editingBannerId ? 'تعديل البنر الحالي' : 'إضافة بنر إعلاني جديد'}</span>
              </h3>
              {editingBannerId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            {/* Image Upload Area */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-white">
                صورة البنر <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Upload Button */}
                <div className="sm:col-span-6">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    id="banner-file-input"
                  />
                  <label
                    htmlFor="banner-file-input"
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-400/50 hover:border-[#7F00FF] bg-white dark:bg-purple-950/20 rounded-2xl cursor-pointer transition-all hover:bg-purple-50/50 group text-center"
                  >
                    <Upload className="w-6 h-6 text-[#7F00FF] mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      انقر لاختيار صورة من جهازك
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG, WEBP, SVG (نسبة العرض المثالية 21:9)
                    </span>
                  </label>
                </div>

                {/* OR image url */}
                <div className="sm:col-span-6 space-y-2">
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="أو أدخل رابط صورة مباشر (URL)..."
                      value={imageUrl.startsWith('data:') ? 'صورة مرفوعة من الجهاز (Base64)' : imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      disabled={imageUrl.startsWith('data:')}
                      className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7F00FF] font-mono"
                    />
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                  {imageUrl.startsWith('data:') && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[11px] font-bold text-red-500 hover:text-red-600 block text-right cursor-pointer"
                    >
                      إزالة الصورة المرفوعة
                    </button>
                  )}
                </div>
              </div>

              {/* Image Preview */}
              {imageUrl && (
                <div className="relative aspect-[21/7] rounded-xl overflow-hidden border border-purple-500/40 mt-3 shadow-inner bg-black">
                  <img src={imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    معاينة حية للبنر
                  </span>
                </div>
              )}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1 text-right">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  عنوان البنر (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: شحن فوري لكافة تطبيقات الدردشة"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                />
              </div>

              <div className="space-y-1 text-right">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  رابط التوجيه عند النقر (قناة تيليجرام / رابط خارجي)
                </label>
                <input
                  type="text"
                  placeholder="مثال: https://t.me/nexen_store"
                  value={linkUrl}
                  dir="ltr"
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF] font-mono text-left"
                />
              </div>

              <div className="space-y-1 text-right sm:col-span-2">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  النص التوضيحي أو شارة الزر
                </label>
                <input
                  type="text"
                  placeholder="مثال: انضم الآن ✈️ أو تسليم فوري وآلي ⚡"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#7F00FF]"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Save Item Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveBannerItem}
                disabled={isUploading}
                className="px-5 py-2.5 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs font-black flex items-center gap-2 shadow-md shadow-[#7F00FF]/25 cursor-pointer active:scale-95 transition-all"
              >
                {editingBannerId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingBannerId ? 'تحديث بيانات البنر' : 'إضافة البنر للسلايدر'}</span>
              </button>
            </div>
          </div>

          {/* 2. Current Banners List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                قائمة البنرات الحالية ({bannerList.length})
              </h3>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] font-bold text-slate-500 hover:text-[#7F00FF] dark:text-slate-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة البنرات الافتراضية لـ Nexen</span>
              </button>
            </div>

            {bannerList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400 text-xs">
                لا توجد بنرات مضافة حالياً. قم برفع صورة بنر أو استعد البنرات الافتراضية.
              </div>
            ) : (
              <div className="space-y-2.5">
                {bannerList.map((banner, index) => (
                  <div
                    key={banner.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      banner.isActive !== false
                        ? 'bg-white dark:bg-[#18112e] border-slate-200/90 dark:border-purple-900/40 shadow-xs'
                        : 'bg-slate-100/70 dark:bg-white/5 border-dashed border-slate-300 dark:border-white/10 opacity-60'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-11 sm:w-28 sm:h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-200 dark:border-white/10 shadow-xs">
                      <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {banner.title}
                        </span>
                        {banner.badgeText && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-[#7F00FF] dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 shrink-0">
                            {banner.badgeText}
                          </span>
                        )}
                      </div>
                      {banner.linkUrl ? (
                        <span className="text-[10px] text-slate-400 font-mono truncate block text-left" dir="ltr">
                          🔗 {banner.linkUrl}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 block">عرض بدون رابط</span>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        aria-label="Move Up"
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === bannerList.length - 1}
                        aria-label="Move Down"
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Active / Inactive Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(banner.id)}
                        aria-label="Toggle Visibility"
                        className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer ${
                          banner.isActive !== false
                            ? 'bg-purple-100 dark:bg-purple-950/80 text-[#7F00FF]'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                        }`}
                      >
                        {banner.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleEditClick(banner)}
                        className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-purple-50 hover:text-[#7F00FF] dark:hover:bg-purple-950 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        تعديل
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(banner.id)}
                        aria-label="Delete Banner"
                        className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-500 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-black/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
          >
            إغلاق
          </button>

          <button
            type="button"
            id="save-all-banners-btn"
            onClick={handleSaveAllAndClose}
            className="px-6 py-2.5 rounded-xl bg-[#7F00FF] hover:bg-[#6b00d6] text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-[#7F00FF]/30 cursor-pointer active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{savedSuccess ? 'تم الحفظ بنجاح!' : 'حفظ وتطبيق التغييرات'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
