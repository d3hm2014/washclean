import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { t } from '../lib/translations';
import type { Car } from '../types';
import Spinner from '../components/Spinner';

interface CarFormModalProps {
  car?: Car | null;
  onClose: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function CarFormModal({ car, onClose }: CarFormModalProps) {
  const { language, profile, addToast } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    make: car?.make || '',
    model: car?.model || '',
    year: car?.year?.toString() || CURRENT_YEAR.toString(),
    color: car?.color || '',
    plate_number: car?.plate_number || '',
  });

  const isEdit = !!car;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);

    const payload = {
      make: form.make.trim(),
      model: form.model.trim(),
      year: parseInt(form.year),
      color: form.color.trim(),
      plate_number: form.plate_number.trim(),
      user_id: profile.id,
    };

    if (isEdit) {
      const { error } = await supabase.from('cars').update(payload).eq('id', car.id);
      if (error) {
        addToast(error.message, 'error');
        setLoading(false);
        return;
      }
      addToast(language === 'ar' ? 'تم تحديث السيارة' : 'Car updated', 'success');
    } else {
      const { error } = await supabase.from('cars').insert({ ...payload, is_default: false });
      if (error) {
        addToast(error.message, 'error');
        setLoading(false);
        return;
      }
      addToast(language === 'ar' ? 'تمت إضافة السيارة' : 'Car added', 'success');
    }

    setLoading(false);
    onClose();
  };

  const inp = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit
              ? language === 'ar' ? 'تعديل السيارة' : 'Edit Car'
              : t('cars.add', language)}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('cars.make', language)} *
              </label>
              <input
                required
                className={inp}
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder={t('cars.make.placeholder', language)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('cars.model', language)} *
              </label>
              <input
                required
                className={inp}
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder={t('cars.model.placeholder', language)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('cars.year', language)} *
              </label>
              <input
                required
                type="number"
                min="1990"
                max={CURRENT_YEAR + 1}
                className={inp}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder={t('cars.year.placeholder', language)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('cars.color', language)} *
              </label>
              <input
                required
                className={inp}
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder={t('cars.color.placeholder', language)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('cars.plate', language)} *
            </label>
            <input
              required
              className={inp}
              value={form.plate_number}
              onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
              placeholder={t('cars.plate.placeholder', language)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Spinner size="sm" /> : t('cars.save', language)}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              {t('cars.cancel', language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
