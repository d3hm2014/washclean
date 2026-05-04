import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Phone, Car as CarIcon, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { CarWashService } from '../types'
import Spinner from '../components/Spinner'

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }

export default function WalkInBookingModal({ isOpen, onClose, onSuccess }: Props) {
  const { addToast, session } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<CarWashService[]>([])
  const [step, setStep] = useState<'info' | 'slot'>('info')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'evening'>('morning')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) { fetchServices(); setSelectedDate(new Date().toISOString().split('T')[0]) }
  }, [isOpen])

  useEffect(() => { if (selectedDate) generateSlots(selectedDate, selectedPeriod) }, [selectedDate, selectedPeriod])

  const fetchServices = async () => {
    const { data } = await supabase.from('car_wash_services').select('*').eq('is_active', true).order('price')
    setServices(data || [])
  }

  const generateSlots = async (date: string, period: 'morning' | 'evening') => {
    const slots: string[] = []
    const startH = period === 'morning' ? 9 : 16
    const endH = period === 'morning' ? 12 : 23
    for (let h = startH; h <= endH; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === endH && m > 0) break
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
      }
    }
    const { data: booked } = await supabase.from('wash_bookings').select('slot_time').eq('slot_date', date).in('status', ['pending', 'confirmed', 'in_progress'])
    const bookedTimes = booked?.map((b) => b.slot_time) || []
    setAvailableSlots(slots.filter((s) => !bookedTimes.includes(s)))
  }

  const handleSubmit = async () => {
    if (!phoneNumber || !plateNumber || !selectedService || !selectedDate || !selectedTime) {
      addToast('الرجاء ملء جميع الحقول', 'error'); return
    }
    setLoading(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) { addToast('يجب تسجيل الدخول أولاً', 'error'); return }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, name: `عميل ${phoneNumber.slice(-4)}` }),
      })
      if (!response.ok) { const err = await response.json(); addToast(err.error || 'خطأ في إنشاء حساب العميل', 'error'); return }
      const { userId } = await response.json()

      const { data: existingCar } = await supabase.from('cars').select('id').eq('plate_number', plateNumber).eq('user_id', userId).maybeSingle()
      let carId = existingCar?.id
      if (!carId) {
        const { data: newCar } = await supabase.from('cars').insert({ user_id: userId, plate_number: plateNumber, make: 'غير محدد', model: 'غير محدد', year: new Date().getFullYear(), color: 'غير محدد', is_default: true }).select().single()
        carId = newCar?.id
      }
      if (!carId) { addToast('خطأ في إضافة السيارة', 'error'); return }

      const service = services.find((s) => s.id === selectedService)
      if (!service) { addToast('خدمة غير موجودة', 'error'); return }

      await supabase.from('wash_bookings').insert({
        booking_number: `WB-${Date.now()}`, user_id: userId, car_id: carId,
        service_id: selectedService, slot_id: `${selectedDate}-${selectedTime}`,
        slot_date: selectedDate, slot_time: selectedTime, price: service.price,
        status: 'confirmed', payment_status: 'paid', payment_method: 'cash',
        notes: `حجز مباشر من قبل الموظف`,
      })

      addToast('تم إنشاء الحجز بنجاح', 'success')
      onSuccess()
      handleClose()
    } catch { addToast('حدث خطأ غير متوقع', 'error') }
    finally { setLoading(false) }
  }

  const handleClose = () => { setPhoneNumber(''); setPlateNumber(''); setSelectedService(''); setSelectedDate(''); setSelectedTime(''); setStep('info'); onClose() }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">حجز للعميل</h2>
            <p className="text-sm text-gray-500">إنشاء حجز مباشر لعميل حضر للمغسلة</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'info' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="inline h-4 w-4 ml-1" />رقم جوال العميل</label>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="05xxxxxxxx" className="input-field" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><CarIcon className="inline h-4 w-4 ml-1" />رقم لوحة السيارة</label>
                <input type="text" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="أ ب ت ١٢٣٤" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الخدمة</label>
                <div className="space-y-2">
                  {services.map((s) => (
                    <label key={s.id} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedService === s.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                      <input type="radio" name="service" value={s.id} checked={selectedService === s.id} onChange={(e) => setSelectedService(e.target.value)} className="hidden" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{s.name_ar}</p>
                        <p className="text-xs text-gray-500">{s.duration_minutes} دقيقة</p>
                      </div>
                      <span className="font-bold text-blue-600 text-sm">{s.price.toFixed(2)} ر.س</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={() => setStep('slot')} disabled={!phoneNumber || !plateNumber || !selectedService} className="btn-primary w-full">التالي - اختيار الموعد</button>
            </>
          )}

          {step === 'slot' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><Calendar className="inline h-4 w-4 ml-1" />التاريخ</label>
                <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime('') }} min={new Date().toISOString().split('T')[0]} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الفترة</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['morning', 'evening'] as const).map((p) => (
                    <button key={p} type="button" onClick={() => { setSelectedPeriod(p); setSelectedTime('') }}
                      className={`p-3 border-2 rounded-lg font-medium transition-all ${selectedPeriod === p ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>
                      <div className="font-bold text-sm mb-0.5">{p === 'morning' ? 'صباحي' : 'مسائي'}</div>
                      <div className="text-xs">{p === 'morning' ? '9:00 ص - 12:00 م' : '4:00 م - 11:00 م'}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><Clock className="inline h-4 w-4 ml-1" />الوقت المتاح</label>
                {availableSlots.length === 0 ? (
                  <div className="flex gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> <p>لا توجد فترات متاحة. اختر فترة أخرى.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <label key={slot} className={`flex items-center justify-center p-2.5 border-2 rounded-lg cursor-pointer text-sm font-medium transition-all ${selectedTime === slot ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>
                        <input type="radio" name="time" value={slot} checked={selectedTime === slot} onChange={(e) => setSelectedTime(e.target.value)} className="hidden" />
                        {slot}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('info')} className="flex-1 btn-secondary">السابق</button>
                <button onClick={handleSubmit} disabled={!selectedTime || loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {loading ? <Spinner size="sm" /> : 'تأكيد الحجز'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
