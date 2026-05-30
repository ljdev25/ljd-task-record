'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAuth } from '@/lib/auth'

export default function StaffDashboardPage() {
  const router = useRouter()
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const auth = checkAuth()
    if (!auth || auth.role !== 'staff') {
      router.replace('/')
    } else {
      setVerified(true)
    }
  }, [router])

  if (!verified) return null

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-6">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">Staff Dashboard</h1>
        <p className="mt-2 text-slate-400 text-lg">Coming Phase 2</p>
        <button
          onClick={() => {
            localStorage.clear()
            router.push('/')
          }}
          className="mt-8 rounded-xl border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-400 transition hover:border-slate-400 hover:text-white"
        >
          Log Keluar
        </button>
      </div>
    </div>
  )
}
