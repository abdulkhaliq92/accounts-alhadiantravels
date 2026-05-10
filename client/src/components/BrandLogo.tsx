import { cn } from '@/lib/utils'

export const BRAND_LOGO_SRC = '/juggle-sports-logo.svg'
export const BRAND_NAME = 'Juggle Sports'

interface Props {
  className?: string
  height?: number
  fullWidth?: boolean
  alt?: string
}

export function BrandLogo({ className, height, fullWidth, alt = BRAND_NAME }: Props) {
  if (fullWidth) {
    return (
      <img
        src={BRAND_LOGO_SRC}
        alt={alt}
        className={cn('block h-auto w-full select-none', className)}
        draggable={false}
      />
    )
  }
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={alt}
      style={{ height: height ?? 56, width: 'auto' }}
      className={cn('select-none', className)}
      draggable={false}
    />
  )
}
