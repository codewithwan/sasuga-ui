import { useContext } from 'react'
import type { ReactNode } from 'react'
import { WipeLink } from '@/components/site/WipeLink'
import { cn } from '@/lib/utils'
import { XRayContext } from './xray-context'

type Props = {
  /** Component name shown in the tag: `<HealthBar />`. */
  name: string
  /** Docs slug the tag links to (/components/:slug). Omit for a plain, unlinked note. */
  slug?: string
  /** Where the tag sits. */
  at?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
  children?: ReactNode
}

const AT = {
  'top-left': '-top-2.5 left-1.5',
  'top-right': '-top-2.5 right-1.5',
  'bottom-left': 'bottom-1.5 left-1.5',
  'bottom-right': 'bottom-1.5 right-1.5',
} as const

/**
 * Wraps one kit component in a landing sample. Always rendered (so the child never remounts);
 * with X-ray on it draws a dashed outline and a tag that links to the component's docs.
 */
export function XRay({ name, slug, at = 'top-left', className, children }: Props) {
  const on = useContext(XRayContext)
  const tag = `<${name} />`
  return (
    <div data-xray={on ? name : undefined} className={cn('relative', on && 'ui-r-sm outline-2 outline-offset-2 outline-pop outline-dashed', className)}>
      {children}
      {on &&
        (slug ? (
          <WipeLink
            to={`/components/${slug}`}
            label={name}
            className={cn(
              'ui-pill ui-fill absolute z-40 animate-pop bg-pop px-2 py-1 text-[11px] leading-none font-extrabold whitespace-nowrap text-white no-underline ui-shadow-sm transition-transform duration-150 ease-snap hover:-translate-y-0.5 focus-visible:ui-focus',
              AT[at],
            )}
          >
            {tag}
            <span className="sr-only"> docs</span>
          </WipeLink>
        ) : (
          <span className={cn('ui-pill ui-border-thin absolute z-40 animate-pop bg-paper px-2 py-1 text-[11px] leading-none font-extrabold whitespace-nowrap text-mute', AT[at])}>
            {name}
          </span>
        ))}
    </div>
  )
}
