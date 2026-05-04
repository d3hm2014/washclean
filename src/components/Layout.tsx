import { Outlet, NavLink, Link } from 'react-router-dom'
import { Home, Car, CalendarCheck, Globe, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { t } from '../lib/translations'
import ToastContainer from './Toast'

export default function Layout() {
  const { language, toggleLanguage, profile, signOut } = useAuthStore()
  const showAdminLink = profile && profile.role !== 'customer'

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home', language) },
    { to: '/cars', icon: Car, label: t('nav.cars', language) },
    { to: '/bookings', icon: CalendarCheck, label: t('nav.bookings', language) },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ToastContainer />

      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Car className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">{t('app.name', language)}</span>
          </div>

          <div className="flex items-center gap-2">
            {showAdminLink && (
              <Link to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                <LayoutDashboard className="h-3.5 w-3.5" />
                {language === 'ar' ? 'التحكم' : 'Admin'}
              </Link>
            )}
            <button onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
              <Globe className="h-3.5 w-3.5" />
              {language === 'ar' ? 'EN' : 'عربي'}
            </button>
            <button onClick={signOut}
              className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title={t('auth.logout', language)}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">
        <div className="max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                }`
              }>
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}