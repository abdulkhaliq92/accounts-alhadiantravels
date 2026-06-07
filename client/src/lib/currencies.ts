import type { Currency } from './types'

export const currencies: Currency[] = [
  { code: 'PKR', label: 'Pakistani Rupee', symbol: '₨' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
]

export const defaultCurrency = currencies[0]

export function findCurrency(code?: string): Currency | undefined {
  if (!code) return undefined
  return currencies.find((c) => c.code === code)
}
