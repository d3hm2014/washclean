import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Driver {
  id: string
  name: string
  phone: string
  role: string
  is_active: boolean
}

interface MobileTeam {
  id: string
  team_name: string
  team_name_ar: string
  is_available: boolean
  rating: number
  phone: string | null
  driver: Driver | null
  user_id: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDriverAssignment() {
  const [teams, setTeams] = useState<MobileTeam[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch] = useState('')
  const [modalTeam, setModalTeam] = useState<MobileTeam | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<string>('')
  const [driverSearch, setDriverSearch] = useState('')

  // ── fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchTeams(), fetchDrivers()])
    setLoading(false)
  }

  async function fetchTeams() {
    const { data, error } = await supabase
      .from('mobile_teams')
      .select('id, team_name, team_name_ar, is_available, rating, phone, user_id')
      .order('team_name')

    if (error) { showToast('خطأ في تحميل الفرق', 'error'); return }

    // For each team that has a user_id, fetch the driver profile
    const enriched: MobileTeam[] = await Promise.all(
      (data || []).map(async (team) => {
        if (!team.user_id) return { ...team, driver: null }
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, phone, role, is_active')
          .eq('id', team.user_id)
          .single()
        return { ...team, driver: profile || null }
      })
    )
    setTeams(enriched)
  }

  async function fetchDrivers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, role, is_active')
      .eq('role', 'mobile_team')
      .eq('is_active', true)
      .order('name')

