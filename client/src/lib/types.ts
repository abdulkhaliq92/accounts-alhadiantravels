export type ID = string

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Partial'
export type InvoiceType = 'Invoice' | 'Receipt' | 'Quote'

export interface InvoiceItem {
  itemName: string
  unitPrice: string
  quantity: string
  discount: string
}

export interface PaymentRecord {
  _id?: string
  amountPaid: number
  datePaid: string | Date
  paymentMethod: string
  note?: string
  paidBy?: string
}

export interface Client {
  _id?: ID
  name: string
  email: string
  phone: string
  address: string
  userId?: string[]
  createdAt?: string
}

export interface Profile {
  _id?: ID
  name?: string
  email: string
  phoneNumber?: string
  businessName?: string
  contactAddress?: string
  paymentDetails?: string
  logo?: string
  website?: string
  userId?: string[]
}

export interface Invoice {
  _id?: ID
  dueDate?: string | Date
  currency: string
  items: InvoiceItem[]
  rates: string
  vat: number
  total: number
  subTotal: number
  notes?: string
  status: InvoiceStatus | string
  invoiceNumber: string
  type: InvoiceType | string
  creator: string[]
  totalAmountReceived?: number
  client?: { name: string; email: string; phone: string; address: string }
  paymentRecords?: PaymentRecord[]
  createdAt?: string
  // Augmented client-side after fetchInvoice + fetchProfile
  businessDetails?: { data?: { data?: Profile } }
}

export interface AuthUser {
  _id?: string
  email: string
  name?: string
}

export interface AuthSession {
  result: AuthUser
  userProfile?: Profile | null
  token: string
}

export interface Currency {
  code: string
  label: string
  symbol: string
}
