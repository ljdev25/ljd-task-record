'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { checkAuth } from '@/lib/auth'
import {
  getAllTasks,
  getTasksByMonth,
  searchAndFilterTasks,
  createTask,
  updateTask,
  deleteTask,
} from '@/lib/tasks'
import { getAllComments, addComment } from '@/lib/comments'
import { useToast, ToastContainer } from '@/components/Toast'
import type { Task, Comment, Priority, Status } from '@/types'

/* ─── constants ─── */

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Urgent',
  asap: 'ASAP',
  normal: 'Normal',
}

const PRIORITY_BADGE: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-700 border border-red-200',
  asap: 'bg-amber-100 text-amber-700 border border-amber-200',
  normal: 'bg-green-100 text-green-700 border border-green-200',
}

const PRIORITY_BAR: Record<Priority, string> = {
  urgent: 'bg-red-500',
  asap: 'bg-amber-400',
  normal: 'bg-green-500',
}

const PRIORITY_PILL: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-600',
  asap: 'bg-amber-100 text-amber-600',
  normal: 'bg-green-100 text-green-600',
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const STATUS_BADGE: Record<Status, string> = {
  pending: 'bg-slate-100 text-slate-600 border border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border border-blue-200',
  done: 'bg-green-100 text-green-700 border border-green-200',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ─── helpers ─── */

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getAuthorLabel(author: string): string {
  if (author === 'ljdceo') return 'Boss'
  if (author === 'ljdstaff') return 'Staff'
  return author
}

/* ─── types ─── */

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
  title: '', description: '', priority: 'normal', status: 'pending',
  due_date: '', attachment_url: '', attachment_name: '',
}

/* ─── skeleton ─── */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#F3F4F6] p-4 animate-pulse" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-8 bg-gray-100 rounded w-1/3 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  )
}

/* ─── StatCard ─── */

