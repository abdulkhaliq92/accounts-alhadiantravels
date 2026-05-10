import axios from 'axios'

import type { AuthSession, Client, Invoice, Profile } from './types'

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'https://accounts-jugglesports-api.vercel.app'
export const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('profile')
  if (raw) {
    try {
      const session = JSON.parse(raw) as AuthSession
      if (session?.token) {
        config.headers.set('Authorization', `Bearer ${session.token}`)
      }
    } catch {
      /* ignore */
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('profile')
    }
    return Promise.reject(err)
  },
)

/* ---------------- Auth ---------------- */
export const signIn = (data: { email: string; password: string }) =>
  api.post<AuthSession>('/users/signin', data)
export const signUp = (data: {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}) => api.post<AuthSession>('/users/signup', data)
export const forgotPassword = (data: { email: string }) =>
  api.post<{ message: string }>('/users/forgot', data)
export const resetPassword = (data: { password: string; token: string }) =>
  api.post<{ message: string }>('/users/reset', data)

/* ---------------- Profile ---------------- */
export const fetchProfileByUser = (userIdValue: string) =>
  api.get<{ data: Profile | null }>(`/profiles?searchQuery=${encodeURIComponent(userIdValue)}`)
export const fetchProfile = (id: string) => api.get<Profile>(`/profiles/${id}`)
export const createProfile = (data: Partial<Profile>) =>
  api.post<Profile>('/profiles', data)
export const updateProfile = (id: string, data: Partial<Profile>) =>
  api.patch<Profile>(`/profiles/${id}`, data)

/* ---------------- Clients ---------------- */
export const fetchClientsByUser = (userIdValue: string) =>
  api.get<{ data: Client[] }>(
    `/clients/user?searchQuery=${encodeURIComponent(userIdValue)}`,
  )
export const createClient = (data: Partial<Client>) =>
  api.post<Client>('/clients', data)
export const updateClient = (id: string, data: Partial<Client>) =>
  api.patch<Client>(`/clients/${id}`, data)
export const deleteClient = (id: string) =>
  api.delete<{ message: string }>(`/clients/${id}`)

/* ---------------- Invoices ---------------- */
export const fetchInvoicesByUser = (userIdValue: string) =>
  api.get<{ data: Invoice[] }>(
    `/invoices?searchQuery=${encodeURIComponent(userIdValue)}`,
  )
export const fetchInvoice = (id: string) => api.get<Invoice>(`/invoices/${id}`)
export const fetchInvoiceCount = (userIdValue: string) =>
  api.get<number>(`/invoices/count?searchQuery=${encodeURIComponent(userIdValue)}`)
export const createInvoice = (data: Partial<Invoice>) =>
  api.post<Invoice>('/invoices', data)
export const updateInvoice = (id: string, data: Partial<Invoice>) =>
  api.patch<Invoice>(`/invoices/${id}`, data)
export const deleteInvoice = (id: string) =>
  api.delete<{ message: string }>(`/invoices/${id}`)

/* ---------------- PDF ---------------- */
export const createPdf = (payload: Record<string, unknown>) =>
  api.post<{ success: boolean; message?: string }>('/create-pdf', payload)
export const fetchPdf = () =>
  api.get('/fetch-pdf', { responseType: 'blob' })
export const sendPdf = (payload: Record<string, unknown>) =>
  api.post('/send-pdf', payload)
