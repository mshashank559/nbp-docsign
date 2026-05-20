'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserRole } from '@/lib/use-user-role'

export default function Sidebar({ docType, fields = {}, onChange }: any) {
  const pathname = usePathname()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const { role, email } = useUserRole()

  // On mount, restore saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem('nb-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldDark = saved === 'dark' || (!saved && prefersDark)
    setIsDarkMode(shouldDark)
    if (shouldDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  function toggleDark() {
    const next = !isDarkMode
    setIsDarkMode(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('nb-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('nb-theme', 'light')
    }
  }

  const NAV = [
    { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
    { href: '/dashboard/new', label: 'New Document', icon: 'plus' },
    { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
  ]

  const initials = email ? email.slice(0, 2).toUpperCase() : (role === 'HR' ? 'HR' : 'AC')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: 260, flexShrink: 0,
      background: 'var(--sidebar-bg)', borderRight: '1px solid rgba(255,255,255,0.05)',
      zIndex: 20, overflowY: 'auto',
    }}>
      {/* Logo / Brand */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.3)',
          }}>
            <img src="/nb-monogram.png" alt="NetBounce logo" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              DocSign
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
              NetBounce Placement
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
          Navigation
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, textDecoration: 'none',
                transition: 'all 0.14s',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(30,58,250,0.85), rgba(99,102,241,0.7))'
                  : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                fontWeight: isActive ? 700 : 500, fontSize: 13.5,
                boxShadow: isActive ? '0 4px 16px rgba(30,58,250,0.35)' : 'none',
              }}>
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom: theme toggle + user */}
      <div style={{
        padding: '14px 16px 18px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Dark mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>{isDarkMode ? '🌙' : '☀️'}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {isDarkMode ? 'Dark' : 'Light'}
            </span>
          </div>
          <button
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: isDarkMode
                ? 'linear-gradient(135deg, #1E3AFA, #8b5cf6)'
                : 'rgba(255,255,255,0.18)',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'all 0.25s',
              boxShadow: isDarkMode ? '0 2px 10px rgba(30,58,250,0.5)' : 'none',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, width: 18, height: 18,
              borderRadius: '50%', background: '#ffffff',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              left: isDarkMode ? 23 : 3,
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #1E3AFA, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
            boxShadow: '0 3px 10px rgba(30,58,250,0.4)',
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email || 'Signed in'}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '1px 0 0', fontWeight: 500 }}>
              {role === 'HR' ? 'HR Manager' : 'Accounts'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function NavIcon({ name }: { name: string }) {
  const s: React.CSSProperties = { width: 16, height: 16, flexShrink: 0 }
  if (name === 'grid') return (
    <svg style={s} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
  if (name === 'plus') return (
    <svg style={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'settings') return (
    <svg style={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
  return null
}
