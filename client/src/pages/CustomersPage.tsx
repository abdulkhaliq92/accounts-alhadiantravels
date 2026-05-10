import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullSpinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { CustomerForm } from '@/components/CustomerForm'
import * as api from '@/lib/api'
import { useClients } from '@/lib/queries'
import { initials } from '@/lib/utils'
import type { Client } from '@/lib/types'

export function CustomersPage() {
  const { data: clients = [], isLoading } = useClients()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Client | null>(null)
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const del = useMutation({
    mutationFn: (id: string) => api.deleteClient(id),
    onSuccess: () => {
      toast.success('Customer deleted')
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: () => toast.error('Failed to delete'),
    onSettled: () => setConfirmId(null),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    )
  }, [clients, search])

  const startNew = () => {
    setEditing(null)
    setOpen(true)
  }
  const startEdit = (c: Client) => {
    setEditing(c)
    setOpen(true)
  }

  if (isLoading) return <FullSpinner />

  return (
    <>
      <PageHeader
        title="Customers"
        description="Your client directory"
        actions={
          <Button onClick={startNew} leftIcon={<Plus size={16} />}>
            Add customer
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No customers yet"
          description="Add your first customer to start invoicing them."
          action={
            <Button onClick={startNew} leftIcon={<Plus size={16} />}>
              Add customer
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <div className="relative w-full sm:w-72">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers…"
                className="input pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <div
                key={c._id}
                className="card group flex flex-col gap-3 p-4 transition hover:border-ink/30"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-accent-fg">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{c.name || '—'}</div>
                    <div className="truncate text-xs text-muted">{c.email || '—'}</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(c)}
                      className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-ink"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmId(c._id ?? null)}
                      className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <dl className="space-y-1 border-t border-border pt-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Phone</dt>
                    <dd className="truncate text-ink">{c.phone || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Address</dt>
                    <dd className="truncate text-right text-ink">{c.address || '—'}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      <CustomerForm open={open} onClose={() => setOpen(false)} client={editing} />

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Delete customer?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() => confirmId && del.mutate(confirmId)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Existing invoices keep the customer information they were issued with.
        </p>
      </Modal>
    </>
  )
}
