import { useQuery } from '@tanstack/react-query'

import * as api from './api'
import { useAuth } from './auth'

export function useInvoices() {
  const token = useAuth((s) => s.session?.token)
  return useQuery({
    queryKey: ['invoices'],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.fetchInvoices()
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
  const token = useAuth((s) => s.session?.token)
  return useQuery({
    queryKey: ['clients'],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.fetchClients()
      return res.data?.data ?? []
    },
  })
}

export function useProfile() {
  const token = useAuth((s) => s.session?.token)
  return useQuery({
    queryKey: ['profile'],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.fetchSharedProfile()
      return res.data?.data ?? null
    },
  })
}

export function useInvoiceCount() {
  const token = useAuth((s) => s.session?.token)
  return useQuery({
    queryKey: ['invoice-count'],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.fetchInvoiceCount()
      return Number(res.data) || 0
    },
  })
}

export function useUsers() {
  const token = useAuth((s) => s.session?.token)
  const isAdmin = useAuth((s) => s.session?.result?.role === 'admin')
  return useQuery({
    queryKey: ['users'],
    enabled: !!token && !!isAdmin,
    queryFn: async () => {
      const res = await api.fetchUsers()
      return res.data?.data ?? []
    },
  })
}
