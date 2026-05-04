import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Car, Clock, CheckCircle, ChevronLeft, ChevronRight, Zap, Calendar, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useBookingStore } from '../stores/bookingStore'
import { t, formatPrice, formatNumber } from '../lib/translations'
import type { Car as CarType } from '../types'
import Spinner from '../components/Spinner'
import LocationPicker from '../components/LocationPicker'

const RIYADH_LAT = 24.7136
const RIYADH_LNG = 46.6753

export default function BookingPage() {
  const { language, profile, addToast } = useAuthStore()
  const navigate = useNavigate()
  const { step, setStep, locationLat, locationLng, locationAddress, setLocation, carId, setCarId, isAsap, setIsAsap, scheduledTime, setScheduledTime, reset } = useBookingStore()

  const [cars, setCars] = useState<CarType[]>([])
  const [carsLoading, setCarsLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!profile) return
    supabase.from('cars').select('*').eq('user_id', profile.id).order('is_default', { ascending: false })
      .then(({ data }) => {
        setCars(data || [])
        setCarsLoading(false)
        if (data?.length && !carId) {
          const def = data.find((c) => c.is_default) || data[0]
          setCarId(def.id)
        }
      })
  }, [profile])

  useEffect(() => {
    if (locationLat) return
    detectLocation()
  }, [])

  const detectLocation = () => {
    setLocating(true)
    if (!navigator.geolocation) { setLocation(RIYADH_LAT, RIYADH_LNG, ''); setLocating(false); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const address = await reverseGeocode(lat, lng)
        setLocation(lat, lng, address)
        setLocating(false)
      },
      () => { setLocation(RIYADH_LAT, RIYADH_LNG, ''); setLocating(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${language}`)
      const data = await res.json()
      return data.display_name || ''
    } catch { return '' }
  }

  const handleConfirm = async () => {
    if (!profile || !carId || !locationLat || !locationLng) return
    setSubmitting(true)
    const { data, error } = await supabase.rpc('create_booking', {
      p_user_id: profile.id, p_car_id: carId,
      p_lat: locationLat, p_lng: locationLng, p_address: locationAddress,
      p_is_asap: isAsap, p_scheduled_time: isAsap ? null : scheduledTime,
    })
    setSubmitting(false)
    if (error) { addToast(t('booking.error', language), 'error'); return }
    const result = data as { success: boolean; error?: string; booking_id?: string }
    if (!result.success) {
      addToast(result.error === 'no_team_available' ? t('booking.no_team', language) : t('booking.error', language), 'error')
      return
    }
    addToast(t('booking.success', language), 'success')
    reset()
    navigate(`/bookings/${result.booking_id}`)
  }

  const canProceed = () => {
    if (step === 1) return locationLat !== null
    if (step === 2) return carId !== null
    if (step === 3) return isAsap || scheduledTime !== null
    return true
  }

  const selectedCar = cars.find((c) => c.id === carId)
  const BackIcon = language === 'ar' ? ChevronRight : ChevronLeft
  const getMinDateTime = () => { const d = new Date(); d.setHours(d.getHours() + 1); return d.toISOString().slice(0, 16) }

  const steps = [
    { icon: MapPin, label: t('booking.location', language) },
    { icon: Car, label: t('booking.select_car', language) },
    { icon: Clock, label: t('booking.schedule', language) },
    { icon: CheckCircle, label: t('booking.confirm', language) },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => { if (step === 1) { reset(); navigate('/') } else setStep(step - 1) }} className="p-2 rounded-xl hover:bg-gray-100">
              <BackIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="font-bold text-lg text-gray-900">{t('booking.title', language)}</h1>
          </div>
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${i + 1 <= step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                <p className={`text-[10px] mt-1 text-center font-medium ${i + 1 === step ? 'text-emerald-600' : 'text-gray-400'}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {locating ? (
              <div className="h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
                <div className="text-center"><Spinner size="lg" className="mb-3" /><p className="text-sm text-gray-500">{t('booking.detecting_location', language)}</p></div>
              </div>
            ) : locationLat && locationLng && (
              <>
                <LocationPicker lat={locationLat} lng={locationLng} onLocationChange={async (lat, lng) => { const addr = await reverseGeocode(lat, lng); setLocation(lat, lng, addr) }} />
                {locationAddress && (
                  <div className="card flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 leading-relaxed">{locationAddress}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 animate-fade-in">
            {carsLoading ? <Spinner size="lg" className="py-16" /> :
             cars.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">{t('booking.no_cars', language)}</p>
                <button onClick={() => navigate('/cars')} className="btn-primary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> {t('booking.add_car', language)}
                </button>
              </div>
            ) : cars.map((car) => (
              <button key={car.id} onClick={() => setCarId(car.id)}
                className={`w-full card flex items-center gap-4 text-start transition-all ${carId === car.id ? 'ring-2 ring-emerald-500 border-emerald-200 bg-emerald-50/50' : 'hover:border-gray-200'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${carId === car.id ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                  <Car className={`h-6 w-6 ${carId === car.id ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{car.make} {car.model}</p>
                  <p className="text-sm text-gray-500">{car.color} - {formatNumber(car.year, language)} - {car.plate_number}</p>
                </div>
                {carId === car.id && <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            {[{ icon: Zap, label: t('booking.asap', language), val: true }, { icon: Calendar, label: t('booking.scheduled', language), val: false }].map((opt) => (
              <button key={String(opt.val)} onClick={() => { setIsAsap(opt.val); if (opt.val) setScheduledTime(null) }}
                className={`w-full card flex items-center gap-4 text-start transition-all ${isAsap === opt.val ? 'ring-2 ring-emerald-500 border-emerald-200 bg-emerald-50/50' : ''}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isAsap === opt.val ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                  <opt.icon className={`h-6 w-6 ${isAsap === opt.val ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1"><p className="font-semibold text-gray-900">{opt.label}</p></div>
                {isAsap === opt.val && <CheckCircle className="h-5 w-5 text-emerald-500 ms-auto shrink-0" />}
              </button>
            ))}
            {!isAsap && (
              <div className="card animate-fade-in">
                <label className="block text-sm font-medium text-gray-600 mb-2">{t('booking.select_date', language)}</label>
                <input type="datetime-local" value={scheduledTime || ''} onChange={(e) => setScheduledTime(e.target.value)} min={getMinDateTime()} className="input-field" dir="ltr" />
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900">{t('booking.summary', language)}</h2>
            <div className="card space-y-4">
              {[
                [t('booking.type', language), t('booking.mobile_wash', language)],
                selectedCar ? [t('booking.car', language), `${selectedCar.make} ${selectedCar.model}`] : null,
                [t('booking.schedule', language), isAsap ? t('booking.asap', language) : new Date(scheduledTime!).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{val}</span>
                </div>
              ))}
              {locationAddress && (
                <div>
                  <span className="text-sm text-gray-500 block mb-1">{t('booking.location', language)}</span>
                  <p className="text-sm text-gray-700">{locationAddress}</p>
                </div>
              )}
              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <span className="font-semibold text-gray-900">{t('booking.price', language)}</span>
                <span className="text-2xl font-bold text-emerald-600">{formatPrice(30, language)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {step > 1 && <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1">{t('booking.back', language)}</button>}
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="btn-primary flex-1">{t('booking.next', language)}</button>
          ) : (
            <button onClick={handleConfirm} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <><Spinner size="sm" />{t('booking.confirming', language)}</> : t('booking.confirm_button', language)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
