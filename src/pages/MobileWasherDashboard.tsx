import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, MapPin, Clock, CheckCircle2, Navigation, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { Booking } from '../types'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import { sendSMS, formatBookingStatusMessage } from '../lib/sms'

export default function MobileWasherDashboard() {
  const navigate = useNavigate()
  const { session, profile, addToast } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [locationStatus, setLocationStatus] = useState<'broadcasting' | 'error' | 'idle'>('idle')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const teamIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (profile?.role !== 'mobile_team' && profile?.role !== 'admin') { navigate('/'); return }
    fetchTeamAndBookings()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [profile])

  // ابدأ بث الموقع بعد ما نعرف teamId
  useEffect(() => {
    if (!teamId) return
    teamIdRef.current = teamId
    broadcastLocation() // ابعث فوراً عند الدخول
    intervalRef.current = setInterval(broadcastLocation, 5 * 60 * 1000) // كل 5 دقائق
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [teamId])

  const broadcastLocation = () => {
    if (!teamIdRef.current) return
    if (!navigator.geolocation) { setLocationStatus('error'); return }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const { error } = await supabase
          .from('mobile_teams')
          .update({
            current_lat: latitude,
            current_lng: longitude,
            location_updated_at: new Date().toISOString(),
          })
          .eq('id', teamIdRef.current!)

        if (!error) {
          setLocationStatus('broadcasting')
          setLastUpdate(new Date())
        } else {
          setLocationStatus('error')
        }
      },
      () => setLocationStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const fetchTeamAndBookings = async () => {
    if (!session?.user?.id) return
    const { data: teamData } = await supabase
      .from('mobile_teams').select('id').eq('user_id', session.user.id).single()
    if (teamData) {
      setTeamId(teamData.id)
      fetchBookings(teamData.id)
    } else {
      setLoading(false)
      addToast('لم يتم العثور على فريق مرتبط بحسابك', 'error')
    }
  }

  const fetchBookings = async (tid: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, cars(make,model,year,color,plate_number), profiles!bookings_user_id_fkey(name,phone)')
      .eq('mobile_team_id', tid)
      .in('status', ['assigned', 'in_progress'])
      .order('scheduled_time', { ascending: true })
    if (error) { addToast('خطأ في تحميل الطلبات', 'error'); setLoading(false); return }
    setBookings(data || [])
    setLoading(false)
  }

  const updateStatus = async (bookingId: string, newStatus: string) => {
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    const booking = bookings.find((b) => b.id === bookingId)
    if (booking) {
      const customer = booking.profiles as any
      if (customer?.phone) {
        await sendSMS({
          phone: customer.phone,
          message: formatBookingStatusMessage(customer.name || 'عزيزي العميل', newStatus, 'غسيل السيارة المتنقل'),
        })
      }
    }
    addToast('تم تحديث الحالة', 'success')
    if (teamId) fetchBookings(teamId)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">طلبات الغسيل</h1>
            <p className="text-gray-500 text-sm">الطلبات المعينة لك</p>
          </div>

          {/* مؤشر بث الموقع */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
            locationStatus === 'broadcasting'
              ? 'bg-emerald-100 text-emerald-700'
              : locationStatus === 'error'
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {locationStatus === 'broadcasting'
              ? <><Wifi className="h-4 w-4" /> موقعك مباث</>
              : locationStatus === 'error'
              ? <><WifiOff className="h-4 w-4" /> تعذر الموقع</>
              : <><MapPin className="h-4 w-4" /> جاري تحديد الموقع...</>
            }
          </div>
        </div>

        {/* آخر تحديث */}
        {lastUpdate && (
          <p className="text-xs text-gray-400 mb-4 text-left">
            آخر تحديث للموقع: {lastUpdate.toLocaleTimeString('ar-SA')} · يتجدد كل 5 دقائق
          </p>
        )}

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد طلبات حالياً</h3>
            <p className="text-gray-500 text-sm">سيتم إشعارك عند وجود طلبات جديدة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const car = booking.cars as any
              const customer = booking.profiles as any
              return (
                <div key={booking.id} className="bg-white rounded-2xl shadow p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-mono text-gray-400 mb-1">{booking.booking_number}</p>
                      <h3 className="text-lg font-bold text-gray-900">{car?.make} {car?.model}</h3>
                      <p className="text-sm text-gray-500">{car?.year} - {car?.color} - {car?.plate_number}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="space-y-2 mb-4">
                    {booking.location_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{booking.location_address}</p>
                          <button
                            onClick={() => window.open(`https://www.google.com/maps?q=${booking.location_lat},${booking.location_lng}`, '_blank')}
                            className="text-xs text-blue-600 flex items-center gap-1 mt-1"
                          >
                            <Navigation className="h-3 w-3" /> فتح الخريطة
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <p className="text-sm text-gray-700">{new Date(booking.scheduled_time).toLocaleString('ar-SA')}</p>
                    </div>
                    {customer?.phone && (
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-blue-500" />
                        <p className="text-sm text-gray-700">{customer.phone}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 mb-3 flex justify-between">
                    <span className="text-sm text-gray-500">السعر</span>
                    <span className="font-bold text-emerald-600">{booking.price.toFixed(2)} ر.س</span>
                  </div>

                  <div className="flex gap-2">
                    {booking.status === 'assigned' && (
                      <button
                        onClick={() => updateStatus(booking.id, 'in_progress')}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        <Clock className="h-4 w-4" /> بدء العمل
                      </button>
                    )}
                    {booking.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(booking.id, 'completed')}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" /> إنهاء الخدمة
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                      className="flex-1 btn-secondary"
                    >
                      التفاصيل
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}