import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Save,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/Button'
import { FullSpinner } from '@/components/ui/Spinner'
import { CustomerForm } from '@/components/CustomerForm'
import * as api from '@/lib/api'
import { getUserId, useAuth } from '@/lib/auth'
import { useClients, useInvoice, useInvoiceCount, useProfile } from '@/lib/queries'
import { currencies, defaultCurrency } from '@/lib/currencies'
import {
  deriveStatus,
  getReceived,
  lineAmount,
  round2,
  splitMulti,
  toCommas,
} from '@/lib/utils'
import type { Client, InvoiceItem } from '@/lib/types'

const TYPES = ['Invoice', 'Receipt', 'Quote'] as const

const blankItem = (): InvoiceItem => ({
  itemName: '',
  unitPrice: '',
  quantity: '',
  discount: '',
})

export function InvoiceEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const session = useAuth((s) => s.session)
  const userId = getUserId(session)
  const isEdit = Boolean(id)

  const { data: existing, isLoading: loadingInvoice } = useInvoice(id)
  const { data: clients = [] } = useClients()
  const { data: count = 0 } = useInvoiceCount()
  const { data: profile } = useProfile()

  const [type, setType] = useState<string>('Invoice')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency.code)
  const [client, setClient] = useState<Client | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([blankItem()])
  const [rates, setRates] = useState('')
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [openClientPicker, setOpenClientPicker] = useState(false)
  const [openNewClient, setOpenNewClient] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from existing invoice
  useEffect(() => {
    if (isEdit && existing && !hydrated) {
      setType(existing.type ?? 'Invoice')
      setInvoiceNumber(existing.invoiceNumber ?? '')
      setCurrency(existing.currency ?? defaultCurrency.code)
      setClient(existing.client ? ({ ...existing.client, _id: undefined } as Client) : null)
      setItems(existing.items?.length ? existing.items : [blankItem()])
      setRates(existing.rates ?? '')
      setDueDate(
        existing.dueDate ? format(new Date(existing.dueDate), 'yyyy-MM-dd') : dueDate,
      )
      setNotes(existing.notes ?? '')
      setHydrated(true)
    }
  }, [isEdit, existing, hydrated, dueDate])

  // For new invoices: prefill invoice number
  useEffect(() => {
    if (!isEdit && !invoiceNumber && count >= 0) {
      setInvoiceNumber(String(count + 1).padStart(3, '0'))
    }
  }, [isEdit, count, invoiceNumber])

  // For new invoices: prefill notes from profile payment details
  useEffect(() => {
    if (!isEdit && profile?.paymentDetails && !notes) {
      setNotes(profile.paymentDetails)
    }
  }, [isEdit, profile, notes])

  const subTotal = useMemo(
    () => round2(items.reduce((acc, i) => acc + lineAmount(i), 0)),
    [items],
  )
  const ratesNum = Number(rates) || 0
  const vat = round2((ratesNum / 100) * subTotal)
  const total = round2(subTotal + vat)

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  const addRow = () => setItems((prev) => [...prev, blankItem()])
  const removeRow = (idx: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))

  const create = useMutation({
    mutationFn: (data: any) => api.createInvoice(data),
    onSuccess: (res) => {
      toast.success('Invoice created')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice-count'] })
      navigate(`/invoice/${res.data._id}`)
    },
    onError: () => toast.error('Failed to create invoice'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateInvoice(id, data),
    onSuccess: (_res, vars) => {
      toast.success('Invoice updated')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', vars.id] })
      navigate(`/invoice/${vars.id}`)
    },
    onError: () => toast.error('Failed to update invoice'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) {
      toast.error('Please select a customer')
      return
    }
    if (items.every((i) => !i.itemName.trim())) {
      toast.error('Add at least one line item')
      return
    }

    // Preserve payment-derived status when editing — don't blow away Partial/Paid
    // because the user touched the invoice. Recompute from existing payments + new total.
    const existingReceived = isEdit ? getReceived(existing ?? {}) : 0
    const status = deriveStatus({
      total,
      totalAmountReceived: existingReceived,
      paymentRecords: existing?.paymentRecords,
      type,
    })
    const numStr = String(invoiceNumber).trim() || String(count + 1).padStart(3, '0')
    const numFormatted = numStr.length < 3 ? numStr.padStart(3, '0') : numStr

    const payload: any = {
      items,
      rates,
      vat,
      total,
      subTotal,
      notes,
      status,
      type,
      currency,
      dueDate,
      client: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
      },
      invoiceNumber: numFormatted,
    }

    if (isEdit && id) {
      update.mutate({ id, data: payload })
    } else {
      create.mutate({
        ...payload,
        paymentRecords: [],
        creator: userId ? [userId] : [],
      })
    }
  }

  if (isEdit && loadingInvoice) return <FullSpinner />

  const submitting = create.isPending || update.isPending

  return (
    <>
      <PageHeader
        title={isEdit ? `Edit ${type.toLowerCase()}` : `New ${type.toLowerCase()}`}
        description="Build a clean, ready-to-send document"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft size={16} />}>
              Back
            </Button>
            <Button onClick={submit} loading={submitting} leftIcon={<Save size={16} />}>
              {isEdit ? 'Save changes' : 'Save invoice'}
            </Button>
          </>
        }
      />

      <form onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="card p-6">
            <div className="mb-5 border-b border-border pb-5">
              <BrandLogo fullWidth />
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setType(t)}
                    className={`chip transition ${
                      type === t
                        ? 'bg-ink text-accent-fg'
                        : 'bg-surface text-muted border border-border hover:bg-accent-soft hover:text-ink'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted">Number</span>
                <span className="rounded-md border border-border bg-surface px-2 py-1 text-sm font-medium text-muted">#</span>
                <input
                  className="input w-28 text-center font-medium"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
            </div>

            <hr className="my-6 border-border" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="label">Bill to</div>
                {client ? (
                  <div className="rounded-xl border border-border bg-bg/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink">{client.name}</div>
                        {splitMulti(client.email).map((e) => (
                          <div key={`e-${e}`} className="text-xs text-muted">{e}</div>
                        ))}
                        {splitMulti(client.phone).map((p) => (
                          <div key={`p-${p}`} className="text-xs text-muted">{p}</div>
                        ))}
                        {client.address && (
                          <div className="text-xs text-muted">{client.address}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setClient(null)}
                        className="text-xs text-muted hover:text-ink"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setOpenClientPicker((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:border-ink/30"
                    >
                      Select customer
                      <ChevronDown size={14} />
                    </button>
                    {openClientPicker && (
                      <ClientPicker
                        clients={clients}
                        onSelect={(c) => {
                          setClient(c)
                          setOpenClientPicker(false)
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setOpenNewClient(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:underline"
                    >
                      <UserPlus size={12} /> New customer
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="label">Date</div>
                  <div className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm text-ink">
                    {format(new Date(), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="dueDate" className="label">
                    Due date
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="label">Currency</div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="input"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="rates" className="label">
                    Tax rate (%)
                  </label>
                  <input
                    id="rates"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={rates}
                    onChange={(e) => setRates(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-ink">Line items</h3>
              <p className="text-xs text-muted">Each row contributes to the subtotal.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg/50">
                  <tr>
                    <th className="table-head">Item</th>
                    <th className="table-head w-24">Qty</th>
                    <th className="table-head w-28">Price</th>
                    <th className="table-head w-24">Disc %</th>
                    <th className="table-head w-32 text-right">Amount</th>
                    <th className="table-head w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <input
                          className="input border-transparent bg-transparent shadow-none focus:border-ink focus:bg-surface"
                          placeholder="Item name or description"
                          value={it.itemName}
                          onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="input border-transparent bg-transparent shadow-none focus:border-ink focus:bg-surface"
                          placeholder="0"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="input border-transparent bg-transparent shadow-none focus:border-ink focus:bg-surface"
                          placeholder="0"
                          value={it.unitPrice}
                          onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="input border-transparent bg-transparent shadow-none focus:border-ink focus:bg-surface"
                          placeholder="0"
                          value={it.discount}
                          onChange={(e) => updateItem(idx, { discount: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-ink">
                        {toCommas(lineAmount(it))}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                          aria-label="Remove row"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={addRow}
                className="btn-ghost text-xs"
              >
                <Plus size={14} /> Add line
              </button>
            </div>
          </div>

          <div className="card p-6">
            <div className="label">Notes / Payment info</div>
            <textarea
              className="input min-h-[110px]"
              placeholder="Provide additional details or terms of service"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Summary
            </h3>
            <dl className="grid grid-cols-[1fr_auto] gap-x-10 gap-y-2 text-sm">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-right font-medium text-ink tabular-nums">
                {currency} {toCommas(subTotal)}
              </dd>
              <dt className="text-muted">VAT ({ratesNum}%)</dt>
              <dd className="text-right font-medium text-ink tabular-nums">
                {currency} {toCommas(vat)}
              </dd>
              <dt className="col-span-2 -mb-1 mt-1 h-px bg-border" />
              <dt className="text-base font-semibold text-ink">Total</dt>
              <dd className="text-right text-base font-bold text-ink tabular-nums">
                {currency} {toCommas(total)}
              </dd>
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Type &amp; status
            </h3>
            <dl className="grid grid-cols-[1fr_auto] gap-x-10 gap-y-2 text-sm">
              <dt className="text-muted">Type</dt>
              <dd className="text-right font-medium text-ink">{type}</dd>
              <dt className="text-muted">Status</dt>
              <dd className="text-right font-medium text-ink">
                {deriveStatus({
                  total,
                  totalAmountReceived: isEdit ? getReceived(existing ?? {}) : 0,
                  paymentRecords: existing?.paymentRecords,
                  type,
                })}
              </dd>
              <dt className="text-muted">Due</dt>
              <dd className="text-right font-medium text-ink">
                {dueDate ? format(new Date(dueDate), 'MMM d, yyyy') : '—'}
              </dd>
            </dl>
          </div>
        </aside>
      </form>

      <CustomerForm
        open={openNewClient}
        onClose={() => setOpenNewClient(false)}
        onCreated={(c) => setClient(c)}
      />
    </>
  )
}

function ClientPicker({
  clients,
  onSelect,
}: {
  clients: Client[]
  onSelect: (c: Client) => void
}) {
  const [q, setQ] = useState('')
  const filtered = clients.filter((c) => c.name?.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <div className="relative border-b border-border p-2">
        <input
          autoFocus
          placeholder="Search customers…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input"
        />
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted">No matches</div>
        ) : (
          filtered.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => onSelect(c)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent-soft"
            >
              <span>
                <span className="block font-medium text-ink">{c.name}</span>
                <span className="block text-xs text-muted">{c.email}</span>
              </span>
              <X size={12} className="opacity-0" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
