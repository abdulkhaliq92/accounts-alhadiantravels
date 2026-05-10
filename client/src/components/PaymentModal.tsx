import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import * as api from '@/lib/api'
import { round2 } from '@/lib/utils'
import type { Invoice, PaymentRecord } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  invoice: Invoice
}

const METHODS = ['Bank Transfer', 'Cash', 'Credit Card', 'PayPal', 'Other']

export function PaymentModal({ open, onClose, invoice }: Props) {
  const qc = useQueryClient()
  const totalReceived = useMemo(
    () =>
      round2(
        (invoice.paymentRecords ?? []).reduce(
          (acc, p) => acc + Number(p.amountPaid || 0),
          0,
        ),
      ),
    [invoice.paymentRecords],
  )
  const remaining = round2(Math.max(0, Number(invoice.total || 0) - totalReceived))

  const [amount, setAmount] = useState(remaining)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [method, setMethod] = useState(METHODS[0])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setAmount(remaining)
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setMethod(METHODS[0])
      setNote('')
    }
  }, [open, remaining])

  const mutate = useMutation({
    mutationFn: () => {
      const amountPaid = round2(amount)
      const newRecord: PaymentRecord = {
        amountPaid,
        datePaid: new Date(date).toISOString(),
        paymentMethod: method,
        note,
        paidBy: invoice.client?.name ?? '',
      }
      const newTotalReceived = round2(totalReceived + amountPaid)
      const status = newTotalReceived >= Number(invoice.total) ? 'Paid' : 'Partial'
      const updated: Partial<Invoice> = {
        ...invoice,
        status,
        paymentRecords: [...(invoice.paymentRecords ?? []), newRecord],
        totalAmountReceived: newTotalReceived,
      }
      // Strip computed fields the server doesn't store
      delete (updated as any).businessDetails
      return api.updateInvoice(invoice._id!, updated)
    },
    onSuccess: () => {
      toast.success('Payment recorded')
      qc.invalidateQueries({ queryKey: ['invoice', invoice._id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      onClose()
    },
    onError: () => toast.error('Failed to record payment'),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutate.mutate()} loading={mutate.isPending}>
            Save record
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <Input
            label="Date paid"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="label">Payment method</label>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label">Note</label>
          <textarea
            className="input min-h-[80px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reference, transaction ID, anything useful…"
          />
        </div>
      </div>
    </Modal>
  )
}
