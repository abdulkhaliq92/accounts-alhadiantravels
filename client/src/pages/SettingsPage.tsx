import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, Upload } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { FullSpinner } from '@/components/ui/Spinner'
import * as api from '@/lib/api'
import { getUserId, useAuth } from '@/lib/auth'
import { useProfile } from '@/lib/queries'
import { initials } from '@/lib/utils'
import type { Profile } from '@/lib/types'

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
  const qc = useQueryClient()
  const { data: profile, isLoading } = useProfile()
  const [form, setForm] = useState<Profile>(empty)

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

  const onLogoUpload = async (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error('Logo must be under 1MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, logo: String(reader.result ?? '') }))
    reader.readAsDataURL(file)
  }

  if (isLoading) return <FullSpinner />

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your business profile shown on invoices and emails"
        actions={
          <Button onClick={() => update.mutate()} loading={update.isPending} leftIcon={<Save size={16} />}>
            Save changes
          </Button>
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
            </div>
            <div className="mt-4">
              <div className="font-medium text-ink">
                {form.businessName || form.name || 'Your Business'}
              </div>
              <div className="text-xs text-muted">{form.email || 'no email'}</div>
            </div>
            {form.logo && (
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                placeholder="Bank info, terms, payment instructions — these prefill on new invoices."
                value={form.paymentDetails ?? ''}
                onChange={(e) => setForm({ ...form, paymentDetails: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
