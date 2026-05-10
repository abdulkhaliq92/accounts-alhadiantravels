import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function round2(value: number | string | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return 0
  // Round-half-away-from-zero, in cents, then back to a JS number.
  return Math.round((num + Number.EPSILON) * 100) / 100
}

export function toCommas(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0.00'
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) return String(value)
  return round2(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem('profile')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function userId(): string | undefined {
  const s = getStoredSession()
  return s?.result?._id ?? s?.result?.googleId
}

export function initials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function lineAmount(item: { quantity: string; unitPrice: string; discount: string }) {
  const q = Number(item.quantity) || 0
  const p = Number(item.unitPrice) || 0
  const d = Number(item.discount) || 0
  const gross = q * p
  const net = gross - (gross * d) / 100
  // Round-half-away-from-zero in cents to avoid float drift like 681.5999999999.
  return Math.round((net + Number.EPSILON) * 100) / 100
}

export function splitMulti(value: string | undefined | null): string[] {
  if (!value) return []
  return value
    .split(/[,;\n]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

interface InvoiceStatusInput {
  total?: number | string
  totalAmountReceived?: number
  paymentRecords?: Array<{ amountPaid?: number | string }>
  type?: string
}

export function getReceived(invoice: InvoiceStatusInput): number {
  const stored = Number(invoice.totalAmountReceived)
  if (Number.isFinite(stored) && stored > 0) return stored
  return (invoice.paymentRecords ?? []).reduce(
    (acc, p) => acc + (Number(p.amountPaid) || 0),
    0,
  )
}

export function deriveStatus(invoice: InvoiceStatusInput): 'Paid' | 'Partial' | 'Unpaid' {
  const total = Number(invoice.total) || 0
  const received = getReceived(invoice)
  if (total > 0 && received >= total) return 'Paid'
  if (received > 0) return 'Partial'
  if (invoice.type === 'Receipt') return 'Paid'
  return 'Unpaid'
}
