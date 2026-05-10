import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isAfter, isPast } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullSpinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import * as api from '@/lib/api'
import { useInvoices } from '@/lib/queries'
import { cn, deriveStatus, toCommas } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

const FILTERS = ['All', 'Paid', 'Partial', 'Unpaid', 'Overdue'] as const
type Filter = (typeof FILTERS)[number]

type SortKey = 'number' | 'client' | 'amount' | 'due' | 'status' | 'created'
type SortDir = 'asc' | 'desc'

const STATUS_RANK: Record<string, number> = {
  Unpaid: 0,
  Partial: 1,
  Paid: 2,
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: invoices = [], isLoading } = useInvoices()
  const [filter, setFilter] = useState<Filter>('All')
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const del = useMutation({
    mutationFn: (id: string) => api.deleteInvoice(id),
    onSuccess: () => {
      toast.success('Invoice deleted')
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => toast.error('Failed to delete'),
    onSettled: () => setConfirmId(null),
  })

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Sensible defaults: text → asc, numbers/dates → desc
      setSortDir(key === 'client' || key === 'number' ? 'asc' : 'desc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = invoices.filter((inv) => {
      const status = deriveStatus(inv)
      if (filter === 'Overdue') {
        if (status === 'Paid') return false
        if (!inv.dueDate || !isPast(new Date(inv.dueDate))) return false
      } else if (filter !== 'All' && status !== filter) {
        return false
      }
      if (!q) return true
      return (
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.client?.name?.toLowerCase().includes(q) ||
        inv.client?.email?.toLowerCase().includes(q)
      )
    })

    const sorted = [...list].sort((a, b) => compare(a, b, sortKey))
    return sortDir === 'asc' ? sorted : sorted.reverse()
  }, [invoices, filter, search, sortKey, sortDir])

  if (isLoading) return <FullSpinner />

  if (invoices.length === 0) {
    return (
      <>
        <PageHeader
          title="Invoices"
          description="Track invoices you've issued and their status"
          actions={
            <Button onClick={() => navigate('/invoice')} leftIcon={<Plus size={16} />}>
              New invoice
            </Button>
          }
        />
        <EmptyState
          title="No invoices yet"
          description="Create your first invoice to get paid faster."
          action={
            <Button onClick={() => navigate('/invoice')} leftIcon={<Plus size={16} />}>
              New invoice
            </Button>
          }
        />
      </>
    )
  }

  const sortProps = (key: SortKey) => ({
    active: sortKey === key,
    dir: sortDir,
    onClick: () => toggleSort(key),
  })

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Track invoices you've issued and their status"
        actions={
          <Button onClick={() => navigate('/invoice')} leftIcon={<Plus size={16} />}>
            New invoice
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip transition ${
                filter === f
                  ? 'bg-ink text-accent-fg'
                  : 'bg-surface text-muted border border-border hover:bg-accent-soft hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, client…"
            className="input pl-9 sm:w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches" description="Try adjusting filters or search." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg/50">
                <tr>
                  <SortableHead label="Number" {...sortProps('number')} />
                  <SortableHead label="Client" {...sortProps('client')} />
                  <SortableHead label="Amount" {...sortProps('amount')} align="left" />
                  <SortableHead label="Due date" {...sortProps('due')} />
                  <SortableHead label="Status" {...sortProps('status')} />
                  <SortableHead label="Created" {...sortProps('created')} />
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => (
                  <Row
                    key={inv._id}
                    inv={inv}
                    onOpen={() => navigate(`/invoice/${inv._id}`)}
                    onEdit={() => navigate(`/edit/invoice/${inv._id}`)}
                    onDelete={() => setConfirmId(inv._id ?? null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Delete invoice?"
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
          This will permanently delete the invoice and all its payment records.
        </p>
      </Modal>
    </>
  )
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  align?: 'left' | 'right'
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={cn('table-head', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1.5 transition hover:text-ink',
          active && 'text-ink',
        )}
      >
        {label}
        <Icon size={12} className={cn('opacity-60', active && 'opacity-100')} />
      </button>
    </th>
  )
}

function Row({
  inv,
  onOpen,
  onEdit,
  onDelete,
}: {
  inv: Invoice
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const status = deriveStatus(inv)
  const due = inv.dueDate ? new Date(inv.dueDate) : null
  const overdue = due && status !== 'Paid' && !isAfter(due, new Date())
  const created = inv.createdAt ? new Date(inv.createdAt) : null

  return (
    <tr className="group transition hover:bg-bg/40">
      <td className="table-cell font-medium text-ink">
        <button onClick={onOpen} className="hover:underline">
          #{inv.invoiceNumber}
        </button>
      </td>
      <td className="table-cell">
        <button onClick={onOpen} className="text-left hover:underline">
          <div className="font-medium text-ink">{inv.client?.name ?? 'N/A'}</div>
          {inv.client?.email && <div className="text-xs text-muted">{inv.client.email}</div>}
        </button>
      </td>
      <td className="table-cell font-medium text-ink">
        {inv.currency} {toCommas(inv.total)}
      </td>
      <td className={`table-cell ${overdue ? 'text-danger' : 'text-muted'}`}>
        {due ? format(due, 'MMM d, yyyy') : '—'}
      </td>
      <td className="table-cell">
        <StatusBadge status={status} />
      </td>
      <td className="table-cell text-muted">
        {created ? format(created, 'MMM d, yyyy') : '—'}
      </td>
      <td className="table-cell">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onOpen}
            className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-ink"
            aria-label="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-ink"
            aria-label="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
            aria-label="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function compare(a: Invoice, b: Invoice, key: SortKey): number {
  switch (key) {
    case 'number': {
      // Sort numerically when both are numeric, else fall back to text
      const an = Number(a.invoiceNumber)
      const bn = Number(b.invoiceNumber)
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn
      return (a.invoiceNumber ?? '').localeCompare(b.invoiceNumber ?? '')
    }
    case 'client':
      return (a.client?.name ?? '').localeCompare(b.client?.name ?? '')
    case 'amount':
      return (Number(a.total) || 0) - (Number(b.total) || 0)
    case 'due': {
      const av = a.dueDate ? +new Date(a.dueDate) : 0
      const bv = b.dueDate ? +new Date(b.dueDate) : 0
      return av - bv
    }
    case 'status':
      return (STATUS_RANK[deriveStatus(a)] ?? 99) - (STATUS_RANK[deriveStatus(b)] ?? 99)
    case 'created': {
      const av = a.createdAt ? +new Date(a.createdAt) : 0
      const bv = b.createdAt ? +new Date(b.createdAt) : 0
      return av - bv
    }
  }
}