function StatCard({
  label, value, sub, iconBg, icon, valueColor,
}: {
  label: string
  value: number
  sub?: string
  iconBg: string
  icon: ReactNode
  valueColor: string
}) {
  return (
    <div
      className="bg-white rounded-xl border border-[#F3F4F6] p-4 flex flex-col gap-3"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold leading-none ${valueColor}`}>{value}</p>
          {sub && <p className="text-xs text-green-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

/* ─── PriorityBadge / StatusBadge ─── */

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

/* ─── CALENDAR ─── */

function Calendar({
  year, month, tasksByDate, selectedDate,
  onSelectDate, onPrevMonth, onNextMonth, onToday,
}: {
  year: number
  month: number
  tasksByDate: Record<string, Task[]>
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}) {
  const todayObj = new Date()
  const todayKey = toDateKey(todayObj.getFullYear(), todayObj.getMonth() + 1, todayObj.getDate())

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6]">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-900">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            onClick={onToday}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition"
          >
            Today
          </button>
        </div>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#F3F4F6]">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center py-2 text-xs font-semibold text-gray-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="border-b border-r border-[#F3F4F6]"
                style={{ minHeight: '72px' }}
              />
            )
          }
          const dateKey = toDateKey(year, month, day)
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDate
          const dayTasks = tasksByDate[dateKey] ?? []

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`border-b border-r border-[#F3F4F6] flex flex-col p-1.5 transition cursor-pointer text-left ${
                isSelected
                  ? 'bg-blue-50 border-blue-200'
                  : 'hover:bg-blue-50'
              }`}
              style={{ minHeight: '72px' }}
            >
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium leading-none mb-0.5 ${
                  isToday || isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700'
                }`}
              >
                {day}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-0.5 w-full">
                  {dayTasks.slice(0, 2).map((t, i) => (
                    <span
                      key={i}
                      className={`text-[9px] px-1 rounded font-medium truncate ${PRIORITY_PILL[t.priority]}`}
                    >
                      {t.title.length > 10 ? t.title.slice(0, 10) + '…' : t.title}
                    </span>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] text-gray-400 font-semibold pl-0.5">
                      +{dayTasks.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── TASK DETAIL MODAL ─── */

function TaskDetailModal({
  task,
  comments,
  username,
  onClose,
  onEdit,
  onDelete,
  onCommentAdded,
}: {
  task: Task
  comments: Comment[]
  username: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onCommentAdded: (message: string, type: 'success' | 'error') => void
}) {
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    setCommentError(null)
    try {
      await addComment(task.id, username, commentText.trim())
      setCommentText('')
      onCommentAdded('Comment added!', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setCommentError(msg)
      onCommentAdded('Failed to add comment. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold text-gray-900 leading-snug">{task.title}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {task.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
          )}

          <div className="flex flex-col gap-2">
            {task.due_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span>Due: <strong>{formatDate(task.due_date)}</strong></span>
              </div>
            )}
            {task.attachment_url && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <a
                  href={task.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 font-medium hover:underline truncate"
                >
                  {task.attachment_name || 'Open Attachment'}
                </a>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Comments */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.74v6.516z" />
              </svg>
              Comments {comments.length > 0 && `(${comments.length})`}
            </h4>
            {comments.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.74v6.516z" />
                </svg>
                <p className="text-sm text-gray-400 text-center">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map(c => (
                  <div
                    key={c.id}
                    className={`rounded-xl px-4 py-3 ${
                      c.author === 'ljdceo'
                        ? 'bg-blue-50 border border-blue-100'
                        : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        c.author === 'ljdceo' ? 'bg-blue-600' : 'bg-gray-400'
                      }`}>
                        {c.author === 'ljdceo' ? 'B' : 'S'}
                      </div>
                      <span className="text-sm font-bold text-gray-800">{getAuthorLabel(c.author)}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        <div className="border-t border-gray-100 px-6 py-4 shrink-0 bg-gray-50">
          <form onSubmit={handleAddComment} className="flex flex-col gap-2">
            <textarea
              rows={2}
              value={commentText}
              onChange={e => { setCommentText(e.target.value); setCommentError(null) }}
              placeholder="Add a comment..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition"
            />
            {commentError && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-red-600">{commentError}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                  Edit Task
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ─── TASK MODAL (create / edit) ─── */

function TaskModal({
  editingTask,
  username,
  onClose,
  onSaved,
}: {
  editingTask: Task | null
  username: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(
    editingTask
      ? {
          title: editingTask.title,
          description: editingTask.description ?? '',
          priority: editingTask.priority,
          status: editingTask.status,
          due_date: editingTask.due_date ?? '',
          attachment_url: editingTask.attachment_url ?? '',
          attachment_name: editingTask.attachment_name ?? '',
        }
      : EMPTY_FORM,
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
      onSaved()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8 sm:py-12"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Enter task title..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Enter task description..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 resize-none transition"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <div className="flex gap-2">
              {(['urgent', 'asap', 'normal'] as Priority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                  className={`flex-1 rounded-lg border-2 py-2 text-xs font-semibold transition ${
                    form.priority === p
                      ? p === 'urgent'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : p === 'asap'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <div className="flex gap-2">
              {(['pending', 'in_progress', 'done'] as Status[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, status: s }))}
                  className={`flex-1 rounded-lg border-2 py-2 text-xs font-semibold transition ${
                    form.status === s
                      ? s === 'pending'
                        ? 'border-slate-500 bg-slate-100 text-slate-700'
                        : s === 'in_progress'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          {/* Attachment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Attachment URL</label>
              <input
                type="text"
                value={form.attachment_url}
                onChange={e => setForm(p => ({ ...p, attachment_url: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">File Name</label>
              <input
                type="text"
                value={form.attachment_name}
                onChange={e => setForm(p => ({ ...p, attachment_name: e.target.value }))}
                placeholder="Document.pdf"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
          </div>

          {saveError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {saving ? 'Saving…' : editingTask ? 'Save Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── DELETE CONFIRM ─── */

function DeleteConfirm({
  onCancel, onConfirm, deleting, error,
}: {
  onCancel: () => void
  onConfirm: () => void
  deleting: boolean
  error: string | null
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Task?</h3>
        <p className="text-sm text-gray-500 text-center mb-1">Are you sure you want to delete this task?</p>
        <p className="text-xs text-gray-400 text-center mb-5">This action cannot be undone.</p>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
          >
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── TASK ROW ─── */

function TaskRow({
  task,
  commentCount,
  onClick,
}: {
  task: Task
  commentCount: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-[#F3F4F6] hover:border-blue-200 hover:shadow-sm transition flex items-stretch overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className={`w-[3px] shrink-0 ${PRIORITY_BAR[task.priority]}`} />
      <div className="flex-1 px-3 py-2.5 flex items-center gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={task.status} />
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.74v6.516z" />
              </svg>
              {commentCount}
            </span>
          )}
          {task.attachment_url && (
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}

/* ─── MAIN PAGE ─── */

export default function BossDashboardPage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()

  const [verified, setVerified] = useState(false)
  const [username, setUsername] = useState('ljdceo')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<'overview' | 'tasks' | 'calendar' | 'settings'>('overview')

  /* all data */
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [commentsByTask, setCommentsByTask] = useState<Record<string, Comment[]>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  /* calendar state */
  const todayObj = new Date()
  const [calYear, setCalYear] = useState(todayObj.getFullYear())
  const [calMonth, setCalMonth] = useState(todayObj.getMonth() + 1)
  const [monthTasks, setMonthTasks] = useState<Task[]>([])
  const [monthLoading, setMonthLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  /* filter / search */
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [filterLoading, setFilterLoading] = useState(false)
  const isFiltering = searchKeyword.trim() !== '' || filterPriority !== 'all' || filterStatus !== 'all'

  /* modals */
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  /* auth — role guard */
  useEffect(() => {
    const auth = checkAuth()
    if (!auth || auth.role !== 'boss') {
      router.replace('/')
    } else {
      setUsername(auth.username)
      setVerified(true)
    }
  }, [router])

  /* fetch all tasks + comments */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [taskData, commentData] = await Promise.all([getAllTasks(), getAllComments()])
      setAllTasks(taskData)
      const grouped: Record<string, Comment[]> = {}
      for (const c of commentData) {
        if (!grouped[c.task_id]) grouped[c.task_id] = []
        grouped[c.task_id].push(c)
      }
      setCommentsByTask(grouped)
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (verified) fetchAll()
  }, [verified, fetchAll])

  /* fetch month tasks for calendar dots */
  const fetchMonth = useCallback(async (year: number, month: number) => {
    setMonthLoading(true)
    try {
      const data = await getTasksByMonth(year, month)
      setMonthTasks(data)
    } catch {
      /* silently fail */
    } finally {
      setMonthLoading(false)
    }
  }, [])

  useEffect(() => {
    if (verified) fetchMonth(calYear, calMonth)
  }, [verified, calYear, calMonth, fetchMonth])

  /* debounced filter search */
  useEffect(() => {
    if (!isFiltering) { setFilteredTasks([]); return }
    const timer = setTimeout(async () => {
      setFilterLoading(true)
      try {
        const data = await searchAndFilterTasks(searchKeyword, filterPriority, filterStatus)
        setFilteredTasks(data)
      } catch {
        setFilteredTasks([])
      } finally {
        setFilterLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchKeyword, filterPriority, filterStatus, isFiltering])

  /* calendar task map */
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of monthTasks) {
      if (!t.due_date) continue
      if (!map[t.due_date]) map[t.due_date] = []
      map[t.due_date].push(t)
    }
    return map
  }, [monthTasks])

  /* selected-date tasks */
  const selectedDateTasks = useMemo(
    () => (selectedDate ? allTasks.filter(t => t.due_date === selectedDate) : []),
    [selectedDate, allTasks],
  )

  /* stats */
  const total = allTasks.length
  const urgentCount = allTasks.filter(t => t.priority === 'urgent').length
  const inProgressCount = allTasks.filter(t => t.status === 'in_progress').length
  const doneCount = allTasks.filter(t => t.status === 'done').length

  /* calendar navigation */
  function prevMonth() {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12) }
    else setCalMonth(m => m - 1)
    setSelectedDate(null); setSelectedTask(null)
  }

  function nextMonth() {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1) }
    else setCalMonth(m => m + 1)
    setSelectedDate(null); setSelectedTask(null)
  }

  function goToday() {
    const now = new Date()
    setCalYear(now.getFullYear())
    setCalMonth(now.getMonth() + 1)
    setSelectedDate(null); setSelectedTask(null)
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date)
    setSelectedTask(null)
  }

  /* modal helpers */
  function openCreate() {
    setEditingTask(null)
    setShowTaskModal(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setSelectedTask(null)
    setShowTaskModal(true)
  }

  function openDelete(task: Task) {
    setDeleteTarget(task)
    setDeleteError(null)
  }

  async function handleSaved() {
    const wasEditing = editingTask !== null
    setShowTaskModal(false)
    setEditingTask(null)
    await Promise.all([fetchAll(), fetchMonth(calYear, calMonth)])
    showToast(wasEditing ? 'Task updated!' : 'Task created successfully!', 'success')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTask(deleteTarget.id)
      setDeleteTarget(null)
      setSelectedTask(null)
      await Promise.all([fetchAll(), fetchMonth(calYear, calMonth)])
      showToast('Task deleted.', 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      setDeleteError(msg)
      showToast('Failed to delete. Please try again.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleCommentAdded(message: string, type: 'success' | 'error') {
    showToast(message, type)
    if (type === 'success') await fetchAll()
  }

  function handleLogout() {
    localStorage.clear()
    router.push('/')
  }

  const pageTitles = {
    overview: 'Overview',
    tasks: 'All Tasks',
    calendar: 'Calendar',
    settings: 'Settings',
  }

  if (!verified) return null

  /* ─── render ─── */
  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      {/* ── SIDEBAR ── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed top-0 left-0 h-screen z-40 flex flex-col bg-white border-r border-[#F3F4F6] transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
          style={{ width: '220px' }}
        >
          {/* Logo */}
          <div className="px-4 py-4 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Task Tracker</p>
                <p className="text-xs text-gray-400">LJD Corporation</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {([
              {
                id: 'overview',
                label: 'Overview',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
              },
              {
                id: 'tasks',
                label: 'All Tasks',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                ),
              },
              {
                id: 'calendar',
                label: 'Calendar',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                ),
              },
              {
                id: 'settings',
                label: 'Settings',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
            ] as { id: 'overview' | 'tasks' | 'calendar' | 'settings'; label: string; icon: ReactNode }[]).map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveNav(item.id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition text-left border-l-[3px] ${
                  activeNav === item.id
                    ? 'bg-blue-50 text-blue-600 font-semibold border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 border-transparent'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* User */}
          <div className="px-4 py-4 border-t border-[#F3F4F6]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                BOS
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">Boss</p>
                <p className="text-xs text-gray-400 truncate">ljdceo</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="text-gray-400 hover:text-red-500 transition shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      </>

      {/* ── TOPBAR ── */}
      <header
        className="fixed top-0 right-0 z-20 bg-white border-b border-[#F3F4F6] flex items-center justify-between px-6"
        style={{ left: 0, height: '52px', paddingLeft: '16px' }}
      >
        <div className="flex items-center gap-3" style={{ paddingLeft: '0' }}>
          {/* Hamburger (mobile) */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1
            className="text-sm font-semibold text-gray-900 md:ml-0"
            style={{ marginLeft: 'calc(220px - 16px)' }}
          >
            {pageTitles[activeNav]}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Task
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            B
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main
        className="pt-14 min-h-screen"
        style={{ marginLeft: '220px', padding: '24px', paddingTop: 'calc(52px + 24px)' }}
      >
        {/* On mobile, no margin-left */}
        <style>{`@media (max-width: 767px) { main { margin-left: 0 !important; } }`}</style>

        {/* Fetch error */}
        {fetchError && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-4 mb-6">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Error loading data</p>
              <p className="text-xs text-red-600 mt-0.5">{fetchError}</p>
            </div>
            <button
              onClick={fetchAll}
              className="shrink-0 rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── STATS ROW ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Tasks"
              value={total}
              sub={`+${total} this month`}
              iconBg="bg-slate-100"
              icon={
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              valueColor="text-gray-900"
            />
            <StatCard
              label="Urgent"
              value={urgentCount}
              iconBg="bg-red-50"
              icon={
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              }
              valueColor="text-red-600"
            />
            <StatCard
              label="In Progress"
              value={inProgressCount}
              iconBg="bg-blue-50"
              icon={
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              valueColor="text-blue-600"
            />
            <StatCard
              label="Completed"
              value={doneCount}
              iconBg="bg-green-50"
              icon={
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              valueColor="text-green-600"
            />
          </div>
        )}

        {/* ── SEARCH & FILTER BAR ── */}
        <div
          className="bg-white rounded-xl px-3 py-2.5 mb-6 flex flex-col sm:flex-row gap-3"
          style={{ border: '1px solid #F3F4F6', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          {/* Search */}
          <div className="relative sm:w-[40%]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
            </svg>
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="Search tasks by title..."
              className="w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-4 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="asap">ASAP</option>
            <option value="normal">Normal</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as Status | 'all')}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Statuses</option>
            <option value="pending">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>

          {isFiltering && (
            <button
              onClick={() => { setSearchKeyword(''); setFilterPriority('all'); setFilterStatus('all') }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── FILTER LIST VIEW ── */}
        {isFiltering ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {filterLoading ? 'Searching…' : `Search Results (${filteredTasks.length})`}
              </h2>
              <button
                onClick={() => { setSearchKeyword(''); setFilterPriority('all'); setFilterStatus('all') }}
                className="text-sm text-blue-600 hover:underline"
              >
                ← Back to Calendar
              </button>
            </div>

            {filterLoading ? (
              <div className="space-y-3">
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
                </svg>
                <p className="text-base text-gray-400 font-medium">No tasks found for your search.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    commentCount={(commentsByTask[task.id] ?? []).length}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            )}
          </div>

        ) : (
          /* ── CALENDAR VIEW ── */
          <div className="space-y-4">
            {monthLoading && !loading && (
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                Loading calendar…
              </div>
            )}

            <Calendar
              year={calYear}
              month={calMonth}
              tasksByDate={tasksByDate}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onToday={goToday}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 px-1">
              <span className="text-xs text-gray-400">Legend:</span>
              {([
                { p: 'urgent' as Priority, label: 'Urgent', color: 'text-red-400' },
                { p: 'asap' as Priority, label: 'ASAP', color: 'text-amber-400' },
                { p: 'normal' as Priority, label: 'Normal', color: 'text-green-400' },
              ]).map(({ p, label, color }) => (
                <div key={p} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 8 8" className={`w-2 h-2 ${color}`}>
                    <circle cx="4" cy="4" r="4" fill="currentColor" />
                  </svg>
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              ))}
            </div>

            {/* Selected-date task list */}
            {selectedDate && (
              <div
                className="bg-white rounded-xl p-5"
                style={{ border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900">
                    Tasks for {formatDate(selectedDate)}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-600">
                    {selectedDateTasks.length}
                  </span>
                </div>

                {selectedDateTasks.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.1 13.177a2.25 2.25 0 00-.1.661z" />
                    </svg>
                    <p className="text-sm text-gray-400">No tasks for this date.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        commentCount={(commentsByTask[task.id] ?? []).length}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          comments={commentsByTask[selectedTask.id] ?? []}
          username={username}
          onClose={() => setSelectedTask(null)}
          onEdit={() => openEdit(selectedTask)}
          onDelete={() => { openDelete(selectedTask); setSelectedTask(null) }}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {/* Task modal */}
      {showTaskModal && (
        <TaskModal
          editingTask={editingTask}
          username={username}
          onClose={() => { setShowTaskModal(false); setEditingTask(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
          onConfirm={handleDelete}
          deleting={deleting}
          error={deleteError}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
