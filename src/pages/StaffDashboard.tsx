import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, XCircle, Clock, Search, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { WashBooking } from '../types';
import Spinner from '../components/Spinner';
import WalkInBookingModal from './WalkInBookingModal';
import { sendSMS, formatBookingStatusMessage } from '../lib/sms';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { profile, addToast } = useAuthStore();
  const [bookings, setBookings] = useState<WashBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'wash_center_staff' && profile?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchBookings();
  }, [profile, filter]);

  const fetchBookings = async () => {
    setLoading(true);
    let query = supabase
      .from('wash_bookings')
      .select(`
        *,
        cars (make, model, year, color, plate_number),
        car_wash_services (name_ar, price, duration_minutes),
        profiles!wash_bookings_user_id_fkey (name, phone)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      addToast('خطأ في تحميل الحجوزات', 'error');
      setLoading(false);
      return;
    }

    setBookings(data || []);
    setLoading(false);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from('wash_bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      addToast('خطأ في تحديث الحجز', 'error');
      return;
    }

    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      const customerProfile = booking.profiles as any;
      const service = booking.car_wash_services as any;

      if (customerProfile?.phone) {
        const smsMessage = formatBookingStatusMessage(
          customerProfile.name || 'عزيزي العميل',
          newStatus,
          service?.name_ar || 'غسيل السيارة'
        );

        await sendSMS({
          phone: customerProfile.phone,
          message: smsMessage
        });
      }
    }

    addToast('تم تحديث حالة الحجز بنجاح', 'success');
    fetchBookings();
  };

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      booking.booking_number.toLowerCase().includes(search) ||
      (booking.cars as any)?.plate_number?.toLowerCase().includes(search) ||
      (booking.profiles as any)?.phone?.toLowerCase().includes(search)
    );
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      in_progress: 'جاري التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغى'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة تحكم المغسلة</h1>
            <p className="text-gray-600">إدارة حجوزات العملاء</p>
          </div>
          <button
            onClick={() => setShowWalkInModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            حجز للعميل
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الحجز، رقم اللوحة، أو رقم الجوال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pr-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {[
                { value: 'all', label: 'الكل' },
                { value: 'pending', label: 'قيد الانتظار' },
                { value: 'confirmed', label: 'مؤكد' },
                { value: 'in_progress', label: 'جاري التنفيذ' },
                { value: 'completed', label: 'مكتمل' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    filter === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">لا توجد حجوزات</p>
            </div>
          ) : (
            filteredBookings.map(booking => {
              const car = booking.cars as any;
              const service = booking.car_wash_services as any;
              const customer = booking.profiles as any;

              return (
                <div key={booking.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-mono text-gray-500 mb-1">
                        {booking.booking_number}
                      </p>
                      <h3 className="text-lg font-bold text-gray-900">
                        {car?.make} {car?.model} - {car?.plate_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        العميل: {customer?.name || customer?.phone}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">الخدمة</p>
                      <p className="font-semibold text-gray-900">{service?.name_ar}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">التاريخ</p>
                      <p className="font-semibold text-gray-900">{booking.slot_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">الوقت</p>
                      <p className="font-semibold text-gray-900">{booking.slot_time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">السعر</p>
                      <p className="font-semibold text-blue-600">{booking.price.toFixed(2)} ر.س</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${
                        booking.payment_status === 'paid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {booking.payment_status === 'paid' ? '✓ تم الدفع' : '✗ لم يتم الدفع'}
                      </p>
                    </div>

                    {booking.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          className="btn-primary flex items-center gap-2 text-sm"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          تأكيد
                        </button>
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          إلغاء
                        </button>
                      </div>
                    )}

                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                        className="btn-primary flex items-center gap-2 text-sm"
                      >
                        <Clock className="h-4 w-4" />
                        بدء العمل
                      </button>
                    )}

                    {booking.status === 'in_progress' && (
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                        className="btn-primary flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        إنهاء
                      </button>
                    )}
                  </div>

                  {booking.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">ملاحظات:</span> {booking.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <WalkInBookingModal
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        onSuccess={() => {
          fetchBookings();
          setShowWalkInModal(false);
        }}
      />
    </div>
  );
}
