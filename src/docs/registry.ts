import { CATEGORIES } from './types'
import type { DocEntry } from './types'

// Every file in ./entries is a page. Vite inlines them at build time.
const modules = import.meta.glob<{ default: DocEntry }>('./entries/*.tsx', { eager: true })

export const docs: DocEntry[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name))

export const findDoc = (slug: string | undefined) => docs.find((d) => d.slug === slug)
