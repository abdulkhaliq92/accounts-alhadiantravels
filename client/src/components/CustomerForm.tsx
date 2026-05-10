import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import * as api from '@/lib/api'
import { getUserId, useAuth } from '@/lib/auth'
import type { Client } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  client?: Client | null
  onCreated?: (c: Client) => void
}

const empty: Client = { name: '', email: '', phone: '', address: '', userId: [] }

export function CustomerForm({ open, onClose, client, onCreated }: Props) {
  const session = useAuth((s) => s.session)
  const userId = getUserId(session)
  const qc = useQueryClient()
  const [form, setForm] = useState<Client>(empty)

  useEffect(() => {
    if (open) {
      setForm(
        client ? { ...empty, ...client } : { ...empty, userId: userId ? [userId] : [] },
      )
    }
  }, [open, client, userId])

  const create = useMutation({
    mutationFn: (data: Partial<Client>) => api.createClient(data),
    onSuccess: (res) => {
      toast.success('Customer added')
      qc.invalidateQueries({ queryKey: ['clients'] })
      onCreated?.(res.data)
      onClose()
    },
    onError: () => toast.error('Failed to save customer'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      api.updateClient(id, data),
    onSuccess: () => {
      toast.success('Customer updated')
      qc.invalidateQueries({ queryKey: ['clients'] })
      onClose()
    },
    onError: () => toast.error('Failed to update'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (client?._id) {
      update.mutate({ id: client._id, data: form })
    } else {
      create.mutate({ ...form, userId: userId ? [userId] : [] })
    }
  }

  const submitting = create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client?._id ? 'Edit customer' : 'Add customer'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {client?._id ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </form>
    </Modal>
  )
}
