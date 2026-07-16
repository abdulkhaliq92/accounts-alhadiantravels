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

export interface BankAccount {
  _id?: ID
  label: string
  bankName?: string
  accountTitle?: string
  accountNumber?: string
  iban?: string
  swiftCode?: string
  branchAddress?: string
  currency?: string
  isDefault?: boolean
  notes?: string
  // Set only on the snapshot stored on an invoice — points back at the
  // Settings bank account it was copied from, so the editor can preselect it.
  sourceAccountId?: string
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
  bankAccounts?: BankAccount[]
}

export type Permission =
  | 'invoicesView'
  | 'invoicesCreate'
  | 'invoicesEdit'
  | 'invoicesDelete'
  | 'customersManage'
  | 'settingsManage'
  | 'bankAccountsManage'

export type UserPermissions = Record<Permission, boolean>

export type UserRole = 'admin' | 'staff'

export interface AppUser {
  _id: ID
  name: string
  email: string
  role: UserRole
  permissions: UserPermissions
  active: boolean
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
  bankAccount?: BankAccount | null
  paymentRecords?: PaymentRecord[]
  createdAt?: string
  // Augmented client-side after fetchInvoice + fetchProfile
  businessDetails?: { data?: { data?: Profile } }
}

export interface AuthUser {
  _id?: string
  email: string
  name?: string
  role?: UserRole
  permissions?: UserPermissions
  active?: boolean
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
