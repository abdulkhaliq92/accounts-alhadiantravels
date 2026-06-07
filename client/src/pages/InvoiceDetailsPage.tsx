import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { ArrowLeft, CreditCard, Download, Mail, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { FullSpinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageHeader } from '@/components/PageHeader'
import { BrandLogo } from '@/components/BrandLogo'
import { PaymentModal } from '@/components/PaymentModal'
import { getUserId, useAuth } from '@/lib/auth'
import { useInvoice, useProfile } from '@/lib/queries'
import { downloadInvoicePdf } from '@/lib/pdf'
import { deriveStatus, initials, lineAmount, splitMulti, toCommas } from '@/lib/utils'

export function InvoiceDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useAuth((s) => s.session)
  const userId = getUserId(session)
  const { data: invoice, isLoading } = useInvoice(id)
  const { data: profile } = useProfile()
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const invoiceCardRef = useRef<HTMLDivElement>(null)

  const totalReceived = useMemo(
    () =>
      (invoice?.paymentRecords ?? []).reduce(
        (acc, p) => acc + Number(p.amountPaid || 0),
        0,
      ),
    [invoice],
  )

  if (isLoading || !invoice) return <FullSpinner />

  const isOwner = invoice.creator?.includes(userId ?? '')
  const balance = Math.max(0, Number(invoice.total) - totalReceived)
  const ratesNum = Number(invoice.rates) || 0

  const downloadPdf = async () => {
    try {
      setDownloading(true)
      await downloadInvoicePdf({ invoice, profile, totalReceived, element: invoiceCardRef.current })
      toast.success('PDF downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  const emailInvoice = async () => {
    if (!invoice.client?.email) {
      toast.error('Customer has no email on file')
      return
    }
    try {
      await downloadInvoicePdf({ invoice, profile, totalReceived })
      toast.success('PDF downloaded — attach it in your email')
    } catch (err) {
      console.error(err)
    }
    const subject = `${invoice.type ?? 'Invoice'} #${invoice.invoiceNumber} from ${
      profile?.businessName ?? profile?.name ?? 'Alhadian Travels'
    }`
    const body = [
      `Hi ${invoice.client?.name ?? ''},`,
      '',
      `Please find attached ${invoice.type?.toLowerCase() ?? 'invoice'} #${invoice.invoiceNumber}.`,
      `Total due: ${invoice.currency} ${toCommas(balance)}`,
      invoice.dueDate ? `Due: ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}` : '',
      '',
      'Thank you,',
      profile?.businessName ?? profile?.name ?? 'Alhadian Travels',
    ]
      .filter(Boolean)
      .join('\n')
    const url = `mailto:${encodeURIComponent(invoice.client.email)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`
    window.location.href = url
  }

  return (
    <>
      <PageHeader
        title={`${invoice.type ?? 'Invoice'} #${invoice.invoiceNumber}`}
        description={`Issued ${
          invoice.createdAt ? format(new Date(invoice.createdAt), 'MMM d, yyyy') : '—'
        }`}
        actions={
          <Button variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft size={16} />}>
            Back
          </Button>
        }
      />

      {isOwner && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button onClick={downloadPdf} loading={downloading} leftIcon={<Download size={16} />}>
            Download PDF
          </Button>
          <Button
            variant="secondary"
            onClick={emailInvoice}
            leftIcon={<Mail size={16} />}
          >
            Email customer
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/edit/invoice/${invoice._id}`)}
            leftIcon={<Pencil size={16} />}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            onClick={() => setOpen(true)}
            leftIcon={<CreditCard size={16} />}
          >
            Record payment
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2" ref={invoiceCardRef}>
          <header className="border-b border-border bg-bg/40 p-6">
            <div className="mb-6 flex items-center gap-4">
              <BrandLogo height={80} />
              <div>
                <div className="text-lg font-bold tracking-tight text-ink">Alhadian Travels Pvt Ltd</div>
                {profile && (
                  <div className="text-xs text-muted mt-0.5">
                    {splitMulti(profile.email).map((e) => (
                      <div key={`ph-${e}`}>{e}</div>
                    ))}
                    {splitMulti(profile.phoneNumber).map((p) => (
                      <div key={`phh-${p}`}>{p}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start justify-between gap-6">
              {profile && (
                <div className="text-xs text-muted">
                  <div className="font-medium text-ink">
                    {profile.businessName ?? profile.name}
                  </div>
                  {splitMulti(profile.email).map((e) => (
                    <div key={`pe-${e}`}>{e}</div>
                  ))}
                  {splitMulti(profile.phoneNumber).map((p) => (
                    <div key={`pp-${p}`}>{p}</div>
                  ))}
                  {profile.contactAddress && <div>{profile.contactAddress}</div>}
                </div>
              )}
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-muted">{invoice.type}</div>
                <div className="text-3xl font-semibold text-ink">#{invoice.invoiceNumber}</div>
                <div className="mt-2">
                  <StatusBadge status={deriveStatus(invoice)} />
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-6 border-b border-border p-6 sm:grid-cols-2">
            <div>
              <div className="label">Bill to</div>
              <div className="font-medium text-ink">{invoice.client?.name}</div>
              {splitMulti(invoice.client?.email).map((e) => (
                <div key={`ce-${e}`} className="text-sm text-muted">{e}</div>
              ))}
              {splitMulti(invoice.client?.phone).map((p) => (
                <div key={`cp-${p}`} className="text-sm text-muted">{p}</div>
              ))}
              {invoice.client?.address && (
                <div className="text-sm text-muted">{invoice.client.address}</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Meta
                label="Issued"
                value={
                  invoice.createdAt
                    ? format(new Date(invoice.createdAt), 'MMM d, yyyy')
                    : '—'
                }
              />
              <Meta
                label="Due"
                value={invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'}
              />
              <Meta label="Currency" value={invoice.currency ?? '—'} />
              <Meta label="Total" value={`${invoice.currency} ${toCommas(invoice.total)}`} />
            </div>
          </section>

          <section>
            <table className="w-full">
              <thead className="bg-bg/40">
                <tr>
                  <th className="table-head">Item</th>
                  <th className="table-head text-right">Qty</th>
                  <th className="table-head text-right">Price</th>
                  <th className="table-head text-right">Disc %</th>
                  <th className="table-head text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td className="table-cell">{it.itemName || '—'}</td>
                    <td className="table-cell text-right">{it.quantity || 0}</td>
                    <td className="table-cell text-right">{toCommas(it.unitPrice)}</td>
                    <td className="table-cell text-right">{it.discount || 0}</td>
                    <td className="table-cell text-right font-medium">
                      {toCommas(lineAmount(it))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {invoice.notes && (
            <section className="border-t border-border p-6">
              <div className="label">Notes / Payment info</div>
              <p className="whitespace-pre-line text-sm text-ink">{invoice.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Summary
            </h3>
            <dl className="grid grid-cols-[1fr_auto] gap-x-10 gap-y-2 text-sm">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-right font-medium text-ink tabular-nums">
                {invoice.currency} {toCommas(invoice.subTotal)}
              </dd>

              <dt className="text-muted">VAT ({ratesNum}%)</dt>
              <dd className="text-right font-medium text-ink tabular-nums">
                {invoice.currency} {toCommas(invoice.vat)}
              </dd>

              <dt className="col-span-2 -mb-1 mt-1 h-px bg-border" />

              <dt className="font-semibold text-ink">Total</dt>
              <dd className="text-right font-semibold text-ink tabular-nums">
                {invoice.currency} {toCommas(invoice.total)}
              </dd>

              <dt className="text-muted">Paid</dt>
              <dd className="text-right font-medium tabular-nums text-success">
                {invoice.currency} {toCommas(totalReceived)}
              </dd>

              <dt className="col-span-2 -mb-1 mt-1 h-px bg-border" />

              <dt className="text-base font-semibold text-ink">Balance due</dt>
              <dd className="text-right text-base font-bold text-ink tabular-nums">
                {invoice.currency} {toCommas(balance)}
              </dd>
            </dl>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-ink">Payment history</h3>
            </div>
            {invoice.paymentRecords?.length ? (
              <ul className="divide-y divide-border">
                {invoice.paymentRecords.map((p, idx) => (
                  <li key={idx} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-ink">
                      {initials(p.paidBy)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ink">{p.paidBy ?? '—'}</div>
                      <div className="text-xs text-muted">
                        {p.datePaid ? format(new Date(p.datePaid), 'MMM d, yyyy') : '—'}
                        {p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-success">
                      {toCommas(p.amountPaid)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-muted">
                No payments yet
              </div>
            )}
          </div>
        </aside>
      </div>

      <PaymentModal open={open} onClose={() => setOpen(false)} invoice={invoice} />
    </>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="font-medium text-ink">{value}</div>
    </div>
  )
}