    if (!error) setDrivers(data || [])
  }

  // ── assign / unassign ───────────────────────────────────────────────────────
  async function assignDriver(teamId: string, driverId: string | null) {
    setSaving(teamId)
    const { error } = await supabase
      .from('mobile_teams')
      .update({ user_id: driverId })
      .eq('id', teamId)

    if (error) {
      showToast('فشل تعيين السائق', 'error')
    } else {
      showToast(driverId ? 'تم تعيين السائق بنجاح ✓' : 'تم إلغاء تعيين السائق', 'success')
      await fetchTeams()
    }
    setSaving(null)
    setModalTeam(null)
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── derived ─────────────────────────────────────────────────────────────────
  const filteredTeams = teams.filter(t =>
    t.team_name_ar?.includes(search) || t.team_name.toLowerCase().includes(search.toLowerCase())
  )

  const availableDrivers = drivers.filter(d => {
    const alreadyAssigned = teams.some(t => t.user_id === d.id && t.id !== modalTeam?.id)
    const matchSearch = d.name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
      d.phone?.includes(driverSearch)
    return !alreadyAssigned && matchSearch
  })

  const assignedCount = teams.filter(t => t.user_id).length
  const unassignedCount = teams.length - assignedCount

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)',
      fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
      direction: 'rtl',
      color: '#e2e8f0',
      padding: '0',
    }}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42,
            background: 'linear-gradient(135deg, #00c896, #0091ea)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🚗</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>تعيين السائقين</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>لوحة إدارة الفرق المتنقلة</div>
          </div>
        </div>
        <a href="/admin" style={{
          color: '#64748b', fontSize: 13, textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'all .2s',
        }}>← العودة للإدارة</a>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16, padding: '24px 28px 0',
        maxWidth: 900, margin: '0 auto',
      }}>
        {[
          { label: 'إجمالي الفرق', value: teams.length, icon: '👥', color: '#4f81ff' },
          { label: 'لديها سائق', value: assignedCount, icon: '✅', color: '#00c896' },
          { label: 'بدون سائق', value: unassignedCount, icon: '⚠️', color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              fontSize: 28, width: 48, height: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: stat.color + '18', borderRadius: 12,
            }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '20px 28px', maxWidth: 900, margin: '0 auto' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  ابحث عن فريق..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '12px 16px',
            color: '#e2e8f0', fontSize: 14,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Teams List */}
      <div style={{ padding: '0 28px 40px', maxWidth: 900, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div>جاري التحميل...</div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            لا توجد فرق مطابقة
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredTeams.map(team => (
              <div key={team.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${team.user_id ? 'rgba(0,200,150,0.25)' : 'rgba(245,158,11,0.2)'}`,
                borderRadius: 16, padding: '18px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16,
                transition: 'all .2s',
              }}>
                {/* Team Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: team.user_id
                      ? 'linear-gradient(135deg, #00c896, #0091ea)'
                      : 'rgba(245,158,11,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {team.user_id ? '🚗' : '🚫'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{team.team_name_ar || team.team_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 12 }}>
                      <span>⭐ {team.rating?.toFixed(1) || '5.0'}</span>
                      {team.phone && <span>📞 {team.phone}</span>}
                      <span style={{ color: team.is_available ? '#00c896' : '#f87171' }}>
                        {team.is_available ? '● متاح' : '● غير متاح'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Driver Badge */}
                <div style={{ textAlign: 'center', minWidth: 130 }}>
                  {team.driver ? (
                    <div style={{
                      background: 'rgba(0,200,150,0.12)',
                      border: '1px solid rgba(0,200,150,0.3)',
                      borderRadius: 10, padding: '6px 12px',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#00c896' }}>
                        {team.driver.name || 'سائق'}
                      </div>
                      {team.driver.phone && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {team.driver.phone}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px dashed rgba(245,158,11,0.4)',
                      borderRadius: 10, padding: '6px 12px',
                      fontSize: 12, color: '#f59e0b',
                    }}>
                      بدون سائق
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => { setModalTeam(team); setSelectedDriver(team.user_id || ''); setDriverSearch('') }}
                    disabled={saving === team.id}
                    style={{
                      background: 'linear-gradient(135deg, #00c896, #0091ea)',
                      border: 'none', borderRadius: 10, padding: '8px 16px',
                      color: '#fff', fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', fontFamily: 'inherit',
                      opacity: saving === team.id ? 0.6 : 1,
                    }}
                  >
                    {saving === team.id ? '...' : team.user_id ? 'تغيير' : 'تعيين'}
                  </button>
                  {team.user_id && (
                    <button
                      onClick={() => assignDriver(team.id, null)}
                      disabled={saving === team.id}
                      style={{
                        background: 'rgba(248,113,113,0.12)',
                        border: '1px solid rgba(248,113,113,0.3)',
                        borderRadius: 10, padding: '8px 12px',
                        color: '#f87171', fontWeight: 700, fontSize: 13,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalTeam && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 20,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalTeam(null) }}
        >
          <div style={{
            background: '#1a1f2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 28, width: '100%', maxWidth: 460,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
              تعيين سائق للفريق
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              {modalTeam.team_name_ar || modalTeam.team_name}
            </div>

            {/* Driver Search */}
            <input
              value={driverSearch}
              onChange={e => setDriverSearch(e.target.value)}
              placeholder="🔍 ابحث باسم السائق أو رقمه..."
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 14px',
                color: '#e2e8f0', fontSize: 13,
                outline: 'none', fontFamily: 'inherit',
                marginBottom: 12, width: '100%', boxSizing: 'border-box',
              }}
            />

            {/* Driver List */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Unassign option */}
              <div
                onClick={() => setSelectedDriver('')}
                style={{
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  border: `1px solid ${selectedDriver === '' ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  background: selectedDriver === '' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(248,113,113,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>🚫</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f87171' }}>بدون سائق</div>
              </div>

              {availableDrivers.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 13 }}>
                  لا يوجد سائقون متاحون
                </div>
              )}

              {availableDrivers.map(driver => (
                <div
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver.id)}
                  style={{
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${selectedDriver === driver.id ? 'rgba(0,200,150,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: selectedDriver === driver.id ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all .15s',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #00c896, #0091ea)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: '#fff', fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {driver.name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{driver.name || 'بدون اسم'}</div>
                    {driver.phone && (
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{driver.phone}</div>
                    )}
                  </div>
                  {selectedDriver === driver.id && (
                    <div style={{ color: '#00c896', fontSize: 18 }}>✓</div>
                  )}
                </div>
              ))}
            </div>

            {/* Confirm Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setModalTeam(null)}
                style={{
                  flex: 1, padding: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#94a3b8',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >إلغاء</button>
              <button
                onClick={() => assignDriver(modalTeam.id, selectedDriver || null)}
                disabled={saving === modalTeam.id}
                style={{
                  flex: 2, padding: '12px',
                  background: 'linear-gradient(135deg, #00c896, #0091ea)',
                  border: 'none', borderRadius: 12,
                  color: '#fff', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                  opacity: saving === modalTeam.id ? 0.7 : 1,
                }}
              >
                {saving === modalTeam.id ? 'جاري الحفظ...' : 'تأكيد التعيين'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 30, left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#00c896' : '#ef4444',
          color: '#fff', borderRadius: 12, padding: '12px 24px',
          fontWeight: 700, fontSize: 14, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideUp .3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        input::placeholder { color: #475569; }
        input:focus { border-color: rgba(0,200,150,0.4) !important; }
        button:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
      `}</style>
    </div>
  )
}
