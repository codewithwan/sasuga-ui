import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

export type Achievement = {
  title: string
  description?: string
  /** Replaces the trophy in the stamp circle. */
  icon?: ReactNode
  /** Points chip next to the header, e.g. 50 → "+50". */
  points?: number
  /** Progress toward the next tier, shown as a chip with a mini bar. */
  next?: { value: number; max: number; label?: string }
  /** Override the host's auto-dismiss time (ms). */
  duration?: number
  /** Override the host's lettering. `false` = none. */
  sfx?: string | false
}

export type AchievementItem = Achievement & { id: number; leaving?: boolean }

/* A tiny module store: unlock() works from anywhere (event handlers, game loops),
   and whichever <AchievementHost/> is mounted renders the queue. */
let items: AchievementItem[] = []
let nextId = 1
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

/** Show an unlock banner. Returns its id. */
export function unlockAchievement(a: Achievement): number {
  const id = nextId++
  items = [...items, { ...a, id }]
  emit()
  return id
}

/** Start the exit animation of a banner. */
export function dismissAchievement(id: number) {
  if (!items.some((i) => i.id === id && !i.leaving)) return
  items = items.map((i) => (i.id === id ? { ...i, leaving: true } : i))
  emit()
}

/** Remove a banner right away (the host calls this once the exit animation ends). */
export function removeAchievement(id: number) {
  items = items.filter((i) => i.id !== id)
  emit()
}

const subscribe = (f: () => void) => {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}
const snapshot = () => items

/** The live queue (used by AchievementHost). */
export const useAchievementQueue = () => useSyncExternalStore(subscribe, snapshot, snapshot)

const api = { unlock: unlockAchievement, dismiss: dismissAchievement }

/** `const { unlock } = useAchievement()` → `unlock({ title: 'First Blood' })`. Needs an <AchievementHost/> mounted somewhere. */
export const useAchievement = () => api
