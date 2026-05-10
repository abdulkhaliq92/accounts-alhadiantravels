import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Plus,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

import { Logo } from './Logo'
import { useAuth } from '@/lib/auth'
import { cn, initials } from '@/lib/utils'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const session = useAuth((s) => s.session)
  const clear = useAuth((s) => s.clear)
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg">
      <SidebarShell mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onLogout={handleLogout} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-ink lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/invoice')}
              className="btn-primary"
              aria-label="New invoice"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New invoice</span>
            </button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-accent-fg">
                {initials(session?.result?.name)}
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-xs font-medium text-ink">{session?.result?.name ?? 'You'}</div>
                <div className="text-[11px] text-muted">{session?.result?.email}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarShell({
  mobileOpen,
  onClose,
  onLogout,
}: {
  mobileOpen: boolean
  onClose: () => void
  onLogout: () => void
}) {
  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-surface">
        <SidebarBody onLogout={onLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative flex h-full w-72 flex-col border-r border-border bg-surface">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-ink"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <SidebarBody onNavigate={onClose} onLogout={onLogout} />
          </aside>
        </div>
      )}
    </>
  )
}

function SidebarBody({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) {
  return (
    <>
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-ink text-accent-fg'
                  : 'text-ink hover:bg-accent-soft',
              )
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-accent-soft hover:text-ink"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  )
}
