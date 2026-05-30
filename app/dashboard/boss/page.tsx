'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAuth } from '@/lib/auth'

export default function BossDashboardPage() {
  const router = useRouter()
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const auth = checkAuth()
    if (!auth || auth.role !== 'boss') {
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">Boss Dashboard</h1>
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
