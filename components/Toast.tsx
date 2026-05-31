'use client'

import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  removing: boolean
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, message, removing: false }])

    setTimeout(() => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, removing: true } : t)))
    }, 2700)

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3100)
  }, [])

  return { toasts, showToast }
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 right-4 sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl text-base font-semibold min-w-[260px] max-w-sm transition-all duration-300 ${
            toast.removing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          } ${
            toast.type === 'success'
              ? 'bg-green-600 border border-green-500 text-white'
              : 'bg-red-600 border border-red-500 text-white'
          }`}
          style={{
            animation: toast.removing
              ? undefined
              : 'toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <span className="text-xl shrink-0">
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <p className="leading-snug">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}
