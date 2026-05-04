import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Calendar, Car, TrendingUp, CheckCircle,
  Clock, XCircle, DollarSign, ArrowLeft, Settings, Droplets, Database, List
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalCustomers: number;
}

export default function AdminDashboard() {
  const { profile, language } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0, pendingBookings: 0, completedBookings: 0,
    cancelledBookings: 0, totalRevenue: 0, totalCustomers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role === 'customer') { navigate('/'); return; }
    loadStats();
  }, [profile]);

  const loadStats = async () => {
    try {
      const [bookingsRes, customersRes] = await Promise.all([
        supabase.from('bookings').select('status, price, payment_status'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'customer'),
      ]);
      if (bookingsRes.data) {
        const bookings = bookingsRes.data;
        setStats({
          totalBookings: bookings.length,
          pendingBookings: bookings.filter((b) => b.status === 'pending').length,
          completedBookings: bookings.filter((b) => b.status === 'completed').length,
          cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
          totalRevenue: bookings.filter((b) => b.payment_status === 'paid').reduce((sum, b) => sum + (b.price || 0), 0),
          totalCustomers: customersRes.count || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner size="lg" /></div>
  );

  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'wash_center_staff';
  const isMobileTeam = profile?.role === 'mobile_team';

  const statCards = [
    { title: language === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings', value: stats.totalBookings, icon: Calendar, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: language === 'ar' ? 'قيد الانتظار' : 'Pending', value: stats.pendingBookings, icon: Clock, bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { title: language === 'ar' ? 'مكتملة' : 'Completed', value: stats.completedBookings, icon: CheckCircle, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { title: language === 'ar' ? 'ملغاة' : 'Cancelled', value: stats.cancelledBookings, icon: XCircle, bgColor: 'bg-red-50', textColor: 'text-red-600' },
    { title: language === 'ar' ? 'الإيرادات' : 'Revenue', value: `${stats.totalRevenue.toFixed(2)} ${language === 'ar' ? 'ريال' : 'SAR'}`, icon: DollarSign, bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { title: language === 'ar' ? 'العملاء' : 'Customers', value: stats.totalCustomers, icon: Users, bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {language === 'ar' ? 'لوحة التحكم' : 'Control Panel'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{profile?.name || profile?.phone}</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {profile?.role === 'admin' ? (language === 'ar' ? 'مدير' : 'Admin')
                  : profile?.role === 'wash_center_staff' ? (language === 'ar' ? 'موظف مغسلة' : 'Wash Staff')
                  : (language === 'ar' ? 'عامل متنقل' : 'Mobile Team')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.textColor} p-3 rounded-lg`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isAdmin && (
            <>
              <Link to="/admin/bookings" className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
                <List className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'إدارة الحجوزات' : 'Bookings Management'}</h3>
                <p className="text-indigo-100 text-sm">{language === 'ar' ? 'عرض كل الحجوزات مع تفاصيل الإسناد' : 'View all bookings with assignment details'}</p>
              </Link>
              <Link to="/admin/users" className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
                <Users className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}</h3>
                <p className="text-blue-100 text-sm">{language === 'ar' ? 'إنشاء وإدارة حسابات الموظفين' : 'Create and manage staff accounts'}</p>
              </Link>
              <Link to="/admin/user-data" className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
                <Database className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'بيانات المستخدمين' : 'User Data'}</h3>
                <p className="text-orange-100 text-sm">{language === 'ar' ? 'عرض وتعديل بيانات المستخدمين' : 'View and edit user data'}</p>
              </Link>
              <Link to="/admin/services" className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
                <Droplets className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'إدارة الخدمات' : 'Wash Services'}</h3>
                <p className="text-cyan-100 text-sm">{language === 'ar' ? 'إضافة وتعديل خدمات الغسيل' : 'Add and edit wash services'}</p>
              </Link>
              <Link to="/admin/settings" className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
                <Settings className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'إعدادات النظام' : 'System Settings'}</h3>
                <p className="text-violet-100 text-sm">{language === 'ar' ? 'إدارة الأسعار والإعدادات' : 'Manage pricing and settings'}</p>
              </Link>
              <Link to="/admin/teams" className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
                <Car className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'الفرق المتنقلة' : 'Mobile Teams'}</h3>
                <p className="text-purple-100 text-sm">{language === 'ar' ? 'إدارة الفرق والسائقين وحالة العربات' : 'Manage teams, drivers & vehicle status'}</p>
              </Link>
              <Link to="/admin/drivers" className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
                <Users className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'تعيين السائقين' : 'Driver Assignment'}</h3>
                <p className="text-teal-100 text-sm">{language === 'ar' ? 'تعيين سائق لكل فريق متنقل' : 'Assign a driver to each mobile team'}</p>
              </Link>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
                <TrendingUp className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'التقارير' : 'Reports'}</h3>
                <p className="text-emerald-100 text-sm">{language === 'ar' ? 'قريباً' : 'Coming soon'}</p>
              </div>
            </>
          )}
          {(isAdmin || isStaff) && (
            <Link to="/staff" className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
              <Calendar className="h-8 w-8 mb-3" />
              <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'حجوزات المغسلة' : 'Wash Center Bookings'}</h3>
              <p className="text-orange-100 text-sm">{language === 'ar' ? 'إدارة حجوزات المغسلة' : 'Manage wash center bookings'}</p>
            </Link>
          )}
          {(isAdmin || isMobileTeam) && (
            <Link to="/washer" className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
              <Car className="h-8 w-8 mb-3" />
              <h3 className="text-lg font-bold mb-1">{language === 'ar' ? 'الغسيل المتنقل' : 'Mobile Washing'}</h3>
              <p className="text-pink-100 text-sm">{language === 'ar' ? 'إدارة طلبات الغسيل المتنقل' : 'Manage mobile wash requests'}</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
