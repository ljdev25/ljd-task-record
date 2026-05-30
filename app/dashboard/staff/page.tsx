'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAuth } from '@/lib/auth'
import { getStaffTasks } from '@/lib/tasks'
import type { Task, Priority, Status } from '@/types'

/* ─── helpers ─── */

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: '🔴 Urgent',
  asap: '🟡 ASAP',
  normal: '🟢 Normal',
}

const PRIORITY_BADGE: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-700 border border-red-200',
  asap: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  normal: 'bg-green-100 text-green-700 border border-green-200',
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Belum Mula',
  in_progress: 'Sedang Berjalan',
  done: 'Selesai',
}

const STATUS_BADGE: Record<Status, string> = {
  pending: 'bg-slate-100 text-slate-600 border border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border border-blue-200',
  done: 'bg-green-100 text-green-700 border border-green-200',
}

/* ─── sub-components ─── */

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_BADGE[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  )
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function TaskCard({ task }: { task: Task }) {
  const dueDateStr = task.due_date
    ? new Date(task.due_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const isOverdue =
    task.due_date &&
    task.status !== 'done' &&
    new Date(task.due_date) < new Date(new Date().toDateString())

  return (
    <div className={`bg-white rounded-2xl border shadow-sm px-5 py-5 sm:px-6 sm:py-6 ${isOverdue ? 'border-red-300' : 'border-slate-200'}`}>
      {isOverdue && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">
          ⚠️ Tarikh akhir telah lepas
        </div>
      )}
      <h3 className="text-xl font-bold text-slate-900 mb-2 leading-snug">{task.title}</h3>
      {task.description && (
        <p className="text-base text-slate-600 mb-3 leading-relaxed">{task.description}</p>
      )}
      <div className="flex flex-wrap gap-2 mb-3">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {dueDateStr && (
          <span className={`text-sm ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
            📅 {dueDateStr}
          </span>
        )}
        {task.attachment_url && (
          <a
            href={task.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            📎 {task.attachment_name || 'Buka Lampiran'}
          </a>
        )}
      </div>
    </div>
  )
}

/* ─── main page ─── */

export default function StaffDashboardPage() {
  const router = useRouter()

  const [verified, setVerified] = useState(false)
  const [username, setUsername] = useState('ljdstaff')

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  /* auth check */
  useEffect(() => {
    const auth = checkAuth()
    if (!auth || auth.role !== 'staff') {
      router.replace('/')
    } else {
      setUsername(auth.username)
      setVerified(true)
    }
  }, [router])

  /* fetch tasks */
  const fetchTasks = useCallback(async (user: string) => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getStaffTasks(user)
      setTasks(data)
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Ralat tidak diketahui')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (verified) fetchTasks(username)
  }, [verified, username, fetchTasks])

  function handleLogout() {
    localStorage.clear()
    router.push('/')
  }

  if (!verified) return null

  /* stats */
  const total = tasks.length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const pendingCount = tasks.filter(t => t.status === 'pending').length

  /* ─── render ─── */
  return (
    <div className="min-h-screen bg-[#0F172A]">

      {/* ── Header ── */}
      <header className="bg-[#1E293B] border-b border-slate-700/50 px-4 py-5 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Selamat Datang, Staff</h1>
              <p className="text-sm text-slate-400">Task Tracker — LJD Corporation</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Keluar
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-slate-600/40 bg-slate-800/60 px-5 py-4">
            <p className="text-4xl font-bold text-white leading-none">{total}</p>
            <p className="mt-2 text-sm font-medium text-slate-400">Jumlah Task</p>
          </div>
          <div className="rounded-2xl border border-blue-500/30 bg-blue-600/20 px-5 py-4">
            <p className="text-4xl font-bold text-blue-300 leading-none">{inProgressCount}</p>
            <p className="mt-2 text-sm font-medium text-blue-400">Sedang Berjalan</p>
          </div>
          <div className="rounded-2xl border border-green-500/30 bg-green-600/20 px-5 py-4">
            <p className="text-4xl font-bold text-green-300 leading-none">{doneCount}</p>
            <p className="mt-2 text-sm font-medium text-green-400">Selesai</p>
          </div>
        </div>

        {/* ── Section heading ── */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Task Saya</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-slate-700 px-3 py-1 text-sm font-medium text-slate-300">
              {pendingCount} belum mula
            </span>
          )}
        </div>

        {/* ── Fetch error ── */}
        {fetchError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-950/50 border border-red-800/50 px-4 py-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-300">Ralat memuat data</p>
              <p className="text-sm text-red-400 mt-0.5">{fetchError}</p>
            </div>
          </div>
        )}

        {/* ── Task list ── */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-base">Memuatkan task...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-4">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-400 text-base text-center">
              Tiada task diberikan lagi.<br />Sila hubungi Encik Ahmad.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* ── Read-only notice ── */}
        {!loading && tasks.length > 0 && (
          <p className="mt-8 text-center text-sm text-slate-600">
            Paparan sahaja — hubungi Encik Ahmad untuk sebarang perubahan task.
          </p>
        )}
      </main>
    </div>
  )
}
