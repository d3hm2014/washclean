import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, ArrowLeft, Save, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import Spinner from '../components/Spinner'

interface Service {
  id: string; name_ar: string; name_en: string
  description_ar: string; description_en: string
  price: number; duration_minutes: number; is_active: boolean; created_at: string
}

const emptyForm = { name_ar: '', name_en: '', description_ar: '', description_en: '', price: '', duration_minutes: '' }

export default function ServicesManagement() {
  const { profile, language } = useAuthStore()
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { navigate('/'); return }
    fetchServices()
  }, [profile])

  const fetchServices = async () => {
    const { data } = await supabase.from('car_wash_services').select('*').order('created_at', { ascending: false })
    setServices(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { name_ar: form.name_ar, name_en: form.name_en, description_ar: form.description_ar, description_en: form.description_en, price: parseFloat(form.price), duration_minutes: parseInt(form.duration_minutes), is_active: true }
    if (editing) { await supabase.from('car_wash_services').update(payload).eq('id', editing.id) }
    else { await supabase.from('car_wash_services').insert([payload]) }
    setShowModal(false); setEditing(null); setForm(emptyForm); fetchServices()
  }

  const handleEdit = (s: Service) => {
    setEditing(s)
    setForm({ name_ar: s.name_ar, name_en: s.name_en, description_ar: s.description_ar || '', description_en: s.description_en || '', price: s.price.toString(), duration_minutes: s.duration_minutes.toString() })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'ar' ? 'حذف هذه الخدمة؟' : 'Delete this service?')) return
    await supabase.from('car_wash_services').delete().eq('id', id)
    fetchServices()
  }

  const toggleActive = async (s: Service) => {
    await supabase.from('car_wash_services').update({ is_active: !s.is_active }).eq('id', s.id)
    fetchServices()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>

  return (
    <div className="p-4 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {language === 'ar' ? 'إدارة خدمات المغسلة' : 'Car Wash Services'}
          </h1>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> {language === 'ar' ? 'خدمة جديدة' : 'New Service'}
        </button>
      </div>

      <div className="grid gap-4">
        {services.map((s) => (
          <div key={s.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">{language === 'ar' ? s.name_ar : s.name_en}</h3>
                  <button onClick={() => toggleActive(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? (language === 'ar' ? 'مفعل' : 'Active') : (language === 'ar' ? 'معطل' : 'Inactive')}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-2">{language === 'ar' ? s.description_ar : s.description_en}</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-600 font-bold">{s.price} {language === 'ar' ? 'ريال' : 'SAR'}</span>
                  <span className="text-gray-500">{s.duration_minutes} {language === 'ar' ? 'دقيقة' : 'min'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {services.length === 0 && <div className="text-center py-12 text-gray-400">{language === 'ar' ? 'لا توجد خدمات بعد' : 'No services yet'}</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? (language === 'ar' ? 'تعديل الخدمة' : 'Edit Service') : (language === 'ar' ? 'خدمة جديدة' : 'New Service')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[['name_ar', 'الاسم بالعربي', 'غسيل خارجي'], ['name_en', 'الاسم بالإنجليزي', 'Exterior Wash']].map(([key, label, ph]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input required type="text" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder={ph} />
                  </div>
                ))}
                {[['description_ar', 'الوصف بالعربي'], ['description_en', 'الوصف بالإنجليزي']].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <textarea value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" rows={2} />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'السعر (ريال)' : 'Price (SAR)'}</label>
                  <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'المدة (دقيقة)' : 'Duration (min)'}</label>
                  <input required type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium">
                  <Save className="h-4 w-4" /> {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
