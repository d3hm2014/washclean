import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets, Droplet, Clock, Shield, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { t, formatPrice } from '../lib/translations'
import { supabase } from '../lib/supabase'
import type { Booking } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function HomePage() {
  const { language, profile } = useAuthStore()
  const navigate = useNavigate()
  const [recentBooking, setRecentBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase.from('bookings').select('*, cars(*), mobile_teams(*)')
      .eq('user_id', profile.id).order('created_at', { ascending: false })
      .limit(1).maybeSingle().then(({ data }) => { if (data) setRecentBooking(data) })
  }, [profile])

  const ArrowIcon = language === 'ar' ? ChevronLeft : ChevronRight

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <div className="pt-2">
        <p className="text-gray-500 text-sm">{t('home.greeting', language)}</p>
        <h1 className="text-2xl font-bold text-gray-900">
          {profile?.name || profile?.phone || (language === 'ar' ? 'زائر' : 'Guest')}
        </h1>
      </div>

      <div className="space-y-3">
        {profile?.role !== 'mobile_team' && profile?.role !== 'wash_center_staff' && (
          <>
            <button onClick={() => navigate('/book')}
              className="w-full relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 active:scale-[0.98] transition-transform">
              <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div className="text-start">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-6 w-6" />
                    <span className="text-xl font-bold">{t('home.cta', language)}</span>
                  </div>
                  <p className="text-emerald-100 text-sm mb-3">{t('home.cta.subtitle', language)}</p>
                  <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur rounded-full px-3 py-1 text-sm">
                    <span>{t('home.starting_from', language)}</span>
                    <span className="font-bold">{formatPrice(30, language)}</span>
                  </div>
                </div>
                <ArrowIcon className="h-8 w-8 text-white/60 shrink-0" />
              </div>
            </button>

            <button onClick={() => navigate('/wash-booking')}
              className="w-full relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform">
              <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div className="text-start">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="h-6 w-6" />
                    <span className="text-xl font-bold">{language === 'ar' ? 'حجز غسيل المقر' : 'Book Car Wash'}</span>
                  </div>
                  <p className="text-blue-100 text-sm mb-3">
                    {language === 'ar' ? 'احضر سيارتك للغسيل' : 'Bring your car to wash'}
                  </p>
                  <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur rounded-full px-3 py-1 text-sm">
                    <span>{t('home.starting_from', language)}</span>
                    <span className="font-bold">{formatPrice(25, language)}</span>
                  </div>
                </div>
                <ArrowIcon className="h-8 w-8 text-white/60 shrink-0" />
              </div>
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock, title: language === 'ar' ? 'سريع' : 'Fast', desc: language === 'ar' ? '٣٠ دقيقة' : '30 min' },
          { icon: Shield, title: language === 'ar' ? 'آمن' : 'Safe', desc: language === 'ar' ? 'فرق موثوقة' : 'Trusted teams' },
          { icon: Sparkles, title: language === 'ar' ? 'نظافة' : 'Clean', desc: language === 'ar' ? 'جودة عالية' : 'High quality' },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
            <f.icon className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">{f.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {recentBooking && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">{t('home.recent', language)}</h2>
            <button onClick={() => navigate('/bookings')} className="text-sm text-emerald-600 font-medium">
              {t('home.view_all', language)}
            </button>
          </div>
          <button onClick={() => navigate(`/bookings/${recentBooking.id}`)}
            className="w-full card text-start hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-mono text-gray-500">{recentBooking.booking_number}</span>
              <StatusBadge status={recentBooking.status} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {recentBooking.cars ? `${recentBooking.cars.make} ${recentBooking.cars.model}` : ''}
                </p>
                <p className="text-sm text-gray-500">{formatPrice(recentBooking.price, language)}</p>
              </div>
              <ArrowIcon className="h-5 w-5 text-gray-400" />
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
