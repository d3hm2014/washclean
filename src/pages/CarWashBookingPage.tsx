import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Calendar, Clock, ArrowRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Car, CarWashService, WashCenterSlot } from '../types';
import Spinner from '../components/Spinner';
import { sendSMS, formatBookingConfirmationMessage } from '../lib/sms';

export default function CarWashBookingPage() {
  const navigate = useNavigate();
  const { session, addToast } = useAuthStore();
  const [step, setStep] = useState<'car' | 'service' | 'slot' | 'confirm'>('car');
  const [loading, setLoading] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [services, setServices] = useState<CarWashService[]>([]);
  const [slots, setSlots] = useState<WashCenterSlot[]>([]);

  const [selectedCar, setSelectedCar] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'evening'>('morning');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      fetchCars();
      fetchServices();
    }
  }, [session]);

  const fetchCars = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('cars').select('*').eq('user_id', session.user.id);
    setCars(data || []);
    if (data?.length) setSelectedCar(data[0].id);
  };

  const fetchServices = async () => {
    const { data } = await supabase.from('car_wash_services').select('*').eq('is_active', true);
    setServices(data || []);
  };

  const generateTimeSlots = (period: 'morning' | 'evening') => {
    const result: WashCenterSlot[] = [];
    const startHour = period === 'morning' ? 9 : 16;
    const endHour = period === 'morning' ? 12 : 23;
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === endHour && minute > 0) break;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        result.push({
          id: `${selectedDate}-${timeString}`,
          slot_date: selectedDate,
          slot_time: timeString,
          max_capacity: 1,
          current_bookings: 0,
          is_available: true,
          created_at: new Date().toISOString(),
        });
      }
    }
    return result;
  };

  // ✅ إصلاح: كان فيه خطأ .eq('slot_id', 'slot_date') بدل .eq('slot_date', date)
  const fetchSlots = async (date: string, period: 'morning' | 'evening') => {
    const generated = generateTimeSlots(period);
    const { data: existingBookings } = await supabase
      .from('wash_bookings')
      .select('slot_time')
      .eq('slot_date', date)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    const bookedTimes = existingBookings?.map((b) => b.slot_time) || [];
    const available = generated.filter((s) => !bookedTimes.includes(s.slot_time));
    setSlots(available);
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setSelectedSlot('');
    await fetchSlots(date, selectedPeriod);
  };

  const handlePeriodChange = async (period: 'morning' | 'evening') => {
    setSelectedPeriod(period);
    setSelectedSlot('');
    if (selectedDate) await fetchSlots(selectedDate, period);
  };

  const handleCreateBooking = async () => {
    if (!selectedCar || !selectedService || !selectedSlot) {
      addToast('الرجاء ملء جميع الحقول', 'error');
      return;
    }
    setLoading(true);
    try {
      const service = services.find((s) => s.id === selectedService);
      const slotData = slots.find((s) => s.id === selectedSlot);
      if (!service || !slotData) {
        addToast('خطأ في البيانات', 'error');
        return;
      }

      // التحقق من عدم الحجز المزدوج
      const { data: existing } = await supabase
        .from('wash_bookings')
        .select('id')
        .eq('slot_date', slotData.slot_date)
        .eq('slot_time', slotData.slot_time)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .maybeSingle();

      if (existing) {
        addToast('هذا الوقت محجوز. الرجاء اختيار وقت آخر.', 'error');
        return;
      }

      const bookingNumber = `WB-${Date.now()}`;
      const { data, error } = await supabase
        .from('wash_bookings')
        .insert({
          booking_number: bookingNumber,
          user_id: session?.user?.id,
          car_id: selectedCar,
          service_id: selectedService,
          slot_id: selectedSlot,
          slot_date: slotData.slot_date,
          slot_time: slotData.slot_time,
          price: service.price,
          notes: notes || null,
          status: 'pending',
          payment_status: 'paid',
          payment_method: 'online',
        })
        .select()
        .single();

      if (error) throw error;

      // ✅ إصلاح: `name` بدل `full_name`
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone, name')
        .eq('id', session?.user?.id)
        .maybeSingle();

      if (profileData?.phone) {
        const smsMessage = formatBookingConfirmationMessage(
          profileData.name || 'عزيزي العميل',
          service.name_ar,
          slotData.slot_date,
          slotData.slot_time,
          'مركز الغسيل'
        );
        await sendSMS({ phone: profileData.phone, message: smsMessage });
      }

      addToast('تم حجز الموعد بنجاح!', 'success');
      navigate(`/wash-bookings/${data.id}`);
    } catch (error) {
      addToast('خطأ في إنشاء الحجز', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceData = services.find((s) => s.id === selectedService);
  const selectedSlotData = slots.find((s) => s.id === selectedSlot);
  const selectedCarData = cars.find((c) => c.id === selectedCar);
  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-blue-600 font-medium mb-6">
          <ChevronLeft className="h-5 w-5" />
          الرجوع
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Droplet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">حجز غسيل السيارة</h1>
              <p className="text-gray-500 text-sm">اختر السيارة والخدمة والموعد</p>
            </div>
          </div>

          {/* شريط التقدم */}
          <div className="flex gap-2 mb-6">
            {['car', 'service', 'slot', 'confirm'].map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${
                  ['car','service','slot','confirm'].indexOf(step) >= i ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              </div>
            ))}
          </div>

          {/* خطوة ١: السيارة */}
          {step === 'car' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">اختر السيارة</h2>
              {cars.length === 0 ? (
                <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>لا توجد سيارات. أضف سيارة من صفحة سياراتي.</p>
                </div>
              ) : (
                cars.map((car) => (
                  <label key={car.id} className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedCar === car.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}>
                    <input type="radio" name="car" value={car.id} checked={selectedCar === car.id}
                      onChange={(e) => setSelectedCar(e.target.value)} className="w-4 h-4" />
                    <div>
                      <p className="font-semibold">{car.make} {car.model}</p>
                      <p className="text-sm text-gray-500">{car.year} - {car.color} - {car.plate_number}</p>
                    </div>
                  </label>
                ))
              )}
              <button onClick={() => setStep('service')} disabled={!selectedCar}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
                التالي <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* خطوة ٢: الخدمة */}
          {step === 'service' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">اختر نوع الخدمة</h2>
              {services.map((service) => (
                <label key={service.id} className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedService === service.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}>
                  <input type="radio" name="service" value={service.id} checked={selectedService === service.id}
                    onChange={(e) => setSelectedService(e.target.value)} className="w-4 h-4" />
                  <div className="flex-1">
                    <p className="font-semibold">{service.name_ar}</p>
                    <p className="text-sm text-gray-500">{service.description_ar}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {service.duration_minutes} دقيقة
                    </p>
                  </div>
                  <p className="font-bold text-blue-600">{service.price.toFixed(2)} ر.س</p>
                </label>
              ))}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep('car')} className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <ChevronLeft className="h-4 w-4" /> السابق
                </button>
                <button onClick={() => setStep('slot')} disabled={!selectedService}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  التالي <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* خطوة ٣: الموعد */}
          {step === 'slot' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">اختر الموعد</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ</label>
                <input type="date" value={selectedDate} min={minDate} max={maxDate}
                  onChange={(e) => handleDateChange(e.target.value)} className="input-field w-full" />
              </div>
              {selectedDate && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الفترة</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['morning', 'evening'] as const).map((p) => (
                        <button key={p} type="button" onClick={() => handlePeriodChange(p)}
                          className={`p-4 border-2 rounded-lg font-medium transition-all ${
                            selectedPeriod === p ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200'
                          }`}>
                          <div className="font-bold mb-1">{p === 'morning' ? 'صباحي' : 'مسائي'}</div>
                          <div className="text-sm">{p === 'morning' ? '9:00 ص - 12:00 م' : '4:00 م - 11:00 م'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الوقت المتاح</label>
                    {slots.length === 0 ? (
                      <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>لا توجد فترات متاحة. اختر فترة أخرى.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                        {slots.map((slot) => (
                          <label key={slot.id} className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer text-sm font-medium transition-all ${
                            selectedSlot === slot.id ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-blue-300'
                          }`}>
                            <input type="radio" name="slot" value={slot.id} checked={selectedSlot === slot.id}
                              onChange={(e) => setSelectedSlot(e.target.value)} className="hidden" />
                            {slot.slot_time}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات (اختياري)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                      className="input-field w-full h-20" placeholder="أي متطلبات خاصة..." />
                  </div>
                </>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep('service')} className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <ChevronLeft className="h-4 w-4" /> السابق
                </button>
                <button onClick={() => setStep('confirm')} disabled={!selectedSlot}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  التالي <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* خطوة ٤: التأكيد */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">تأكيد الحجز</h2>
              <div className="bg-gray-50 rounded-lg p-5 space-y-3">
                <div><p className="text-sm text-gray-500">السيارة</p><p className="font-semibold">{selectedCarData?.make} {selectedCarData?.model}</p></div>
                <div><p className="text-sm text-gray-500">الخدمة</p><p className="font-semibold">{selectedServiceData?.name_ar}</p></div>
                <div><p className="text-sm text-gray-500">الموعد</p><p className="font-semibold">{selectedDate} - {selectedSlotData?.slot_time}</p></div>
                {notes && <div><p className="text-sm text-gray-500">ملاحظات</p><p>{notes}</p></div>}
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold">الإجمالي</span>
                  <span className="text-2xl font-bold text-blue-600">{selectedServiceData?.price.toFixed(2)} ر.س</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('slot')} className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <ChevronLeft className="h-4 w-4" /> السابق
                </button>
                <button onClick={handleCreateBooking} disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {loading ? <Spinner size="sm" /> : <><span>تأكيد الحجز</span><ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
