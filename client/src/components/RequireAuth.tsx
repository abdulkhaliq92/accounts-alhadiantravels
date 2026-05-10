import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from '@/lib/auth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useAuth((s) => s.session)
  const location = useLocation()

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}
