import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MapPin, Car, Clock, Users, Star, Camera, XCircle, Image, Navigation } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { t, formatPrice } from '../lib/translations'
import type { Booking, BookingPhoto, Review } from '../types'
import StatusBadge from '../components/StatusBadge'
import StarRating from '../components/StarRating'
import { sendSMS, formatBookingStatusMessage } from '../lib/sms'
import Spinner from '../components/Spinner'

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language, profile, addToast } = useAuthStore()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [photos, setPhotos] = useState<BookingPhoto[]>([])
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadType, setUploadType] = useState<'before' | 'after'>('before')

  const fetchData = async () => {
    if (!id) return
    const [bookingRes, photosRes, reviewRes] = await Promise.all([
      supabase.from('bookings').select('*, cars(*), mobile_teams(*)').eq('id', id).maybeSingle(),
      supabase.from('booking_photos').select('*').eq('booking_id', id).order('created_at'),
      supabase.from('reviews').select('*').eq('booking_id', id).maybeSingle(),
    ])
    if (bookingRes.data) setBooking(bookingRes.data as Booking)
    setPhotos((photosRes.data as BookingPhoto[]) || [])
    if (reviewRes.data) setReview(reviewRes.data as Review)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  // حساب العداد التنازلي لوقت الوصول
  useEffect(() => {
    if (!booking?.eta_minutes || !['assigned', 'in_progress'].includes(booking.status)) {
      setCountdown(null)
      return
    }
    const createdAt = new Date(booking.created_at).getTime()
    const etaMs = booking.eta_minutes * 60 * 1000
    const arrivalTime = createdAt + etaMs

    const tick = () => {
      const remaining = Math.max(0, Math.floor((arrivalTime - Date.now()) / 1000))
      setCountdown(remaining)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [booking?.eta_minutes, booking?.status, booking?.created_at])

  useEffect(() => {
    if (!id || !profile) return
    const channel = supabase.channel(`booking-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        (payload) => { setBooking((prev) => prev ? { ...prev, ...payload.new } : null); addToast(t('toast.status_changed', language), 'info') })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, profile])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !booking || !profile) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${booking.id}/${uploadType}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('booking-photos').upload(path, file)
      if (uploadError) { addToast(uploadError.message, 'error'); continue }
      const { data: { publicUrl } } = supabase.storage.from('booking-photos').getPublicUrl(path)
      await supabase.from('booking_photos').insert({ booking_id: booking.id, photo_url: publicUrl, photo_type: uploadType, uploaded_by: profile.id })
    }
    await fetchData()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmitReview = async () => {
    if (!booking || !profile || rating === 0) return
    setSubmittingReview(true)
    const { error } = await supabase.from('reviews').insert({ booking_id: booking.id, user_id: profile.id, mobile_team_id: booking.mobile_team_id, rating, comment: comment.trim() })
    if (error) { addToast(error.message, 'error'); setSubmittingReview(false); return }
    addToast(t('rating.submitted', language), 'success')
    await fetchData()
    setSubmittingReview(false)
  }

  const handleCancel = async () => {
    if (!booking || !confirm(t('details.cancel_confirm', language))) return
    setCancelling(true)
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
    if (booking.mobile_team_id) {
      await supabase.from('mobile_teams').update({ is_available: true }).eq('id', booking.mobile_team_id)
    }
    if (profile?.phone) {
      await sendSMS({ phone: profile.phone, message: formatBookingStatusMessage(profile.name || 'عزيزي العميل', 'cancelled', 'غسيل السيارة') })
    }
    addToast(t('details.cancelled', language), 'info')
    setCancelling(false)
    await fetchData()
  }

  // تنسيق العداد التنازلي
  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m} د ${s} ث`
    return `${s} ث`
  }

  const BackIcon = language === 'ar' ? ChevronRight : ChevronLeft
  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  if (!booking) return <div className="p-4 text-center py-16"><p className="text-gray-500">{t('common.error', language)}</p></div>

  const beforePhotos = photos.filter((p) => p.photo_type === 'before')
  const afterPhotos = photos.filter((p) => p.photo_type === 'after')
  const canUploadBefore = ['assigned', 'in_progress'].includes(booking.status)
  const canUploadAfter = booking.status === 'completed'
  const canReview = booking.status === 'completed' && !review
  const canCancel = ['assigned', 'pending', 'confirmed'].includes(booking.status)
  const showEta = booking.eta_minutes && ['assigned', 'in_progress'].includes(booking.status)

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/bookings')} className="p-2 rounded-xl hover:bg-gray-100">
          <BackIcon className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg text-gray-900">{t('details.title', language)}</h1>
      </div>

      {/* بطاقة وقت الوصول المتوقع */}
      {showEta && (
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="h-5 w-5" />
            <span className="font-semibold text-emerald-50">السائق في الطريق إليك</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-emerald-100 text-sm mb-1">الوقت المتوقع للوصول</p>
              {countdown !== null && countdown > 0 ? (
                <p className="text-4xl font-black tracking-tight">{formatCountdown(countdown)}</p>
              ) : countdown === 0 ? (
                <p className="text-2xl font-bold">وصل السائق 🎉</p>
              ) : (
                <p className="text-3xl font-black">{booking.eta_minutes} دقيقة</p>
              )}
            </div>
            <div className="text-left text-emerald-100 text-sm">
              <p>المسافة تقريباً</p>
              <p className="text-white font-bold text-lg">
                {((booking.eta_minutes - 10) / 3).toFixed(1)} كم
              </p>
            </div>
          </div>
          {booking.mobile_teams && (
            <div className="mt-4 pt-4 border-t border-emerald-400/40 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {(booking.mobile_teams.team_name_ar || booking.mobile_teams.team_name)?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {language === 'ar' ? booking.mobile_teams.team_name_ar || booking.mobile_teams.team_name : booking.mobile_teams.team_name}
                </p>
                <div className="flex items-center gap-1 text-emerald-100">
                  <Star className="h-3 w-3 fill-current text-amber-300" />
                  <span className="text-xs">{booking.mobile_teams.rating}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">{t('details.booking_number', language)}</p>
            <p className="font-mono font-bold text-gray-900 text-lg">{booking.booking_number}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <div className="space-y-3 border-t border-gray-100 pt-4">
          {booking.cars && (
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm text-gray-500">{t('details.car', language)}</p>
                <p className="font-medium text-gray-900">{booking.cars.make} {booking.cars.model} - {booking.cars.plate_number}</p>
              </div>
            </div>
          )}
          {booking.mobile_teams && !showEta && (
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm text-gray-500">{t('details.team', language)}</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{language === 'ar' ? booking.mobile_teams.team_name_ar || booking.mobile_teams.team_name : booking.mobile_teams.team_name}</p>
                  <div className="flex items-center gap-0.5 text-amber-500"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-xs font-medium">{booking.mobile_teams.rating}</span></div>
                </div>
              </div>
            </div>
          )}
          {booking.location_address && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm text-gray-500">{t('details.location', language)}</p>
                <p className="text-sm text-gray-700">{booking.location_address}</p>
              </div>
            </div>
          )}
          {booking.scheduled_time && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm text-gray-500">{t('details.scheduled', language)}</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.scheduled_time).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="font-semibold text-gray-900">{t('details.price', language)}</span>
            <span className="text-xl font-bold text-emerald-600">{formatPrice(booking.price, language)}</span>
          </div>
        </div>
      </div>

      {[
        { title: t('photos.before', language), photos: beforePhotos, canUpload: canUploadBefore, type: 'before' as const },
        { title: t('photos.after', language), photos: afterPhotos, canUpload: canUploadAfter, type: 'after' as const },
      ].map((section) => (
        <div key={section.type} className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            {section.canUpload && (
              <button onClick={() => { setUploadType(section.type); fileInputRef.current?.click() }} disabled={uploading}
                className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                {uploading && uploadType === section.type ? <Spinner size="sm" /> : <><Camera className="h-4 w-4" />{t('photos.upload', language)}</>}
              </button>
            )}
          </div>
          {section.photos.length === 0 ? (
            <div className="flex items-center justify-center h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-center"><Image className="h-6 w-6 text-gray-400 mx-auto mb-1" /><p className="text-xs text-gray-400">{t('photos.no_photos', language)}</p></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {section.photos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />

      {review && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">{t('rating.your_rating', language)}</h3>
          <StarRating rating={review.rating} readonly />
          {review.comment && <p className="text-sm text-gray-600 mt-2">{review.comment}</p>}
        </div>
      )}

      {canReview && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-900">{t('rating.title', language)}</h3>
          <div className="flex justify-center"><StarRating rating={rating} onChange={setRating} size="lg" /></div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('rating.comment_placeholder', language)} className="input-field resize-none h-24" dir="auto" />
          <button onClick={handleSubmitReview} disabled={rating === 0 || submittingReview} className="btn-primary w-full flex items-center justify-center gap-2">
            {submittingReview ? <Spinner size="sm" /> : t('rating.submit', language)}
          </button>
        </div>
      )}

      {canCancel && (
        <button onClick={handleCancel} disabled={cancelling}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-600 border-2 border-red-200 hover:bg-red-50 font-medium transition-colors">
          {cancelling ? <Spinner size="sm" /> : <><XCircle className="h-4 w-4" />{t('details.cancel', language)}</>}
        </button>
      )}
    </div>
  )
}