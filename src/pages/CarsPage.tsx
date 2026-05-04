import { useEffect, useState } from 'react'
import { Car, Plus, Star, Trash2, Edit3, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { t, formatNumber } from '../lib/translations'
import type { Car as CarType } from '../types'
import Spinner from '../components/Spinner'
import CarFormModal from './CarFormModal'

export default function CarsPage() {
  const { language, profile, addToast } = useAuthStore()
  const [cars, setCars] = useState<CarType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCar, setEditingCar] = useState<CarType | null>(null)

  const fetchCars = async () => {
    if (!profile) return
    const { data } = await supabase.from('cars').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
    setCars(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCars() }, [profile])

  const handleSetDefault = async (carId: string) => {
    if (!profile) return
    await supabase.from('cars').update({ is_default: false }).eq('user_id', profile.id)
    await supabase.from('cars').update({ is_default: true }).eq('id', carId)
    fetchCars()
  }

  const handleDelete = async (carId: string) => {
    if (!confirm(t('cars.confirm_delete', language))) return
    const { error } = await supabase.from('cars').delete().eq('id', carId)
    if (error) { addToast(error.message, 'error'); return }
    fetchCars()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('cars.title', language)}</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm">
          <Plus className="h-4 w-4" /> {t('cars.add', language)}
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Car className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">{t('cars.no_cars', language)}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('cars.add_first', language)}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('cars.add', language)}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cars.map((car) => (
            <div key={car.id} className="card flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                <Car className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{car.make} {car.model}</p>
                  {car.is_default && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium shrink-0">
                      <Star className="h-3 w-3 fill-current" /> {t('cars.default', language)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{car.color} - {formatNumber(car.year, language)} - {car.plate_number}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!car.is_default && (
                  <button onClick={() => handleSetDefault(car.id)} className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => { setEditingCar(car); setShowForm(true) }} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(car.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CarFormModal car={editingCar} onClose={() => { setShowForm(false); setEditingCar(null); fetchCars() }} />
      )}
    </div>
  )
}
