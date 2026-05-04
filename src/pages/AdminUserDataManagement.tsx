import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, ArrowLeft, Edit, Save, X, Phone, User, Shield, Search, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import Spinner from '../components/Spinner'
import type { Profile } from '../types'

export default function AdminUserDataManagement() {
  const { profile, language, addToast } = useAuthStore()
  const navigate = useNavigate()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'customer' as Profile['role'] })

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { navigate('/'); return }
    loadUsers()
  }, [profile])

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const handleEditUser = (user: Profile) => {
    setEditingUser(user.id)
    setEditForm({ name: user.name || '', phone: user.phone || '', role: user.role })
  }

  const handleSaveUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({
      name: editForm.name, phone: editForm.phone, role: editForm.role,
    }).eq('id', userId)
    if (error) { addToast(error.message, 'error'); return }
    addToast(language === 'ar' ? 'تم التحديث' : 'Updated', 'success')
    setEditingUser(null)
    loadUsers()
  }

  const getRoleColor = (role: string) => ({
    admin: 'bg-blue-100 text-blue-700', wash_center_staff: 'bg-orange-100 text-orange-700',
    mobile_team: 'bg-pink-100 text-pink-700', customer: 'bg-gray-100 text-gray-600',
  }[role] || 'bg-gray-100 text-gray-600')

  const getRoleLabel = (role: string) => ({
    admin: language === 'ar' ? 'مدير' : 'Admin',
    wash_center_staff: language === 'ar' ? 'موظف مغسلة' : 'Wash Staff',
    mobile_team: language === 'ar' ? 'عامل متنقل' : 'Mobile Team',
    customer: language === 'ar' ? 'عميل' : 'Customer',
  }[role] || role)

  const filtered = users.filter((u) => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return u.name?.toLowerCase().includes(s) || u.phone?.toLowerCase().includes(s)
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Database className="h-5 w-5 text-orange-600" />
            <h1 className="text-xl font-bold">{language === 'ar' ? 'بيانات المستخدمين' : 'User Data'}</h1>
          </div>
          <button onClick={loadUsers} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[language === 'ar' ? 'الاسم' : 'Name', language === 'ar' ? 'الجوال' : 'Phone',
                  language === 'ar' ? 'الدور' : 'Role', language === 'ar' ? 'تاريخ الانضمام' : 'Joined', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-500 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editingUser === user.id
                      ? <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none w-full" />
                      : <div className="flex items-center gap-2"><div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center"><User className="h-3.5 w-3.5 text-orange-600" /></div><span className="font-medium">{user.name || '-'}</span></div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {editingUser === user.id
                      ? <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none" dir="ltr" />
                      : user.phone || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {editingUser === user.id
                      ? <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Profile['role'] })} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                          {['customer','wash_center_staff','mobile_team','admin'].map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                        </select>
                      : <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>{getRoleLabel(user.role)}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(user.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</td>
                  <td className="px-4 py-3">
                    {editingUser === user.id
                      ? <div className="flex gap-1"><button onClick={() => handleSaveUser(user.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg"><Save className="h-3.5 w-3.5" /></button><button onClick={() => setEditingUser(null)} className="p-1.5 bg-gray-100 rounded-lg"><X className="h-3.5 w-3.5" /></button></div>
                      : <button onClick={() => handleEditUser(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="h-3.5 w-3.5" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400"><Shield className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>{language === 'ar' ? 'لا يوجد مستخدمون' : 'No users'}</p></div>}
        </div>
      </div>
    </div>
  )
}
