import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { useWipe } from './wipe-context'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string
  /** Text flashed on the wipe cover. */
  label?: string
  /** ms to wait before wiping (lets a click effect play first). */
  delay?: number
}

/** A real link (works with middle-click / open in new tab) that goes through the page wipe on a normal click. */
export function WipeLink({ to, label, delay = 0, onClick, ...rest }: Props) {
  const wipe = useWipe()
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (delay) window.setTimeout(() => wipe(to, label), delay)
    else wipe(to, label)
  }
  return <a href={to} {...rest} onClick={click} />
}
