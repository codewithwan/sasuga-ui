import { useEffect, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SeparatorProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
  /** Text in a small pill in the middle (horizontal only). */
  label?: ReactNode
  /** Purely visual by default; set false to expose it as a separator to assistive tech. */
  decorative?: boolean
  /** Draw the rule out from the middle (and pop the label) the first time it scrolls into view. */
  animated?: boolean
}

// The rule is the style's own line: weight --ui-bw, colour --ui-line, rounded ends.
const LINE_H = 'ui-pill h-(--ui-bw) flex-1 bg-(--ui-line) transition-[scale] duration-700 ease-snap'

/** Rounded ink rule, optionally with a label pill in the middle. */
export function Separator({ orientation = 'horizontal', label, decorative = true, animated = true, className, ...props }: SeparatorProps) {
  const a11y = decorative ? { role: 'none' } : { role: 'separator', 'aria-orientation': orientation }
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(!animated)

  useEffect(() => {
    const el = ref.current
    if (!animated || !el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [animated])

  if (orientation === 'vertical') {
    return <div {...a11y} className={cn('ui-pill mx-2 min-h-6 w-(--ui-bw) self-stretch bg-(--ui-line)', className)} {...props} />
  }

  return (
    <div ref={ref} {...a11y} className={cn('flex w-full items-center gap-3 py-2', className)} {...props}>
      <span aria-hidden="true" className={cn(LINE_H, 'origin-right', !seen && 'scale-x-0')} />
      {label ? (
        <span
          className={cn(
            'ui-head ui-border-thin ui-pill bg-accent-soft px-3 pt-1 pb-0.5 text-xs leading-none whitespace-nowrap text-ink transition-[scale,opacity] duration-500 ease-snap',
            !seen && 'scale-0 opacity-0',
          )}
        >
          {label}
        </span>
      ) : (
        <span aria-hidden="true" className={cn('ui-pill size-2 bg-accent transition-[scale] delay-200 duration-500 ease-snap', !seen && 'scale-0')} />
      )}
      <span aria-hidden="true" className={cn(LINE_H, 'origin-left', !seen && 'scale-x-0')} />
    </div>
  )
}
