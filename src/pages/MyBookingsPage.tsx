import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { t, formatPrice } from '../lib/translations'
import type { Booking } from '../types'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'

export default function MyBookingsPage() {
  const { language, profile } = useAuthStore()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'past'>('active')

  useEffect(() => {
    if (!profile) return
    supabase.from('bookings').select('*, cars(*), mobile_teams(*)')
      .eq('user_id', profile.id).order('created_at', { ascending: false })
      .then(({ data }) => { setBookings((data as Booking[]) || []); setLoading(false) })
  }, [profile])

  const activeStatuses = ['pending', 'confirmed', 'assigned', 'in_progress']
  const displayed = tab === 'active'
    ? bookings.filter((b) => activeStatuses.includes(b.status))
    : bookings.filter((b) => !activeStatuses.includes(b.status))

  const ArrowIcon = language === 'ar' ? ChevronLeft : ChevronRight

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">{t('bookings.title', language)}</h1>
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
        {(['active', 'past'] as const).map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === tabKey ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            {t(`bookings.${tabKey}`, language)}
          </button>
        ))}
      </div>
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="h-10 w-10 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-6">{t('bookings.no_bookings', language)}</p>
          <button onClick={() => navigate('/book')} className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('bookings.book_now', language)}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((booking) => (
            <button key={booking.id} onClick={() => navigate(`/bookings/${booking.id}`)}
              className="w-full card text-start hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-gray-500">{booking.booking_number}</span>
                <StatusBadge status={booking.status} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.cars ? `${booking.cars.make} ${booking.cars.model}` : t('booking.mobile_wash', language)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatPrice(booking.price, language)} - {new Date(booking.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium' })}
                  </p>
                </div>
                <ArrowIcon className="h-5 w-5 text-gray-400 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
