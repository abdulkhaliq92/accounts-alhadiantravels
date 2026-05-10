import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-6 w-6 animate-spin rounded-full border-2 border-ink/15 border-t-ink',
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

export function FullSpinner() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <Spinner />
    </div>
  )
}
