'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAuth } from '@/lib/auth'
import { getStaffTasks, updateTaskStatus, updateTaskAttachment } from '@/lib/tasks'
import { getComments, addComment } from '@/lib/comments'
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

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, asap: 1, normal: 2 }

const TABS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

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

function getAuthorLabel(author: string): string {
  if (author === 'ljdceo') return 'Boss'
  if (author === 'ljdstaff') return 'Staff'
  return author
}

/* ─── skeleton ─── */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#F3F4F6] p-4 animate-pulse" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

/* ─── SVG icons ─── */

function IconList({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  )
}

function IconComment({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.74v6.516z" />
    </svg>
  )
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  )
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconWarning({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function IconInbox({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.1 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  )
}

/* ─── StaffTaskCard ─── */

interface StaffTaskCardProps {
  task: Task
  username: string
  onStatusChange: (taskId: string, newStatus: Status) => void
  onAttachmentChange: (taskId: string, url: string | null, name: string | null) => void
  onToast: (message: string, type: 'success' | 'error') => void
}

function StaffTaskCard({
  task,
  username,
  onStatusChange,
  onAttachmentChange,
  onToast,
}: StaffTaskCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  const [showAttachInput, setShowAttachInput] = useState(false)
  const [attachUrl, setAttachUrl] = useState('')
  const [attachName, setAttachName] = useState('')
  const [savingAttach, setSavingAttach] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)

  const commentEndRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue =
    task.due_date &&
    task.status !== 'done' &&
    new Date(task.due_date) < today

  const dueDateStr = task.due_date ? formatDate(task.due_date) : null

  async function handleToggleComments() {
    if (!showComments) {
      setShowComments(true)
      setLoadingComments(true)
      try {
        const data = await getComments(task.id)
        setComments(data)
      } catch {
        /* silently fail — comment list will be empty */
      } finally {
        setLoadingComments(false)
      }
    } else {
      setShowComments(false)
    }
  }

  useEffect(() => {
    if (showComments && !loadingComments && commentEndRef.current) {
      commentEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [comments, showComments, loadingComments])

  async function handleSendComment() {
    const text = newComment.trim()
    if (!text || submitting) return
    setSubmitting(true)
    setCommentError(null)
    try {
      const comment = await addComment(task.id, username, text)
      setComments(prev => [...prev, comment])
      setNewComment('')
      onToast('Comment added!', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setCommentError(msg)
      onToast('Failed to send comment. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveAttachment() {
    const url = attachUrl.trim()
    if (!url || savingAttach) return
    setSavingAttach(true)
    setAttachError(null)
    try {
      await updateTaskAttachment(task.id, url, attachName.trim() || null)
      onAttachmentChange(task.id, url, attachName.trim() || null)
      setShowAttachInput(false)
      setAttachUrl('')
      setAttachName('')
      onToast('Attachment saved!', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setAttachError(msg)
      onToast('Failed to save attachment. Please try again.', 'error')
    } finally {
      setSavingAttach(false)
    }
  }

  return (
    <div
      className="bg-white rounded-xl border border-[#F3F4F6] hover:border-blue-100 transition flex overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Priority bar */}
      <div className={`w-[3px] shrink-0 ${PRIORITY_BAR[task.priority]}`} />

      <div className="flex-1 min-w-0">
        {/* Card body */}
        <div className="p-4">
          {/* Top row: title + priority badge */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">{task.title}</h3>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${PRIORITY_BADGE[task.priority]}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">{task.description}</p>
          )}

          {/* Due date */}
          {dueDateStr && (
            <div className={`flex items-center gap-1.5 mb-2 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              <IconCalendar className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">{dueDateStr}</span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 text-xs font-semibold text-red-600">
                  <IconWarning className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>
          )}

          {/* Attachment section */}
          <div className="mb-3">
            {task.attachment_url && !showAttachInput ? (
              <div className="flex items-center gap-2 flex-wrap">
                <IconLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a
                  href={task.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  {task.attachment_name || 'Open Attachment'}
                </a>
                <button
                  onClick={() => {
                    setShowAttachInput(true)
                    setAttachUrl(task.attachment_url ?? '')
                    setAttachName(task.attachment_name ?? '')
                    setAttachError(null)
                  }}
                  className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition"
                >
                  Change
                </button>
              </div>
            ) : !showAttachInput ? (
              <button
                onClick={() => { setShowAttachInput(true); setAttachError(null) }}
                className="flex items-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-500 rounded-lg px-3 py-2 transition w-full"
              >
                <IconLink className="w-3.5 h-3.5 shrink-0" />
                Add Google Drive link...
              </button>
            ) : null}

            {showAttachInput && (
              <div className="flex flex-col gap-2">
                <input
                  type="url"
                  value={attachUrl}
                  onChange={e => setAttachUrl(e.target.value)}
                  placeholder="Paste Google Drive link..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <input
                  type="text"
                  value={attachName}
                  onChange={e => setAttachName(e.target.value)}
                  placeholder="File name (e.g. Report_May.pdf)"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                />
                {attachError && (
                  <p className="text-xs text-red-600">{attachError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAttachment}
                    disabled={savingAttach || !attachUrl.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {savingAttach ? 'Saving...' : 'Save Link'}
                  </button>
                  <button
                    onClick={() => { setShowAttachInput(false); setAttachUrl(''); setAttachName(''); setAttachError(null) }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 flex-wrap">
            {task.status === 'pending' && (
              <button
                onClick={() => onStatusChange(task.id, 'in_progress')}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                <IconPlay className="w-3.5 h-3.5" />
                Start Task
              </button>
            )}
            {task.status === 'in_progress' && (
              <button
                onClick={() => onStatusChange(task.id, 'done')}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition"
              >
                <IconCheckCircle className="w-3.5 h-3.5" />
                Mark as Done
              </button>
            )}
            {task.status === 'done' && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                <IconCheckCircle className="w-3.5 h-3.5" />
                Completed
              </span>
            )}

            <button
              onClick={handleToggleComments}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                showComments
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <IconComment className="w-3.5 h-3.5" />
              Comment{comments.length > 0 ? ` (${comments.length})` : ''}
            </button>
          </div>
        </div>

        {/* Comment section */}
        {showComments && (
          <div className="bg-gray-50 rounded-b-xl border-t border-[#F3F4F6] px-4 py-4">
            {loadingComments ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs text-gray-500">Loading comments...</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 mb-3 max-h-60 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                      <IconComment className="w-8 h-8 text-gray-300" />
                      <p className="text-xs text-gray-400 text-center">No comments yet. Be the first to comment!</p>
                    </div>
                  ) : (
                    comments.map(comment => (
                      <div
                        key={comment.id}
                        className={`rounded-xl px-3 py-2.5 ${
                          comment.author === 'ljdceo'
                            ? 'bg-blue-50 border border-blue-100'
                            : 'bg-white border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                            comment.author === 'ljdceo' ? 'bg-blue-600' : 'bg-green-600'
                          }`}>
                            {comment.author === 'ljdceo' ? 'B' : 'S'}
                          </div>
                          <span className="text-xs font-bold text-gray-800">
                            {getAuthorLabel(comment.author)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                  <div ref={commentEndRef} />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => { setNewComment(e.target.value); setCommentError(null) }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendComment()
                        }
                      }}
                      placeholder="Write a comment..."
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                    <button
                      onClick={handleSendComment}
                      disabled={submitting || !newComment.trim()}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shrink-0"
                    >
                      {submitting ? '...' : 'Send'}
                    </button>
                  </div>
                  {commentError && (
                    <p className="text-xs text-red-600">{commentError}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── main page ─── */

export default function StaffDashboardPage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()

  const [verified, setVerified] = useState(false)
  const [username, setUsername] = useState('ljdstaff')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Status>('pending')

  /* auth — role guard */
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
      setFetchError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (verified) fetchTasks(username)
  }, [verified, username, fetchTasks])

  /* optimistic status update */
  async function handleStatusChange(taskId: string, newStatus: Status) {
    const prevTasks = tasks
    const prevTab = activeTab
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)))
    setActiveTab(newStatus)
    try {
      await updateTaskStatus(taskId, newStatus)
      showToast('Status updated!', 'success')
    } catch {
      setTasks(prevTasks)
      setActiveTab(prevTab)
      showToast('Failed to update status. Please try again.', 'error')
    }
  }

  function handleAttachmentChange(taskId: string, url: string | null, name: string | null) {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, attachment_url: url, attachment_name: name } : t)),
    )
  }

  function handleLogout() {
    localStorage.clear()
    router.push('/')
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const doneCount = tasks.filter(t => t.status === 'done').length

  const filteredTasks = useMemo(
    () =>
      [...tasks]
        .filter(t => t.status === activeTab)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [tasks, activeTab],
  )

  const tabCounts: Record<Status, number> = {
    pending: pendingCount,
    in_progress: inProgressCount,
    done: doneCount,
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
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition text-left border-l-[3px] bg-blue-50 text-blue-600 border-blue-600"
            >
              <IconList className="w-4 h-4" />
              My Tasks
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left border-l-[3px] text-gray-600 hover:bg-gray-50 border-transparent"
            >
              <IconSettings className="w-4 h-4" />
              Settings
            </button>
          </nav>

          {/* User */}
          <div className="px-4 py-4 border-t border-[#F3F4F6]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                STF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">Staff</p>
                <p className="text-xs text-gray-400 truncate">ljdstaff</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="text-gray-400 hover:text-red-500 transition shrink-0"
              >
                <IconLogout className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </>

      {/* ── TOPBAR ── */}
      <header
        className="fixed top-0 right-0 z-20 bg-white border-b border-[#F3F4F6] flex items-center justify-between px-4"
        style={{ left: 0, height: '52px' }}
      >
        <div className="flex items-center gap-3">
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
            className="text-sm font-semibold text-gray-900"
            style={{ marginLeft: 'calc(220px - 16px)' }}
          >
            My Tasks
          </h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
          S
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main
        className="min-h-screen bg-[#F9FAFB]"
        style={{ marginLeft: '220px', padding: '24px', paddingTop: 'calc(52px + 24px)' }}
      >
        <style>{`@media (max-width: 767px) { main { margin-left: 0 !important; } }`}</style>

        {/* Stats row */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* To Do */}
            <div className="bg-white rounded-xl border border-[#F3F4F6] p-4 flex flex-col gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-500">To Do</p>
                  <p className="text-3xl font-bold leading-none text-gray-900">{pendingCount}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <IconList className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white rounded-xl border border-[#F3F4F6] p-4 flex flex-col gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-3xl font-bold leading-none text-blue-600">{inProgressCount}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <IconClock className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white rounded-xl border border-[#F3F4F6] p-4 flex flex-col gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-3xl font-bold leading-none text-green-600">{doneCount}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <IconCheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab navigation */}
        <div
          className="bg-white rounded-xl border border-[#F3F4F6] p-1 mb-6 overflow-x-auto"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex gap-1">
            {TABS.map(tab => {
              const count = tabCounts[tab.key]
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-xs px-1.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fetch error */}
        {fetchError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-4">
            <IconWarning className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Error loading tasks</p>
              <p className="text-xs text-red-600 mt-0.5">{fetchError}</p>
            </div>
            <button
              onClick={() => fetchTasks(username)}
              className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3">
            {activeTab === 'pending' && <IconInbox className="w-10 h-10 text-gray-300" />}
            {activeTab === 'in_progress' && <IconClock className="w-10 h-10 text-gray-300" />}
            {activeTab === 'done' && <IconCheckCircle className="w-10 h-10 text-gray-300" />}
            <p className="text-sm text-gray-400 font-medium">
              {activeTab === 'pending' && 'No pending tasks.'}
              {activeTab === 'in_progress' && 'No tasks in progress.'}
              {activeTab === 'done' && 'No completed tasks yet.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTasks.map(task => (
              <StaffTaskCard
                key={task.id}
                task={task}
                username={username}
                onStatusChange={handleStatusChange}
                onAttachmentChange={handleAttachmentChange}
                onToast={showToast}
              />
            ))}
          </div>
        )}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
