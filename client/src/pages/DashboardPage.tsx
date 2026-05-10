import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Hourglass,
  PiggyBank,
  Plus,
  Receipt,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullSpinner } from '@/components/ui/Spinner'
import { useInvoices } from '@/lib/queries'
import { deriveStatus, getReceived, initials, toCommas } from '@/lib/utils'
import type { Invoice, PaymentRecord } from '@/lib/types'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: invoices = [], isLoading } = useInvoices()

  const stats = useMemo(() => computeStats(invoices), [invoices])
  const series = useMemo(() => buildSeries(stats.payments), [stats.payments])

  if (isLoading) return <FullSpinner />

  if (invoices.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" description="Your invoicing snapshot" />
        <EmptyState
          icon={<FileText size={20} />}
          title="No invoices yet"
          description="Create your first invoice to start tracking revenue and payments."
          action={
            <Button onClick={() => navigate('/invoice')} leftIcon={<Plus size={16} />}>
              New invoice
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your invoicing snapshot at a glance"
        actions={
          <Button onClick={() => navigate('/invoice')} leftIcon={<Plus size={16} />}>
            New invoice
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Payment received"
          value={toCommas(stats.totalPaid)}
          icon={<Wallet size={18} />}
          accent
        />
        <StatCard
          label="Pending amount"
          value={toCommas(stats.totalAmount - stats.totalPaid)}
          icon={<Hourglass size={18} />}
        />
        <StatCard
          label="Total billed"
          value={toCommas(stats.totalAmount)}
          icon={<PiggyBank size={18} />}
        />
        <StatCard
          label="Total invoices"
          value={String(invoices.length)}
          icon={<Receipt size={18} />}
        />
        <StatCard
          label="Paid"
          value={String(stats.paidCount)}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Partial"
          value={String(stats.partialCount)}
          icon={<CreditCard size={18} />}
        />
        <StatCard
          label="Unpaid"
          value={String(stats.unpaidCount)}
          icon={<FileText size={18} />}
        />
        <StatCard
          label="Overdue"
          value={String(stats.overdueCount)}
          icon={<Clock size={18} />}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Payments over time</h3>
              <p className="text-xs text-muted">Cumulative receipts by date</p>
            </div>
          </div>
          <div className="h-72">
            {series.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eef2f7" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#0f172a"
                    fill="url(#g)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                No payments recorded yet
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">Status breakdown</h3>
          <ul className="space-y-3">
            <Bar label="Paid" value={stats.paidCount} total={invoices.length} color="bg-success" />
            <Bar
              label="Partial"
              value={stats.partialCount}
              total={invoices.length}
              color="bg-warning"
            />
            <Bar
              label="Unpaid"
              value={stats.unpaidCount}
              total={invoices.length}
              color="bg-danger"
            />
            <Bar
              label="Overdue"
              value={stats.overdueCount}
              total={invoices.length}
              color="bg-ink"
            />
          </ul>
        </div>
      </section>

      <section className="mt-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Recent payments</h3>
              <p className="text-xs text-muted">Latest 10 records across all invoices</p>
            </div>
          </div>
          {stats.payments.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted">
              No payments received yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg/50">
                  <tr>
                    <th className="table-head">Paid by</th>
                    <th className="table-head">Date</th>
                    <th className="table-head">Amount</th>
                    <th className="table-head">Method</th>
                    <th className="table-head">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.payments.slice(0, 10).map((p, idx) => (
                    <tr key={p._id ?? idx}>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-ink">
                            {initials(p.paidBy)}
                          </div>
                          <span>{p.paidBy ?? '—'}</span>
                        </div>
                      </td>
                      <td className="table-cell text-muted">
                        {p.datePaid ? format(new Date(p.datePaid), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="table-cell font-medium text-success">
                        {toCommas(p.amountPaid)}
                      </td>
                      <td className="table-cell text-muted">{p.paymentMethod ?? '—'}</td>
                      <td className="table-cell text-muted">{p.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        accent
          ? 'border-ink bg-ink text-accent-fg shadow-soft'
          : 'border-border bg-surface text-ink shadow-soft'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium uppercase tracking-wide ${
            accent ? 'text-accent-fg/70' : 'text-muted'
          }`}
        >
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            accent ? 'bg-accent-fg/10 text-accent-fg' : 'bg-accent-soft text-ink'
          }`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <li>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-ink">
          {value} <span className="text-muted">· {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-soft">
        <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}

function computeStats(invoices: Invoice[]) {
  const now = new Date().toISOString()
  let totalAmount = 0
  let totalPaid = 0
  let paidCount = 0
  let unpaidCount = 0
  let partialCount = 0
  let overdueCount = 0
  const payments: PaymentRecord[] = []

  for (const inv of invoices) {
    totalAmount += Number(inv.total) || 0
    totalPaid += getReceived(inv)
    const status = deriveStatus(inv)
    if (status === 'Paid') paidCount++
    else if (status === 'Partial') partialCount++
    else if (status === 'Unpaid') unpaidCount++
    if (inv.dueDate && String(inv.dueDate) <= now && status !== 'Paid') overdueCount++
    if (inv.paymentRecords?.length) payments.push(...inv.paymentRecords)
  }
  payments.sort((a, b) => +new Date(b.datePaid as any) - +new Date(a.datePaid as any))
  return { totalAmount, totalPaid, paidCount, unpaidCount, partialCount, overdueCount, payments }
}

function buildSeries(payments: PaymentRecord[]) {
  if (payments.length === 0) return []
  const sorted = [...payments].sort(
    (a, b) => +new Date(a.datePaid as any) - +new Date(b.datePaid as any),
  )
  const buckets = new Map<string, number>()
  for (const p of sorted) {
    if (!p.datePaid) continue
    const key = format(new Date(p.datePaid), 'MMM d')
    buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amountPaid || 0))
  }
  let cum = 0
  return Array.from(buckets.entries()).map(([date, amt]) => {
    cum += amt
    return { date, amount: cum }
  })
}
