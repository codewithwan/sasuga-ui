import type { ReactNode } from 'react'

export type PropDoc = { name: string; type: string; default?: string; description: string }

export type DocExample = { title: string; preview: ReactNode; code: string }

export const CATEGORIES = ['Actions', 'Forms', 'Game', 'Feedback', 'Overlay', 'Display', 'Layout', 'Motion'] as const
export type Category = (typeof CATEGORIES)[number]

/**
 * One page of the component docs (/components/:slug).
 * Drop a file in src/docs/entries/<slug>.tsx with `export default { … } satisfies DocEntry`
 * and it is picked up automatically — no registry edits needed.
 */
export type DocEntry = {
  /** URL segment and file name, kebab-case: 'radio-group' */
  slug: string
  /** Display name: 'Radio Group' */
  name: string
  /** Short Japanese label shown next to the name: 'ボタン' */
  jp: string
  category: Category
  /** One or two sentences. */
  description: string
  /** Main live demo shown on the gallery card and at the top of the page. */
  preview: ReactNode
  /** Import line + minimal usage. */
  usage: string
  /** Extra variants / states. Each gets a live preview and its code. */
  examples?: DocExample[]
  props: PropDoc[]
}
