import { useSyncExternalStore } from 'react'

export const MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const
export type Manager = (typeof MANAGERS)[number]

export const VERB: Record<Manager, string> = { npm: 'i', pnpm: 'add', yarn: 'add', bun: 'add' }
/** How each manager runs a one-off package (used to scaffold from the template). */
export const RUN: Record<Manager, string> = { npm: 'npx', pnpm: 'pnpm dlx', yarn: 'yarn dlx', bun: 'bunx' }
export const DEV: Record<Manager, string> = { npm: '-D', pnpm: '-D', yarn: '-D', bun: '-d' }

/* The choice is shared by every snippet on the page and remembered across visits. */
const KEY = 'ui-kit:package-manager'
const EVENT = 'ui-kit:package-manager'

const isManager = (v: unknown): v is Manager => MANAGERS.includes(v as Manager)
export function readManager(): Manager {
  try {
    const v = localStorage.getItem(KEY)
    return isManager(v) ? v : 'npm'
  } catch {
    return 'npm'
  }
}
export function writeManager(m: Manager) {
  try {
    localStorage.setItem(KEY, m)
  } catch {
    /* private mode: keep it for this page only */
  }
  window.dispatchEvent(new Event(EVENT))
}
function subscribe(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener(EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(EVENT, cb)
  }
}


/** The package manager picked in any snippet on the page (shared + remembered). */
export const usePackageManager = () => useSyncExternalStore(subscribe, readManager, () => 'npm' as const)

/** Commands in the chosen manager's words. */
export const PM = {
  install: (m: Manager) => (m === 'yarn' ? 'yarn' : `${m} install`),
  run: (m: Manager, script: string) => (m === 'npm' ? `npm run ${script}` : m === 'yarn' ? `yarn ${script}` : `${m} run ${script}`),
  add: (m: Manager, pkgs: string, dev = false) => `${m} ${VERB[m]}${dev ? ` ${DEV[m]}` : ''} ${pkgs}`,
  exec: (m: Manager, cmd: string) => `${RUN[m]} ${cmd}`,
}

