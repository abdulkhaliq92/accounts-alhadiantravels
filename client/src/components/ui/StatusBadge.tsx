import { cn } from '@/lib/utils'

interface Props {
  status?: string
  className?: string
}

const map: Record<string, string> = {
  Paid: 'bg-success/10 text-success',
  Partial: 'bg-warning/10 text-warning',
  Unpaid: 'bg-danger/10 text-danger',
}

export function StatusBadge({ status, className }: Props) {
  const cls = (status && map[status]) ?? 'bg-accent-soft text-muted'
  return (
    <span className={cn('chip', cls, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status ?? '—'}
    </span>
  )
}
