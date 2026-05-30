'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAuth } from '@/lib/auth'
import { getAllTasks, createTask, updateTask, deleteTask } from '@/lib/tasks'
import type { Task, Priority, Status, Role } from '@/types'

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

/* ─── form state ─── */

interface FormState {
  title: string
  description: string
  priority: Priority
  status: Status
  due_date: string
  attachment_url: string
  attachment_name: string
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  priority: 'normal',
  status: 'pending',
  due_date: '',
  attachment_url: '',
  attachment_name: '',
}

/* ─── sub-components ─── */

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-2xl border px-5 py-4 ${accent}`}>
      <p className="text-4xl font-bold leading-none">{value}</p>
      <p className="mt-2 text-sm font-medium opacity-80">{label}</p>
    </div>
  )
}

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

function TaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: () => void; onDelete: () => void }) {
  const dueDateStr = task.due_date
    ? new Date(task.due_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
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
              <span className="text-sm text-slate-500">📅 {dueDateStr}</span>
            )}
            {task.attachment_url && (
              <a
                href={task.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                📎 {task.attachment_name || 'Lampiran'}
              </a>
            )}
          </div>
        </div>
        {/* Actions */}
        <div className="flex sm:flex-col gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
          >
            🗑️ Padam
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── main page ─── */

export default function BossDashboardPage() {
  const router = useRouter()

  const [verified, setVerified] = useState(false)
  const [username, setUsername] = useState('ljdceo')

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // modal
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  /* auth check */
  useEffect(() => {
    const auth = checkAuth()
    if (!auth || auth.role !== 'boss') {
      router.replace('/')
    } else {
      setUsername(auth.username)
      setVerified(true)
    }
  }, [router])

  /* fetch tasks */
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getAllTasks()
      setTasks(data)
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Ralat tidak diketahui')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (verified) fetchTasks()
  }, [verified, fetchTasks])

  /* modal helpers */
  function openCreate() {
    setEditingTask(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
    setShowModal(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ?? '',
      attachment_url: task.attachment_url ?? '',
      attachment_name: task.attachment_name ?? '',
    })
    setSaveError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingTask(null)
    setSaveError(null)
  }

  /* save handler */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
        assigned_to: 'ljdstaff',
        attachment_url: form.attachment_url.trim() || null,
        attachment_name: form.attachment_name.trim() || null,
        created_by: username,
      }
      if (editingTask) {
        await updateTask(editingTask.id, payload)
      } else {
        await createTask(payload)
      }
      closeModal()
      await fetchTasks()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Gagal menyimpan task')
    } finally {
      setSaving(false)
    }
  }

  /* delete handler */
  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTask(deleteId)
      setDeleteId(null)
      await fetchTasks()
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Gagal memadam task')
    } finally {
      setDeleting(false)
    }
  }

  function handleLogout() {
    localStorage.clear()
    router.push('/')
  }

  if (!verified) return null

  /* stats */
  const total = tasks.length
  const urgentCount = tasks.filter(t => t.priority === 'urgent').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const doneCount = tasks.filter(t => t.status === 'done').length

  /* ─── render ─── */
  return (
    <div className="min-h-screen bg-[#0F172A]">

      {/* ── Header ── */}
      <header className="bg-[#1E293B] border-b border-slate-700/50 px-4 py-5 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Selamat Datang, Encik Ahmad</h1>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Jumlah Task" value={total} accent="bg-blue-600/20 text-blue-300 border-blue-500/30" />
          <StatCard label="Urgent" value={urgentCount} accent="bg-red-600/20 text-red-300 border-red-500/30" />
          <StatCard label="Sedang Berjalan" value={inProgressCount} accent="bg-yellow-600/20 text-yellow-300 border-yellow-500/30" />
          <StatCard label="Selesai" value={doneCount} accent="bg-green-600/20 text-green-300 border-green-500/30" />
        </div>

        {/* ── Action row ── */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Senarai Task</h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-blue-500 active:scale-[0.98]"
          >
            ➕ Tambah Task Baru
          </button>
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
              Tiada task lagi.<br />Tekan &ldquo;Tambah Task Baru&rdquo; untuk mulakan.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => openEdit(task)}
                onDelete={() => { setDeleteError(null); setDeleteId(task.id) }}
              />
            ))}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════
          Task Modal (Create / Edit)
      ══════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 sm:py-12"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTask ? 'Edit Task' : 'Tambah Task Baru'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-lg"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSave} className="px-6 py-6 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-1.5">
                  Tajuk Task <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Masukkan tajuk task..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-1.5">Penerangan</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Masukkan penerangan task..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Keutamaan</label>
                <div className="flex gap-2">
                  {(['urgent', 'asap', 'normal'] as Priority[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                      className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition ${
                        form.priority === p
                          ? p === 'urgent'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : p === 'asap'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-green-500 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Status</label>
                <div className="flex gap-2">
                  {(['pending', 'in_progress', 'done'] as Status[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, status: s }))}
                      className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition ${
                        form.status === s
                          ? s === 'pending'
                            ? 'border-slate-500 bg-slate-100 text-slate-700'
                            : s === 'in_progress'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-green-500 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-1.5">Tarikh Akhir</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Attachment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-1.5">URL Lampiran</label>
                  <input
                    type="text"
                    value={form.attachment_url}
                    onChange={e => setForm(p => ({ ...p, attachment_url: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-1.5">Nama Fail</label>
                  <input
                    type="text"
                    value={form.attachment_name}
                    onChange={e => setForm(p => ({ ...p, attachment_name: e.target.value }))}
                    placeholder="Dokumen Kerja.pdf"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Save error */}
              {saveError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3.5 text-base font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          Delete Confirm Dialog
      ══════════════════════════════════════ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Padam Task?</h3>
            <p className="text-base text-slate-500 text-center mb-2">
              Confirm mau delete task ni?
            </p>
            <p className="text-sm text-slate-400 text-center mb-6">
              Tindakan ini tidak boleh dibatalkan.
            </p>
            {deleteError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteError(null) }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3.5 text-base font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3.5 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
              >
                {deleting ? 'Memadamkan...' : 'Ya, Padam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
