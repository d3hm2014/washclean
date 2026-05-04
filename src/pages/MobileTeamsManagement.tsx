import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, ArrowLeft, Plus, User, Wrench, CheckCircle, Clock, RefreshCw, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import Spinner from '../components/Spinner'

interface MobileTeam {
  id: string
  team_name: string
  team_name_ar: string
  status: 'available' | 'busy' | 'maintenance'
  is_available: boolean
  rating: number
  total_reviews: number
  phone: string
  current_lat: number
  current_lng: number
  created_at: string
  user_id: string | null
  driver_name?: string
  driver_email?: string
}

export default function MobileTeamsManagement() {
  const { profile, language, addToast } = useAuthStore()
  const navigate = useNavigate()
  const [teams, setTeams] = useState<MobileTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ team_name: '', team_name_ar: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!profile) { navigate('/'); return }
    if (profile.role !== 'admin') { navigate('/'); return }
    loadTeams()
  }, [profile, ready])

  const loadTeams = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('mobile_teams')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false })

    if (data) {
      setTeams(data.map((t: any) => ({
        ...t,
        driver_name: t.profiles?.name || null,
        driver_email: t.profiles?.email || null,
      })))
    }
    setLoading(false)
  }

  const handleStatusChange = async (teamId: string, newStatus: 'available' | 'busy' | 'maintenance') => {
    const { error } = await supabase.from('mobile_teams').update({
      status: newStatus,
      is_available: newStatus === 'available',
    }).eq('id', teamId)

    if (error) { addToast(error.message, 'error'); return }
    addToast(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated', 'success')
    loadTeams()
  }

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.team_name) return
    setSaving(true)
    const { error } = await supabase.from('mobile_teams').insert({
      team_name: formData.team_name,
      team_name_ar: formData.team_name_ar || formData.team_name,
      phone: formData.phone,
      current_lat: 24.7136,
      current_lng: 46.6753,
      status: 'available',
      is_available: true,
    })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(language === 'ar' ? 'تم إضافة الفريق' : 'Team added', 'success')
    setShowAddForm(false)
    setFormData({ team_name: '', team_name_ar: '', phone: '' })
    loadTeams()
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الفريق؟' : 'Delete this team?')) return
    const { error } = await supabase.from('mobile_teams').delete().eq('id', teamId)
    if (error) { addToast(error.message, 'error'); return }
    addToast(language === 'ar' ? 'تم الحذف' : 'Deleted', 'success')
    loadTeams()
  }

  const getStatusColor = (status: string) => ({
    available: 'bg-green-100 text-green-700',
    busy: 'bg-orange-100 text-orange-700',
    maintenance: 'bg-red-100 text-red-700',
  }[status] || 'bg-gray-100 text-gray-700')

  const getStatusLabel = (status: string) => ({
    available: language === 'ar' ? 'متاح' : 'Available',
    busy: language === 'ar' ? 'مشغول' : 'Busy',
    maintenance: language === 'ar' ? 'صيانة' : 'Maintenance',
  }[status] || status)

  const getStatusIcon = (status: string) => ({
    available: <CheckCircle className="h-4 w-4" />,
    busy: <Clock className="h-4 w-4" />,
    maintenance: <Wrench className="h-4 w-4" />,
  }[status] || null)

  const stats = {
    total: teams.length,
    available: teams.filter(t => t.status === 'available').length,
    busy: teams.filter(t => t.status === 'busy').length,
    maintenance: teams.filter(t => t.status === 'maintenance').length,
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Car className="h-5 w-5 text-pink-600" />
            <h1 className="text-xl font-bold">{language === 'ar' ? 'الفرق المتنقلة' : 'Mobile Teams'}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={loadTeams} className="p-2 hover:bg-gray-100 rounded-lg">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium">
              {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {language === 'ar' ? 'فريق جديد' : 'New Team'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: language === 'ar' ? 'الكل' : 'Total', count: stats.total, color: 'bg-gray-100 text-gray-700' },
            { label: language === 'ar' ? 'متاح' : 'Available', count: stats.available, color: 'bg-green-100 text-green-700' },
            { label: language === 'ar' ? 'مشغول' : 'Busy', count: stats.busy, color: 'bg-orange-100 text-orange-700' },
            { label: language === 'ar' ? 'صيانة' : 'Maintenance', count: stats.maintenance, color: 'bg-red-100 text-red-700' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs font-medium mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">{language === 'ar' ? 'إضافة فريق جديد' : 'Add New Team'}</h2>
            <form onSubmit={handleAddTeam} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'اسم الفريق (عربي) *' : 'Team Name (AR) *'}</label>
                <input required type="text" value={formData.team_name_ar}
                  onChange={(e) => setFormData({ ...formData, team_name_ar: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="فريق متنقل ١" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'اسم الفريق (إنجليزي) *' : 'Team Name (EN) *'}</label>
                <input required type="text" value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Mobile Team 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الجوال' : 'Phone'}</label>
                <input type="tel" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="+966XXXXXXXXX" dir="ltr" />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-pink-600 text-white rounded-lg disabled:opacity-50 font-medium">
                  {saving ? <Spinner size="sm" /> : (language === 'ar' ? 'إضافة' : 'Add')}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Teams List */}
        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    team.status === 'available' ? 'bg-green-100' :
                    team.status === 'busy' ? 'bg-orange-100' : 'bg-red-100'
                  }`}>
                    <Car className={`h-6 w-6 ${
                      team.status === 'available' ? 'text-green-600' :
                      team.status === 'busy' ? 'text-orange-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{team.team_name_ar || team.team_name}</h3>
                    <p className="text-sm text-gray-500">{team.team_name}</p>
                    {team.driver_name && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">{team.driver_name}</span>
                      </div>
                    )}
                    {!team.user_id && (
                      <span className="text-xs text-red-400">{language === 'ar' ? 'لا يوجد سائق مُعين' : 'No driver assigned'}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(team.status)}`}>
                    {getStatusIcon(team.status)}
                    {getStatusLabel(team.status)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500 ml-auto">{language === 'ar' ? 'تغيير الحالة:' : 'Change status:'}</span>
                {(['available', 'busy', 'maintenance'] as const).map((s) => (
                  <button key={s} onClick={() => handleStatusChange(team.id, s)}
                    disabled={team.status === s}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      s === 'available' ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                      s === 'busy' ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' :
                      'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}>
                    {getStatusIcon(s)}
                    {getStatusLabel(s)}
                  </button>
                ))}
                <button onClick={() => handleDeleteTeam(team.id)}
                  className="mr-auto px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {teams.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{language === 'ar' ? 'لا يوجد فرق بعد' : 'No teams yet'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
