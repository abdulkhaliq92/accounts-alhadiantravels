import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { isAdmin, useAuth } from '@/lib/auth'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useAuth((s) => s.session)

  if (!isAdmin(session)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
