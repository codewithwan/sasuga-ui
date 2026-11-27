import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn-style class combiner: conditional classes + Tailwind conflict resolution.
 *  The ui-* token utilities are unknown to tailwind-merge, so they are always kept. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
