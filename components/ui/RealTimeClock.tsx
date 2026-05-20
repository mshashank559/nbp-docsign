'use client'
import { useState, useEffect } from 'react'

export default function RealTimeClock() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!time) return null

  const hh = time.getHours()
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const h12 = String(hh % 12 || 12).padStart(2, '0')

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1,
      userSelect: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 4,
        fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
          color: 'var(--nb-blue)', lineHeight: 1,
        }}>
          {h12}:{mm}
        </span>
        <span style={{
          fontSize: 16, fontWeight: 700, color: 'var(--nb-blue)', lineHeight: 1,
          opacity: 0.85,
        }}>
          :{ss}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-2)',
          letterSpacing: '0.08em', lineHeight: 1,
        }}>
          {ampm}
        </span>
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.02em' }}>
        {dateStr}
      </span>
    </div>
  )
}
