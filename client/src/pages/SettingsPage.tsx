import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Landmark, Pencil, Plus, Save, Star, Trash2, Upload } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullSpinner } from '@/components/ui/Spinner'
import { BankAccountForm } from '@/components/BankAccountForm'
import * as api from '@/lib/api'
import { getUserId, hasPermission, useAuth } from '@/lib/auth'
import { useProfile } from '@/lib/queries'
import { findCurrency } from '@/lib/currencies'
import { initials } from '@/lib/utils'
import type { BankAccount, Profile } from '@/lib/types'

const empty: Profile = {
  email: '',
  name: '',
  phoneNumber: '',
  businessName: '',
  contactAddress: '',
  paymentDetails: '',
  logo: '',
  website: '',
}

export function SettingsPage() {
  const session = useAuth((s) => s.session)
  const userId = getUserId(session)
  const canManageSettings = hasPermission(session, 'settingsManage')
  const canManageBankAccounts = hasPermission(session, 'bankAccountsManage')
  const qc = useQueryClient()
  const { data: profile, isLoading } = useProfile()
  const [form, setForm] = useState<Profile>(empty)
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (profile) setForm({ ...empty, ...profile })
    else if (session?.result) setForm({ ...empty, name: session.result.name, email: session.result.email })
  }, [profile, session])

  const update = useMutation({
    mutationFn: () => {
      if (profile?._id) return api.updateProfile(profile._id, form)
      return api.createProfile({ ...form, userId: userId ? [userId] : [] })
    },
    onSuccess: () => {
      toast.success('Profile saved')
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => toast.error('Failed to save profile'),
  })

  const saveBankAccounts = useMutation({
    mutationFn: (accounts: BankAccount[]) => api.updateBankAccounts(profile!._id!, accounts),
    onSuccess: () => {
      toast.success('Bank accounts updated')
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => toast.error('Failed to update bank accounts'),
    onSettled: () => setConfirmDeleteId(null),
  })

  const onLogoUpload = async (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error('Logo must be under 1MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, logo: String(reader.result ?? '') }))
    reader.readAsDataURL(file)
  }

  const startNewAccount = () => {
    setEditingAccount(null)
    setBankModalOpen(true)
  }
  const startEditAccount = (a: BankAccount) => {
    setEditingAccount(a)
    setBankModalOpen(true)
  }

  const upsertBankAccount = (account: BankAccount) => {
    if (!profile?._id) {
      toast.error('Save your business profile first')
      return
    }
    const current = profile.bankAccounts ?? []
    const idx = editingAccount?._id ? current.findIndex((a) => a._id === editingAccount._id) : -1
    let next =
      idx >= 0
        ? current.map((a, i) => (i === idx ? { ...account, _id: a._id } : a))
        : [...current, account]

    if (account.isDefault) {
      const keepIdx = idx >= 0 ? idx : next.length - 1
      next = next.map((a, i) => (i === keepIdx ? a : { ...a, isDefault: false }))
    }
    saveBankAccounts.mutate(next)
  }

  const setDefaultBankAccount = (id: string) => {
    const next = (profile?.bankAccounts ?? []).map((a) => ({ ...a, isDefault: a._id === id }))
    saveBankAccounts.mutate(next)
  }

  const removeBankAccount = (id: string) => {
    const next = (profile?.bankAccounts ?? []).filter((a) => a._id !== id)
    saveBankAccounts.mutate(next)
  }

  if (isLoading) return <FullSpinner />

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your business profile shown on invoices and emails"
        actions={
          canManageSettings ? (
            <Button onClick={() => update.mutate()} loading={update.isPending} leftIcon={<Save size={16} />}>
              Save changes
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card p-6 xl:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {form.logo ? (
                <img
                  src={form.logo}
                  alt="Logo"
                  className="h-24 w-24 rounded-full border border-border object-cover shadow-soft"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-ink text-2xl font-semibold text-accent-fg">
                  {initials(form.businessName ?? form.name)}
                </div>
              )}
              {canManageSettings && (
                <label
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface text-ink shadow-soft ring-1 ring-border hover:bg-accent-soft"
                  aria-label="Upload logo"
                >
                  <Upload size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) onLogoUpload(file)
                    }}
                  />
                </label>
              )}
            </div>
            <div className="mt-4">
              <div className="font-medium text-ink">
                {form.businessName || form.name || 'Your Business'}
              </div>
              <div className="text-xs text-muted">{form.email || 'no email'}</div>
            </div>
            {canManageSettings && form.logo && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, logo: '' }))}
                className="mt-3 text-xs text-muted hover:text-danger"
              >
                Remove logo
              </button>
            )}
          </div>
        </div>

        <div className="card p-6 xl:col-span-2">
          <fieldset disabled={!canManageSettings} className="grid grid-cols-1 gap-4 sm:grid-cols-2 disabled:opacity-60">
            <Input
              label="Display name"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Business name"
              value={form.businessName ?? ''}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phoneNumber ?? ''}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />
            <Input
              label="Website"
              value={form.website ?? ''}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Input
                label="Contact address"
                value={form.contactAddress ?? ''}
                onChange={(e) => setForm({ ...form, contactAddress: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Payment details / default notes"
                placeholder="Terms, payment instructions — these prefill on new invoices."
                value={form.paymentDetails ?? ''}
                onChange={(e) => setForm({ ...form, paymentDetails: e.target.value })}
              />
            </div>
          </fieldset>
        </div>

        <div className="card p-6 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Bank accounts</h3>
              <p className="text-xs text-muted">Selectable on invoices so customers know where to pay.</p>
            </div>
            {canManageBankAccounts && (
              <Button size="sm" onClick={startNewAccount} leftIcon={<Plus size={14} />}>
                Add bank account
              </Button>
            )}
          </div>

          {(profile?.bankAccounts?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Landmark size={20} />}
              title="No bank accounts yet"
              description={
                canManageBankAccounts
                  ? 'Add one to make it selectable on invoices.'
                  : 'Ask an admin to add one so it can be selected on invoices.'
              }
              action={
                canManageBankAccounts ? (
                  <Button onClick={startNewAccount} leftIcon={<Plus size={16} />}>
                    Add bank account
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profile?.bankAccounts?.map((a) => (
                <div key={a._id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="truncate font-medium text-ink">{a.label}</div>
                        {a.isDefault && (
                          <span className="chip bg-accent-soft text-ink">
                            <Star size={10} className="fill-current" /> Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {a.bankName} {a.currency ? `· ${findCurrency(a.currency)?.code ?? a.currency}` : ''}
                      </div>
                    </div>
                    {canManageBankAccounts && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => startEditAccount(a)}
                          className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-ink"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(a._id ?? null)}
                          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <dl className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted">Account title</dt>
                      <dd className="truncate text-ink">{a.accountTitle || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted">Account number</dt>
                      <dd className="truncate text-ink">{a.accountNumber || '—'}</dd>
                    </div>
                    {a.iban && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">IBAN</dt>
                        <dd className="truncate text-ink">{a.iban}</dd>
                      </div>
                    )}
                  </dl>
                  {canManageBankAccounts && !a.isDefault && (
                    <button
                      onClick={() => a._id && setDefaultBankAccount(a._id)}
                      className="mt-3 text-xs font-medium text-ink hover:underline"
                    >
                      Set as default
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BankAccountForm
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        account={editingAccount}
        onSave={upsertBankAccount}
      />

      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete bank account?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={saveBankAccounts.isPending}
              onClick={() => confirmDeleteId && removeBankAccount(confirmDeleteId)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Invoices that already used this account keep their own copy of the details.
        </p>
      </Modal>
    </>
  )
}
