import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Filter, MapPin, Car, Clock, User, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'

interface BookingRow {
  id: string
  booking_number: string
  status: string
  booking_type: string
  price: number
  eta_minutes: number | null
  created_at: string
  scheduled_time: string
  location_address: string | null
  customer_name: string | null
  customer_phone: string | null
  car_make: string | null
  car_model: string | null
  car_plate: string | null
  team_name: string | null
  driver_name: string | null
  team_available: boolean | null
}

const STATUS_COLORS: Record<string, string> = {
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
  pending:     'bg-gray-100 text-gray-600',
}

export default function AdminBookings() {
  const { profile, language, initialized } = useAuthStore()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!initialized) return
    if (!profile) { navigate("/"); return }
    if (profile.role !== "admin") { navigate("/"); return }
    fetchBookings()
  }, [profile, initialized])

  const fetchBookings = async () => {
    setRefreshing(true)
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_number, status, booking_type, price, eta_minutes,
        created_at, scheduled_time, location_address,
        profiles!bookings_user_id_fkey(name, phone),
        cars(make, model, plate_number),
        mobile_teams(team_name_ar, is_available, profiles(name))
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setBookings(data.map((b: any) => ({
        id: b.id,
        booking_number: b.booking_number,
        status: b.status,
        booking_type: b.booking_type,
        price: b.price,
        eta_minutes: b.eta_minutes,
        created_at: b.created_at,
        scheduled_time: b.scheduled_time,
        location_address: b.location_address,
        customer_name: b.profiles?.name || null,
        customer_phone: b.profiles?.phone || null,
        car_make: b.cars?.make || null,
        car_model: b.cars?.model || null,
        car_plate: b.cars?.plate_number || null,
        team_name: b.mobile_teams?.team_name_ar || null,
        driver_name: b.mobile_teams?.profiles?.name || null,
        team_available: b.mobile_teams?.is_available ?? null,
      })))
    }
    setLoading(false)
    setRefreshing(false)
  }

  const filtered = bookings.filter(b => {
    const matchSearch =
      b.booking_number?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_name?.includes(search) ||
      b.customer_phone?.includes(search) ||
      b.team_name?.includes(search) ||
      b.driver_name?.includes(search) ||
      b.car_plate?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    return matchSearch && matchStatus
  })

  const statuses = ['all', 'assigned', 'in_progress', 'completed', 'cancelled', 'pending']
  const statusLabels: Record<string, string> = {
    all: 'الكل', assigned: 'مُسند', in_progress: 'جاري',
    completed: 'مكتمل', cancelled: 'ملغي', pending: 'انتظار',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة الحجوزات</h1>
                <p className="text-xs text-gray-500">{filtered.length} حجز</p>
              </div>
            </div>
            <button onClick={fetchBookings} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث برقم الحجز، العميل، السائق، اللوحة..."
              className="w-full pr-9 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {statuses.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filterStatus === s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Filter className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد حجوزات مطابقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => (
              <div key={b.id}
                onClick={() => navigate(`/bookings/${b.id}`)}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer">

                {/* Top Row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-gray-900">{b.booking_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(b.created_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[b.status] || b.status}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">{b.price} ر.س</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {/* العميل والسيارة */}
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">العميل</p>
                      <p className="text-sm font-medium text-gray-900">{b.customer_name || b.customer_phone || '—'}</p>
                      {b.car_make && (
                        <p className="text-xs text-gray-400">{b.car_make} {b.car_model} · {b.car_plate}</p>
                      )}
                    </div>
                  </div>

                  {/* الفريق والسائق */}
                  <div className="flex items-start gap-2">
                    <Car className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">الفريق والسائق</p>
                      {b.team_name ? (
                        <>
                          <p className="text-sm font-medium text-gray-900">{b.team_name}</p>
                          <p className="text-xs text-gray-400">
                            {b.driver_name || 'بدون سائق'} ·
                            <span className={`mr-1 ${b.team_available ? 'text-emerald-500' : 'text-orange-500'}`}>
                              {b.team_available ? '● متاح' : '● مشغول'}
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">لم يُسند بعد</p>
                      )}
                    </div>
                  </div>

                  {/* الوقت والموقع */}
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">ETA / الموقع</p>
                      {b.eta_minutes && ['assigned', 'in_progress'].includes(b.status) ? (
                        <p className="text-sm font-bold text-emerald-600">{b.eta_minutes} دقيقة</p>
                      ) : (
                        <p className="text-sm text-gray-400">—</p>
                      )}
                      {b.location_address && (
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{b.location_address}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}