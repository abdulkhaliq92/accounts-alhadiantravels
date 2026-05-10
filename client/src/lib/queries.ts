import { useQuery } from '@tanstack/react-query'

import * as api from './api'
import { getUserId, useAuth } from './auth'

export function useInvoices() {
  const session = useAuth((s) => s.session)
  const id = getUserId(session)
  return useQuery({
    queryKey: ['invoices', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.fetchInvoicesByUser(id!)
      return res.data?.data ?? []
    },
  })
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.fetchInvoice(id!)
      return res.data
    },
  })
}

export function useClients() {
  const session = useAuth((s) => s.session)
  const id = getUserId(session)
  return useQuery({
    queryKey: ['clients', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.fetchClientsByUser(id!)
      return res.data?.data ?? []
    },
  })
}

export function useProfile() {
  const session = useAuth((s) => s.session)
  const id = getUserId(session)
  return useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.fetchProfileByUser(id!)
      return res.data?.data ?? null
    },
  })
}

export function useInvoiceCount() {
  const session = useAuth((s) => s.session)
  const id = getUserId(session)
  return useQuery({
    queryKey: ['invoice-count', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.fetchInvoiceCount(id!)
      return Number(res.data) || 0
    },
  })
}
