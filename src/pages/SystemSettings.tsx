import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, DollarSign, Settings as SettingsIcon,
  MessageSquare, Clock, Globe, MapPin, Shield, Bell,
  Zap, CheckCircle, AlertCircle,
  // ✅ إصلاح: إضافة Calendar الناقصة
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';

interface SystemSetting {
  key: string;
  value: any;
  description: string;
  updated_at: string;
}

export default function SystemSettings() {
  const { profile, language, addToast } = useAuthStore();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchSettings();
  }, [profile]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('*').order('key');
      if (error) throw error;
      setSettings(data || []);
      const initial: Record<string, any> = {};
      data?.forEach((s) => { initial[s.key] = s.value; });
      setEditedValues(initial);
      setHasChanges(false);
    } catch {
      addToast(language === 'ar' ? 'خطأ في تحميل الإعدادات' : 'Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key in editedValues) {
        await supabase.from('system_settings')
          .update({ value: editedValues[key], updated_at: new Date().toISOString() })
          .eq('key', key);
      }
      addToast(language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved', 'success');
      setHasChanges(false);
      fetchSettings();
    } catch {
      addToast(language === 'ar' ? 'خطأ في الحفظ' : 'Save error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (key: string, value: any) => {
    setEditedValues({ ...editedValues, [key]: value });
    setHasChanges(true);
  };

  const getSettingConfig = (key: string) => {
    const configs: Record<string, { ar: string; en: string; icon: any; category: string }> = {
      mobile_wash_price: { ar: 'سعر الغسيل المتنقل', en: 'Mobile Wash Price', icon: DollarSign, category: 'pricing' },
      asap_wait_minutes: { ar: 'وقت الانتظار الفوري', en: 'ASAP Wait Time', icon: Clock, category: 'service' },
      max_advance_booking_days: { ar: 'أقصى مدة حجز مسبق', en: 'Max Advance Booking', icon: Calendar, category: 'service' },
      service_zone_radius_km: { ar: 'نطاق الخدمة (كم)', en: 'Service Zone Radius', icon: MapPin, category: 'service' },
      default_language: { ar: 'اللغة الافتراضية', en: 'Default Language', icon: Globe, category: 'general' },
      maintenance_mode: { ar: 'وضع الصيانة', en: 'Maintenance Mode', icon: Shield, category: 'general' },
      contact_info: { ar: 'معلومات الاتصال', en: 'Contact Information', icon: MessageSquare, category: 'general' },
      working_hours: { ar: 'ساعات العمل', en: 'Working Hours', icon: Clock, category: 'general' },
    };
    return configs[key] || { ar: key, en: key, icon: SettingsIcon, category: 'general' };
  };

  const renderInput = (setting: SystemSetting) => {
    const value = editedValues[setting.key];
    if (typeof value === 'boolean') {
      return (
        <div className="flex gap-3">
          {[true, false].map((v) => (
            <button key={String(v)} onClick={() => handleValueChange(setting.key, v)}
              className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                value === v
                  ? v ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 text-gray-500 hover:border-gray-400'
              }`}>
              {v ? <><CheckCircle className="h-4 w-4" />{language === 'ar' ? 'مفعّل' : 'Enabled'}</>
                 : <><AlertCircle className="h-4 w-4" />{language === 'ar' ? 'معطّل' : 'Disabled'}</>}
            </button>
          ))}
        </div>
      );
    }
    if (typeof value === 'number') {
      return (
        <input type="number" step="0.01" min="0" value={value}
          onChange={(e) => handleValueChange(setting.key, parseFloat(e.target.value) || 0)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      );
    }
    if (typeof value === 'object') {
      return (
        <textarea value={JSON.stringify(value, null, 2)}
          onChange={(e) => { try { handleValueChange(setting.key, JSON.parse(e.target.value)); } catch {} }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none" rows={5} />
      );
    }
    return (
      <input type="text" value={value || ''} onChange={(e) => handleValueChange(setting.key, e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  const categories = {
    pricing: settings.filter((s) => getSettingConfig(s.key).category === 'pricing'),
    service: settings.filter((s) => getSettingConfig(s.key).category === 'service'),
    general: settings.filter((s) => getSettingConfig(s.key).category === 'general'),
  };

  const categoryTitles = {
    pricing: { label: language === 'ar' ? 'إعدادات الأسعار' : 'Pricing', icon: DollarSign, color: 'from-green-500 to-green-600' },
    service: { label: language === 'ar' ? 'إعدادات الخدمة' : 'Service', icon: Zap, color: 'from-orange-500 to-orange-600' },
    general: { label: language === 'ar' ? 'الإعدادات العامة' : 'General', icon: SettingsIcon, color: 'from-blue-500 to-blue-600' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
              </h1>
              <p className="text-xs text-gray-500">{settings.length} {language === 'ar' ? 'إعداد' : 'settings'}</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            {language === 'ar' ? 'حفظ' : 'Save'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {(Object.keys(categories) as Array<keyof typeof categories>).map((cat) => {
          const items = categories[cat];
          if (!items.length) return null;
          const title = categoryTitles[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${title.color} rounded-xl flex items-center justify-center`}>
                  <title.icon className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{title.label}</h2>
              </div>
              <div className="space-y-4">
                {items.map((setting) => {
                  const config = getSettingConfig(setting.key);
                  return (
                    <div key={setting.key} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                      <label className="block text-sm font-bold text-gray-900 mb-1">
                        {language === 'ar' ? config.ar : config.en}
                      </label>
                      {setting.description && (
                        <p className="text-xs text-gray-500 mb-3">{setting.description}</p>
                      )}
                      {renderInput(setting)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* حالة SMS */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {language === 'ar' ? 'حالة الإشعارات' : 'Notifications Status'}
            </h2>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{language === 'ar' ? 'حالة الربط' : 'Integration Status'}</p>
                  <p className="text-sm text-green-700">SMS {language === 'ar' ? 'متصل' : 'Connected'}</p>
                </div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-orange-500 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {language === 'ar' ? 'لديك تغييرات غير محفوظة' : 'Unsaved changes'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
