'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const supabase = createClient()
  const organizationEmail = 'enroll@netbounceplacement.com'
  const [user, setUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [theme, setTheme] = useState('light')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'Not configured'
  const [copied, setCopied] = useState(false)
  const [gmailStatus, setGmailStatus] = useState<{ configured: boolean; senderEmail: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setDisplayName(data.user?.user_metadata?.display_name || data.user?.email?.split('@')[0] || '')
    })
    const saved = localStorage.getItem('theme') || 'light'
    setTheme(saved)
    fetch('/api/check-gmail')
      .then(res => res.json())
      .then(data => setGmailStatus({ configured: !!data.configured, senderEmail: data.senderEmail || '' }))
      .catch(() => setGmailStatus({ configured: false, senderEmail: '' }))
  }, [])

  function applyTheme(t: string) {
    setTheme(t)
    localStorage.setItem('theme', t)
    if (t === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  async function saveName() {
    setSavingName(true)
    await supabase.auth.updateUser({ data: { display_name: displayName } })
    setSavingName(false)
  }

  async function changePassword() {
    setPwError(''); setPwSuccess(false)
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) setPwError(error.message)
    else { setPwSuccess(true); setNewPw(''); setConfirmPw('') }
  }

  const THEME_OPTIONS = [
    { key: 'light', label: '☀️ Light' },
    { key: 'dark', label: '🌙 Dark' },
    { key: 'system', label: '💻 System' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: '680px', width: '100%' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Manage your account and preferences</p>
      </div>

      {/* Account */}
      <SettingsCard title="Account" icon="👤" accent="#6366f1">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FieldGroup label="Display name">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" style={{ fontSize: '14px', flex: 1 }} />
              <button onClick={saveName} disabled={savingName} className="btn btn-primary" style={{ borderRadius: '10px', padding: '10px 18px', fontSize: '13px' }}>
                {savingName ? '…' : 'Save'}
              </button>
            </div>
          </FieldGroup>
          <FieldGroup label="Organization email address">
            <input value={gmailStatus?.senderEmail || organizationEmail} readOnly className="input" style={{ fontSize: '14px', background: 'var(--page-bg)', color: 'var(--text-3)', cursor: 'not-allowed' }} />
          </FieldGroup>
        </div>
      </SettingsCard>

      {/* Password */}
      <SettingsCard title="Change Password" icon="🔑" accent="#10b981">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pwError && <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#f43f5e', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>{pwError}</div>}
          {pwSuccess && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 500 }}>✓ Password updated successfully</div>}
          <FieldGroup label="New password">
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Minimum 8 characters" className="input" style={{ fontSize: '14px' }} />
          </FieldGroup>
          <FieldGroup label="Confirm new password">
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" className="input" style={{ fontSize: '14px' }} />
          </FieldGroup>
          <button onClick={changePassword} className="btn btn-emerald" style={{ borderRadius: '10px', padding: '11px 20px', fontSize: '14px', alignSelf: 'flex-start' }}>
            Update password
          </button>
        </div>
      </SettingsCard>

      {/* Appearance */}
      <SettingsCard title="Appearance" icon="🎨" accent="#8b5cf6">
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 12px' }}>Choose your preferred theme</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {THEME_OPTIONS.map(t => (
              <button key={t.key} onClick={() => applyTheme(t.key)} style={{
                padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
                border: `2px solid ${theme === t.key ? '#8b5cf6' : 'var(--border)'}`,
                background: theme === t.key ? '#f5f3ff' : 'var(--surface)',
                color: theme === t.key ? '#8b5cf6' : 'var(--text-2)',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: theme === t.key ? '0 4px 12px rgba(139,92,246,0.2)' : 'none',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>

      {/* Gmail */}
      <SettingsCard title="Gmail Integration" icon="📧" accent="#f97316" badge={!gmailStatus ? { label: 'Checking', color: '#64748b', bg: '#f1f5f9' } : gmailStatus.configured ? { label: 'Connected', color: '#059669', bg: '#ecfdf5' } : { label: 'Not configured', color: '#d97706', bg: '#fffbeb' }}>
        {!gmailStatus ? (
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>Checking Gmail configuration...</p>
        ) : gmailStatus.configured ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Gmail is connected</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>Signing emails sent from {gmailStatus.senderEmail || 'your NPB address'}</p>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 12px' }}>Add these 4 environment variables in Vercel to enable email sending:</p>
            <div style={{ background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_SENDER_EMAIL'].map(k => (
                <div key={k} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#f97316', fontWeight: 600 }}>{k}</span>
                  <span style={{ color: 'var(--text-3)' }}>= your value</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingsCard>

      {/* Signing URL */}
      <SettingsCard title="Signing URL" icon="🔗" accent="#0ea5e9">
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 10px' }}>Base URL used in all signing links sent to clients</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-1)' }}>{appUrl}</div>
            <button onClick={async () => { await navigator.clipboard.writeText(appUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="btn btn-ghost" style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', flexShrink: 0 }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* Danger zone */}
      <div style={{ background: '#fff1f2', border: '2px solid #fecdd3', borderRadius: '16px', padding: '20px 24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f43f5e', margin: '0 0 4px' }}>Danger zone</h3>
        <p style={{ fontSize: '13px', color: '#9f1239', margin: '0 0 14px' }}>These actions are irreversible. Proceed with caution.</p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} style={{ padding: '10px 18px', borderRadius: '10px', background: '#f43f5e', color: 'white', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>
          Sign out of all sessions
        </button>
      </div>
    </div>
  )
}

function SettingsCard({ title, icon, accent, badge, children }: { title: string; icon: string; accent: string; badge?: { label: string; color: string; bg: string }; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', marginBottom: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{icon}</div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{title}</h3>
        </div>
        {badge && <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', background: badge.bg, color: badge.color }}>{badge.label}</span>}
      </div>
      <div style={{ padding: '20px 22px' }}>{children}</div>
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}
