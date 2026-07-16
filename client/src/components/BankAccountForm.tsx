import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { currencies, defaultCurrency } from '@/lib/currencies'
import type { BankAccount } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  account?: BankAccount | null
  onSave: (account: BankAccount) => void
}

const empty: BankAccount = {
  label: '',
  bankName: '',
  accountTitle: '',
  accountNumber: '',
  iban: '',
  swiftCode: '',
  branchAddress: '',
  currency: defaultCurrency.code,
  isDefault: false,
  notes: '',
}

export function BankAccountForm({ open, onClose, account, onSave }: Props) {
  const [form, setForm] = useState<BankAccount>(empty)

  useEffect(() => {
    if (open) setForm(account ? { ...empty, ...account } : { ...empty })
  }, [open, account])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim()) {
      toast.error('Give this account a label, e.g. "Meezan Bank — PKR"')
      return
    }
    onSave(form)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? 'Edit bank account' : 'Add bank account'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{account ? 'Save changes' : 'Add account'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Label"
          placeholder="e.g. Meezan Bank — PKR"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Bank name"
            value={form.bankName ?? ''}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          />
          <Input
            label="Account title"
            value={form.accountTitle ?? ''}
            onChange={(e) => setForm({ ...form, accountTitle: e.target.value })}
          />
          <Input
            label="Account number"
            value={form.accountNumber ?? ''}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          />
          <Input
            label="IBAN"
            value={form.iban ?? ''}
            onChange={(e) => setForm({ ...form, iban: e.target.value })}
          />
          <Input
            label="SWIFT / BIC code"
            value={form.swiftCode ?? ''}
            onChange={(e) => setForm({ ...form, swiftCode: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="label">Currency</label>
            <select
              className="input"
              value={form.currency ?? defaultCurrency.code}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Input
          label="Branch address"
          value={form.branchAddress ?? ''}
          onChange={(e) => setForm({ ...form, branchAddress: e.target.value })}
        />
        <Textarea
          label="Notes"
          placeholder="Optional — anything else that should show alongside these details"
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={Boolean(form.isDefault)}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          Set as default account
        </label>
      </form>
    </Modal>
  )
}
