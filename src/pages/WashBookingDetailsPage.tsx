import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Droplet, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { WashBooking } from '../types'
import Spinner from '../components/Spinner'

export default function WashBookingDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useAuthStore()
  const [booking, setBooking] = useState<WashBooking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchBooking() }, [id])

  const fetchBooking = async () => {
    if (!id) return
    const { data, error } = await supabase.from('wash_bookings')
      .select('*, cars(make,model,year,color,plate_number), car_wash_services(name_ar,description_ar,price,duration_minutes)')
      .eq('id', id).single()
    if (error) { addToast('خطأ في تحميل الحجز', 'error'); navigate('/'); return }
    setBooking(data)
    setLoading(false)
  }

  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    pending:     { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'قيد الانتظار' },
    confirmed:   { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'مؤكد' },
    in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'جاري التنفيذ' },
    completed:   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'مكتمل' },
    cancelled:   { bg: 'bg-red-100',    text: 'text-red-800',    label: 'ملغى' },
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (!booking) return null

  const car = booking.cars as any
  const service = booking.car_wash_services as any
  const s = statusMap[booking.status] || statusMap.pending

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-blue-600 font-medium mb-6">
          <ChevronLeft className="h-5 w-5" /> الرجوع
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Droplet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">حجز غسيل السيارة</h1>
                  <p className="text-blue-100 text-sm">#{booking.booking_number}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {booking.status === 'pending' && (
              <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div><p className="font-semibold">ينتظر التأكيد</p><p className="text-sm">سيتم تأكيد حجزك قريباً</p></div>
              </div>
            )}
            {booking.status === 'completed' && (
              <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div><p className="font-semibold">شكراً لك!</p><p className="text-sm">تم إكمال خدمة الغسيل بنجاح</p></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">السيارة</h3>
                <p className="font-semibold">{car?.make} {car?.model}</p>
                <p className="text-sm text-gray-500">{car?.year} - {car?.color}</p>
                <p className="text-sm text-gray-500">{car?.plate_number}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">الخدمة</h3>
                <p className="font-semibold">{service?.name_ar}</p>
                <p className="text-sm text-gray-500">{service?.description_ar}</p>
                <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" /> {service?.duration_minutes} دقيقة
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-4 bg-blue-50 rounded-lg p-4">
                <Calendar className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-semibold">{booking.slot_date}</p>
                  <p className="text-sm text-gray-500">الساعة {booking.slot_time}</p>
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="border-t pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">ملاحظات</h3>
                <p className="text-gray-700">{booking.notes}</p>
              </div>
            )}

            <div className="border-t pt-4 flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
              <span className="font-semibold text-gray-900">المبلغ الإجمالي</span>
              <span className="text-2xl font-bold text-blue-600">{booking.price.toFixed(2)} ر.س</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
