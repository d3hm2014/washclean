import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Spinner from './components/Spinner';
import PhoneAuthPage from './pages/PhoneAuthPage';
import HomePage from './pages/HomePage';
import CarsPage from './pages/CarsPage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import BookingDetailsPage from './pages/BookingDetailsPage';
import CarWashBookingPage from './pages/CarWashBookingPage';
import WashBookingDetailsPage from './pages/WashBookingDetailsPage';
import StaffDashboard from './pages/StaffDashboard';
import MobileWasherDashboard from './pages/MobileWasherDashboard';
import MobileTeamsManagement from './pages/MobileTeamsManagement';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import AdminUserDataManagement from './pages/AdminUserDataManagement';
import ServicesManagement from './pages/ServicesManagement';
import SystemSettings from './pages/SystemSettings';
import AdminDriverAssignment from './pages/AdminDriverAssignment';
import AdminBookings from './pages/AdminBookings';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading, initialized } = useAuthStore();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return <PhoneAuthPage />;
  }

  return <>{children}</>;
}

export default function App() {
  const { initialize, language } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  return (
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/cars" element={<CarsPage />} />
            <Route path="/bookings" element={<MyBookingsPage />} />
            <Route path="/bookings/:id" element={<BookingDetailsPage />} />
          </Route>
          <Route path="/book" element={<BookingPage />} />
          <Route path="/wash-booking" element={<CarWashBookingPage />} />
          <Route path="/wash-bookings/:id" element={<WashBookingDetailsPage />} />
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/washer" element={<MobileWasherDashboard />} />
          <Route path="/admin/teams" element={<MobileTeamsManagement />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/user-data" element={<AdminUserDataManagement />} />
          <Route path="/admin/services" element={<ServicesManagement />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
          <Route path="/admin/drivers" element={<AdminDriverAssignment />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthGuard>
    </BrowserRouter>
  );
}