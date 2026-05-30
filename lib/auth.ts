import type { Role } from '@/types'

interface Credential {
  password: string
  role: Role
}

export const CREDENTIALS: Record<string, Credential> = {
  ljdceo: { password: 'ljdceo45', role: 'boss' },
  ljdstaff: { password: 'ljdstaff67', role: 'staff' },
}

export function checkAuth(): { username: string; role: Role } | null {
  if (typeof window === 'undefined') return null
  const role = localStorage.getItem('role') as Role | null
  const username = localStorage.getItem('username')
  if (!role || !username) return null
  return { username, role }
}
