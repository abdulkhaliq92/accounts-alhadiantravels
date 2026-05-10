import { cn } from '@/lib/utils'

interface Props {
  className?: string
  showText?: boolean
  size?: number
}

export function Logo({ className, showText = true, size = 32 }: Props) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src="/favicon.svg"
        alt="Juggle Sports"
        width={size}
        height={size}
        className="select-none"
        draggable={false}
      />
      {showText && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-ink">Juggle Sports</div>
          <div className="text-[11px] uppercase tracking-wider text-muted">Invoicing</div>
        </div>
      )}
    </div>
  )
}
