import { useState } from 'react';
import { Phone, ShieldCheck, User, ArrowRight, Eye, Mail, Lock, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import Spinner from '../components/Spinner';
import RegionCityPicker from '../components/RegionCityPicker';

type Step = 'phone' | 'otp' | 'profile';
type AuthMode = 'customer' | 'staff';

export default function PhoneAuthPage() {
  const { language, addToast, fetchProfile, setSession } = useAuthStore();
  const [step, setStep] = useState<Step>('phone');
  const [authMode, setAuthMode] = useState<AuthMode>('customer');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState<{ region: string; city: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const guestEmail = `guest_${Date.now()}@washclean.app`;
      const guestPassword = `guest_${Math.random().toString(36).slice(2)}`;
      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
        options: { data: { name: language === 'ar' ? 'زائر' : 'Guest' } },
      });
      if (error) throw error;
      if (data.session) setSession(data.session);
      addToast(language === 'ar' ? 'تصفح كزائر' : 'Browsing as guest', 'info');
    } catch {
      addToast(language === 'ar' ? 'خطأ في تسجيل الدخول' : 'Login error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!email || !password) {
      addToast(language === 'ar' ? 'يرجى إدخال البريد وكلمة المرور' : 'Please enter email and password', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        await fetchProfile(data.user.id);
        addToast(language === 'ar' ? 'مرحباً بعودتك' : 'Welcome back', 'success');
      }
    } catch {
      addToast(language === 'ar' ? 'بريد أو كلمة مرور خاطئة' : 'Invalid email or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    if (phone.length !== 9) {
      addToast(language === 'ar' ? 'يرجى إدخال 9 أرقام' : 'Please enter 9 digits', 'error');
      return;
    }
    setLoading(true);
    const fullPhone = `+966${phone}`;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ phone: fullPhone }),
        }
      );
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setStep('otp');
        addToast(language === 'ar' ? 'تم إرسال رمز التحقق' : 'Verification code sent', 'success');
      } else {
        addToast(result?.error || (language === 'ar' ? 'خطأ في إرسال الرمز' : 'Failed to send code'), 'error');
      }
    } catch {
      addToast(language === 'ar' ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    const fullPhone = `+966${phone}`;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-phone-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ phone: fullPhone, code: otp }),
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        addToast(result?.error || (language === 'ar' ? 'رمز خاطئ أو منتهي' : 'Invalid or expired code'), 'error');
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: result.password,
      });
      if (signInError) {
        addToast(language === 'ar' ? 'فشل تسجيل الدخول' : 'Sign-in failed', 'error');
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;
      await fetchProfile(userId);
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', userId)
        .maybeSingle();
      if (!profileRow?.name && profileRow?.role === 'customer') {
        setStep('profile');
        return;
      }
      addToast(language === 'ar' ? 'مرحباً بعودتك' : 'Welcome back', 'success');
    } catch {
      addToast(language === 'ar' ? 'خطأ في التحقق' : 'Verification error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const completeProfile = async () => {
    if (!name.trim()) {
      addToast(language === 'ar' ? 'يرجى إدخال الاسم' : 'Please enter name', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const userId = userData.user.id;
      const locationString = location ? `${location.region}_${location.city}` : null;
      await supabase.from('profiles').update({ name: name.trim(), email: email.trim() || null, location: locationString }).eq('id', userId);
      await fetchProfile(userId);
      addToast(language === 'ar' ? 'تم حفظ البيانات بنجاح' : 'Profile saved', 'success');
    } catch {
      addToast(language === 'ar' ? 'خطأ في حفظ البيانات' : 'Save error', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{language === 'ar' ? 'أكمل بياناتك' : 'Complete Profile'}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{language === 'ar' ? 'الاسم *' : 'Name *'}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder={language === 'ar' ? 'أدخل اسمك' : 'Enter your name'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{language === 'ar' ? 'البريد (اختياري)' : 'Email (optional)'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="example@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{language === 'ar' ? 'الموقع (اختياري)' : 'Location (optional)'}</label>
              <RegionCityPicker onLocationSelect={setLocation} language={language} />
            </div>
            <button onClick={completeProfile} disabled={!name.trim() || loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : language === 'ar' ? 'حفظ البيانات' : 'Save'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{language === 'ar' ? 'أدخل رمز التحقق' : 'Enter Code'}</h2>
            <p className="text-gray-500 text-sm mt-2">{language === 'ar' ? `تم إرسال الرمز إلى +966${phone}` : `Code sent to +966${phone}`}</p>
          </div>
          <div className="space-y-4">
            <input type="text" inputMode="numeric" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="000000" maxLength={6} />
            <button onClick={verifyCode} disabled={otp.length !== 6 || loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : language === 'ar' ? 'تحقق' : 'Verify'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
            <button onClick={() => setStep('phone')} className="w-full text-sm text-gray-500 hover:text-gray-700">
              {language === 'ar' ? 'تغيير رقم الجوال' : 'Change number'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{language === 'ar' ? 'مرحباً بك' : 'Welcome'}</h2>
          <p className="text-gray-500 text-sm mt-1">{language === 'ar' ? 'سجّل دخولك' : 'Sign in to continue'}</p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button onClick={() => setAuthMode('customer')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMode === 'customer' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>
            <Phone className="h-4 w-4" />
            {language === 'ar' ? 'عميل' : 'Customer'}
          </button>
          <button onClick={() => setAuthMode('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMode === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
            <Briefcase className="h-4 w-4" />
            {language === 'ar' ? 'موظف' : 'Staff'}
          </button>
        </div>

        {authMode === 'customer' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{language === 'ar' ? 'رقم الجوال' : 'Phone Number'}</label>
              <div className="flex gap-2">
                <div className="w-20 px-3 py-3 bg-gray-100 border border-gray-300 rounded-lg text-center font-semibold text-gray-700">+966</div>
                <input type="tel" inputMode="numeric" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="5xxxxxxxx" maxLength={9} />
              </div>
            </div>
            <button onClick={sendCode} disabled={phone.length !== 9 || loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : language === 'ar' ? 'إرسال رمز التحقق' : 'Send Code'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-500">{language === 'ar' ? 'أو' : 'or'}</span></div>
            </div>
            <button onClick={handleGuestLogin} disabled={loading}
              className="w-full border-2 border-gray-200 text-gray-600 py-3 rounded-lg font-medium hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <Eye className="h-5 w-5" />
              {language === 'ar' ? 'تصفح بدون تسجيل' : 'Browse as Guest'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="staff@washclean.app" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === 'Enter' && handleStaffLogin()} />
              </div>
            </div>
            <button onClick={handleStaffLogin} disabled={!email || !password || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}