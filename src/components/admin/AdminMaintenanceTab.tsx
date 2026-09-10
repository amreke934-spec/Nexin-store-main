import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  Calendar,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  RefreshCw,
  Power
} from 'lucide-react';
import { MaintenanceSettings } from '../../types';
import { DEFAULT_MAINTENANCE_SETTINGS } from '../../utils/adminUtils';
import { fetchStoreSetting, saveStoreSetting } from '../../services/dbApi';
import { MaintenanceScreen } from '../MaintenanceScreen';

interface AdminMaintenanceTabProps {
  onSettingsUpdated?: (settings: MaintenanceSettings) => void;
}

export const AdminMaintenanceTab: React.FC<AdminMaintenanceTabProps> = ({ onSettingsUpdated }) => {
  const [settings, setSettings] = useState<MaintenanceSettings>(DEFAULT_MAINTENANCE_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(false);

  // Load existing settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchStoreSetting<MaintenanceSettings>('site_maintenance', DEFAULT_MAINTENANCE_SETTINGS);
      if (data) {
        setSettings(data);
      }
    } catch (err: any) {
      console.error('Failed to load maintenance settings:', err);
      setErrorMessage('تعذر جلب إعدادات الصيانة من الخادم.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);
    try {
      const saved = await saveStoreSetting('site_maintenance', settings);
      if (saved) {
        setSaveSuccess(true);
        onSettingsUpdated?.(settings);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage('حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة ثانية.');
      }
    } catch (err: any) {
      console.error('Failed to save maintenance settings:', err);
      setErrorMessage('فشل الاتصال بالخادم لحفظ الإعدادات.');
    } finally {
      setIsSaving(false);
    }
  };

  // Preset time helpers (e.g. +1h, +4h, +24h)
  const applyTimePreset = (hoursToAdd: number) => {
    const target = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    // Format to YYYY-MM-DDTHH:mm for datetime-local
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = target.getFullYear();
    const mm = pad(target.getMonth() + 1);
    const dd = pad(target.getDate());
    const hh = pad(target.getHours());
    const min = pad(target.getMinutes());
    const formatted = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

    setSettings(prev => ({
      ...prev,
      estimatedEndTime: formatted
    }));
  };

  const clearEndTime = () => {
    setSettings(prev => ({
      ...prev,
      estimatedEndTime: null
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#7F00FF]" />
        <span className="text-sm font-medium">جاري تحميل إعدادات وضع الصيانة...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Banner & Info */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 via-slate-900 to-indigo-950/50 border border-purple-800/40 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
                <Wrench className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black">إدارة وضع الصيانة والتحديثات</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              تحكم بوضع إغلاق المتجر المؤقت مع عداد تنازلي للعودة وقفل العمليات للزوار، بينما يظل حساب الأدمن يعمل بكامل الصلاحيات.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setShowLivePreview(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white transition-all cursor-pointer border border-white/10"
              title="معاينة شاشة الصيانة كما يراها الزوار"
            >
              <Eye className="w-4 h-4 text-purple-300" />
              <span>معاينة الشاشة</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Success and Error Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>تم حفظ وتحديث إعدادات وضع الصيانة بنجاح! التغييرات سارية فوراً على الزوار.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3. Main Toggle Card */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        settings.isEnabled
          ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-950/20 shadow-lg shadow-amber-500/5'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Power className={`w-5 h-5 ${settings.isEnabled ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                حالة وضع الصيانة العامة
              </h3>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                settings.isEnabled
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                {settings.isEnabled ? 'مفعّل حالياً' : 'معطّل (الموقع متاح للجميع)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              عند التفعيل: يستطيع الزوار والمستخدمون تسجيل الدخول والوصول، ولكن يتم قفل البار السفلي وجميع الإجراءات وعرض شاشة الصيانة والعداد التنازلي، مع بقاء حساب الأدمن متصلاً بكامل الصلاحيات.
            </p>
          </div>

          <button
            type="button"
            id="admin-maintenance-toggle-btn"
            onClick={() => setSettings(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.isEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.isEnabled ? '-translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. Details Form */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#7F00FF]" />
          <span>تخصيص محتوى شاشة الصيانة</span>
        </h3>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            عنوان الشاشة الرئيسي
          </label>
          <input
            type="text"
            value={settings.title || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
            placeholder="مثال: الموقع قيد الصيانة والتطوير حالياً"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#7F00FF]"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            رسالة وتفاصيل الصيانة للمستخدمين
          </label>
          <textarea
            rows={4}
            value={settings.message || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, message: e.target.value }))}
            placeholder="اكتب هنا الرسالة التوضيحية للمستخدمين وأسباب الصيانة وموعد العودة المتوقع..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#7F00FF]"
          />
        </div>

        {/* Countdown Timer Configuration */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>موعد العودة للعمل المتوقع (العداد التنازلي)</span>
            </label>
            {settings.estimatedEndTime && (
              <button
                type="button"
                onClick={clearEndTime}
                className="text-[11px] text-rose-500 hover:text-rose-400 font-bold cursor-pointer underline"
              >
                إلغاء التوقيت (بدون عداد)
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="datetime-local"
              value={settings.estimatedEndTime || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, estimatedEndTime: e.target.value || null }))}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#7F00FF] font-mono"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium ml-1">تعيين سريع:</span>
            {[
              { label: '+30 دقيقة', hours: 0.5 },
              { label: '+ساعة واحدة', hours: 1 },
              { label: '+ساعتين', hours: 2 },
              { label: '+4 ساعات', hours: 4 },
              { label: '+12 ساعة', hours: 12 },
              { label: '+24 ساعة', hours: 24 },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyTimePreset(preset.hours)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-slate-700 dark:text-slate-300 hover:text-[#7F00FF] dark:hover:text-purple-300 text-[11px] font-bold transition-all cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Support Links */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            روابط المساعدة والدعم الفني السريع (اختياري)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-emerald-500" />
              <input
                type="text"
                value={settings.whatsappNumber || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                placeholder="رقم الواتساب (مع رمز الدولة)"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#7F00FF] text-left"
                dir="ltr"
              />
            </div>
            <div className="relative">
              <Send className="w-4 h-4 absolute left-3 top-3 text-sky-500" />
              <input
                type="text"
                value={settings.telegramUsername || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, telegramUsername: e.target.value }))}
                placeholder="معرّف أو رابط تيليجرام"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#7F00FF] text-left"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Save Button Actions */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#7F00FF]" />
          <span>حسابات الأدمن تستثنى تلقائياً وتتمتع بالوصول الكامل دائماً.</span>
        </div>

        <button
          type="button"
          id="save-maintenance-settings-btn"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7F00FF] to-indigo-600 hover:brightness-110 active:scale-98 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#7F00FF]/30 cursor-pointer disabled:opacity-60"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ إعدادات الصيانة'}</span>
        </button>
      </div>

      {/* 6. Live Preview Modal */}
      {showLivePreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex flex-col items-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden my-auto flex flex-col">
            <div className="p-3.5 sm:p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="text-xs sm:text-sm font-bold">معاينة مباشرة: شكل الشاشة كما يراها الزوار</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLivePreview(false)}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh]">
              <MaintenanceScreen
                settings={{
                  ...settings,
                  isEnabled: true
                }}
                currentUser={null}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
