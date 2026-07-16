import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { KeyRound, Pencil, Plus, Power, Trash2, UserCog } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullSpinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { UserForm } from '@/components/UserForm'
import * as api from '@/lib/api'
import { getUserId, useAuth } from '@/lib/auth'
import { useUsers } from '@/lib/queries'
import { initials } from '@/lib/utils'
import type { AppUser } from '@/lib/types'

const PERMISSION_LABELS: Record<string, string> = {
  invoicesView: 'View invoices',
  invoicesCreate: 'Create invoices',
  invoicesEdit: 'Edit invoices',
  invoicesDelete: 'Delete invoices',
  customersManage: 'Manage customers',
  settingsManage: 'Manage settings',
  bankAccountsManage: 'Manage bank accounts',
}

export function UsersPage() {
  const session = useAuth((s) => s.session)
  const currentUserId = getUserId(session)
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useUsers()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null)

  const toggleActive = useMutation({
    mutationFn: (u: AppUser) => api.updateUser(u._id, { active: !u.active }),
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update user'),
  })

  const del = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to delete user'),
    onSettled: () => setConfirmDeleteId(null),
  })

  const startNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const startEdit = (u: AppUser) => {
    setEditing(u)
    setFormOpen(true)
  }

  if (isLoading) return <FullSpinner />

  return (
    <>
      <PageHeader
        title="Users"
        description="Create staff accounts and control what they can access"
        actions={
          <Button onClick={startNew} leftIcon={<Plus size={16} />}>
            Add user
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          icon={<UserCog size={20} />}
          title="No users yet"
          description="Add your first staff account to get started."
          action={
            <Button onClick={startNew} leftIcon={<Plus size={16} />}>
              Add user
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg/50">
                <tr>
                  <th className="table-head">User</th>
                  <th className="table-head">Role</th>
                  <th className="table-head">Permissions</th>
                  <th className="table-head">Status</th>
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isSelf = u._id === currentUserId
                  const grantedPermissions = Object.entries(u.permissions ?? {})
                    .filter(([, v]) => v)
                    .map(([k]) => PERMISSION_LABELS[k] ?? k)

                  return (
                    <tr key={u._id} className="group transition hover:bg-bg/40">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-accent-fg">
                            {initials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-ink">
                              {u.name} {isSelf && <span className="text-xs text-muted">(you)</span>}
                            </div>
                            <div className="truncate text-xs text-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`chip ${u.role === 'admin' ? 'bg-accent-soft text-ink' : 'bg-bg text-muted border border-border'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </td>
                      <td className="table-cell max-w-xs text-xs text-muted">
                        {u.role === 'admin' ? 'Full access' : grantedPermissions.length ? grantedPermissions.join(', ') : 'None'}
                      </td>
                      <td className="table-cell">
                        <span className={`chip ${u.active === false ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                          {u.active === false ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(u)}
                            className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-ink"
                            aria-label="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setResetPasswordUser(u)}
                            className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-ink"
                            aria-label="Reset password"
                          >
                            <KeyRound size={16} />
                          </button>
                          <button
                            onClick={() => !isSelf && toggleActive.mutate(u)}
                            disabled={isSelf}
                            className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={u.active === false ? 'Activate' : 'Deactivate'}
                          >
                            <Power size={16} />
                          </button>
                          <button
                            onClick={() => !isSelf && setConfirmDeleteId(u._id)}
                            disabled={isSelf}
                            className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserForm open={formOpen} onClose={() => setFormOpen(false)} user={editing} />

      <ResetPasswordModal user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} />

      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete user?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() => confirmDeleteId && del.mutate(confirmDeleteId)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">This permanently removes their access. This cannot be undone.</p>
      </Modal>
    </>
  )
}

function ResetPasswordModal({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const [password, setPassword] = useState('')

  const reset = useMutation({
    mutationFn: () => api.resetUserPassword(user!._id, password),
    onSuccess: () => {
      toast.success('Password updated')
      setPassword('')
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to reset password'),
  })

  return (
    <Modal
      open={!!user}
      onClose={() => {
        setPassword('')
        onClose()
      }}
      title={`Reset password${user ? ` — ${user.name}` : ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={reset.isPending}
            onClick={() => {
              if (password.length < 6) {
                toast.error('Password must be at least 6 characters')
                return
              }
              reset.mutate()
            }}
          >
            Set new password
          </Button>
        </>
      }
    >
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="Share this with the user directly — it isn't emailed."
      />
    </Modal>
  )
}
