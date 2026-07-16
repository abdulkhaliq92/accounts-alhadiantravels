import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import * as api from '@/lib/api'
import type { AppUser, Permission, UserPermissions, UserRole } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  user?: AppUser | null
}

const PERMISSION_FIELDS: { key: Permission; label: string }[] = [
  { key: 'invoicesView', label: 'View invoices' },
  { key: 'invoicesCreate', label: 'Create invoices' },
  { key: 'invoicesEdit', label: 'Edit invoices' },
  { key: 'invoicesDelete', label: 'Delete invoices' },
  { key: 'customersManage', label: 'Manage customers' },
  { key: 'settingsManage', label: 'Manage settings' },
  { key: 'bankAccountsManage', label: 'Manage bank accounts' },
]

const noPermissions = (): UserPermissions =>
  PERMISSION_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: false }), {} as UserPermissions)

interface FormState {
  name: string
  email: string
  password: string
  role: UserRole
  permissions: UserPermissions
}

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  password: '',
  role: 'staff',
  permissions: noPermissions(),
})

export function UserForm({ open, onClose, user }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm())

  useEffect(() => {
    if (!open) return
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        permissions: { ...noPermissions(), ...user.permissions },
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, user])

  const create = useMutation({
    mutationFn: () =>
      api.createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        permissions: form.permissions,
      }),
    onSuccess: () => {
      toast.success('User created')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create user'),
  })

  const update = useMutation({
    mutationFn: () =>
      api.updateUser(user!._id, { name: form.name, role: form.role, permissions: form.permissions }),
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update user'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (!user && form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (user) update.mutate()
    else create.mutate()
  }

  const submitting = create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Edit user' : 'Add user'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {user ? 'Save changes' : 'Add user'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            disabled={Boolean(user)}
            hint={user ? 'Email cannot be changed' : undefined}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        {!user && (
          <Input
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="At least 6 characters. Share this with the user so they can sign in."
            required
          />
        )}

        <div className="space-y-1.5">
          <label className="label">Role</label>
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          >
            <option value="staff">Staff — permissions below apply</option>
            <option value="admin">Admin — full access, can manage users</option>
          </select>
        </div>

        {form.role === 'staff' && (
          <div className="space-y-1.5">
            <label className="label">Permissions</label>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
              {PERMISSION_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={form.permissions[f.key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        permissions: { ...form.permissions, [f.key]: e.target.checked },
                      })
                    }
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
