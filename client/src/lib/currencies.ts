import type { Currency } from './types'

export const currencies: Currency[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'PKR', label: 'Pakistani Rupee', symbol: '₨' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', label: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦' },
  { code: 'EGP', label: 'Egyptian Pound', symbol: 'E£' },
]

export const defaultCurrency = currencies[0]

export function findCurrency(code?: string): Currency | undefined {
  if (!code) return undefined
  return currencies.find((c) => c.code === code)
}
