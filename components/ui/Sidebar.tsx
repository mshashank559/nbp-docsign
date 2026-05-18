'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserRole } from '@/lib/use-user-role'

export default function Sidebar({ docType, fields = {}, onChange }: any) {
  const pathname = usePathname()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const { role, email } = useUserRole()

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDarkMode])

  const NAV = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/new', label: 'New Document' },
    { href: '/dashboard/settings', label: 'Settings' },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-brand-900 border-r border-gray-200 dark:border-gray-800 w-72 shrink-0 z-20">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-brand-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
            <img src="/nb-logo.png" alt="NetBounce Placement logo" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-brand-900 dark:text-white leading-tight">DocSign</h1>
            <p className="text-[10px] text-gray-500 uppercase font-medium">NetBounce Placement</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                pathname === item.href 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-6 bg-white dark:bg-brand-900 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Dark Mode</span>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-5 bg-gray-200 dark:bg-blue-900 rounded-full relative">
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isDarkMode ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 text-blue-800 rounded-full flex items-center justify-center text-[10px] font-bold">{role === 'HR' ? 'HR' : 'AC'}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-brand-900 dark:text-white truncate">{email || 'Signed in user'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
