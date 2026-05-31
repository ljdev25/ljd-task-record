'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CREDENTIALS } from '@/lib/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      const cred = CREDENTIALS[username.trim()]
      if (cred && cred.password === password) {
        localStorage.setItem('role', cred.role)
        localStorage.setItem('username', username.trim())
        router.push(cred.role === 'boss' ? '/dashboard/boss' : '/dashboard/staff')
      } else {
        setError('Invalid username or password. Please try again.')
        setLoading(false)
      }
    }, 800)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #BAD9F5 0%, #D6EAF8 40%, #EBF5FB 100%)' }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Background cloud circles */}
      <div
        className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'white', opacity: 0.4 }}
      />
      <div
        className="absolute bottom-[-60px] right-[-60px] w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'white', opacity: 0.3 }}
      />

      {/* Card */}
      <div className="w-full relative z-10" style={{ maxWidth: 420 }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 24,
            boxShadow: '0 8px 32px rgba(100,150,200,0.15)',
            padding: 40,
          }}
        >
          {/* Company Logo */}
          <div className="flex justify-center" style={{ marginBottom: 20 }}>
            <Image
              src="/ljd.png"
              alt="LJD Corporation Logo"
              width={80}
              height={80}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

          {/* Title */}
          <h1 className="font-bold text-2xl text-center" style={{ color: '#111827' }}>
            LJD TASK MANAGEMENT 
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-center" style={{ color: '#6B7280', marginTop: 6, marginBottom: 28 }}>
           Sign in with username
          </p>

          <form onSubmit={handleSubmit}>
            {/* Username field */}
            <div style={{ marginBottom: 12 }}>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    padding: '13px 16px 13px 44px',
                    fontSize: 15,
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 8 }}>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    padding: '13px 44px 13px 44px',
                    fontSize: 15,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p
                className="text-sm text-red-500"
                style={{ animation: 'fadeIn 0.25s ease-out', marginBottom: 16 }}
              >
                {error}
              </p>
            )}

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold text-base transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ borderRadius: 12, padding: '13px', border: 'none' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Get Started'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-xs text-center" style={{ color: '#9CA3AF', marginTop: 24 }}>
            &copy; 2026 LJD Corporation. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
