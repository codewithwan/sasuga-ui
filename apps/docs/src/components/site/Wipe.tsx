import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { prefersReducedMotion, uiStyle } from '@/fx'
import type { UiStyle } from '@/fx'
import { setSwitchCover } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { WipeContext, landOn } from './wipe-context'
import type { WipeFn } from './wipe-context'

type Phase = 'idle' | 'in' | 'out'

/** cover = until the page is hidden, hold = label on screen, out = cover leaving */
const TIMING: Record<UiStyle, { cover: number; hold: number; out: number }> = {
  cel: { cover: 480, hold: 340, out: 520 },
  manga: { cover: 400, hold: 380, out: 460 },
  flat: { cover: 180, hold: 90, out: 220 },
}

/* Manga focus lines: thin white wedges converging on the centre (deterministic). */
const FOCUS = Array.from({ length: 44 }, (_, i) => {
  const a = (i / 44) * Math.PI * 2 + ((i * 37) % 11) * 0.004
  const w = 0.012 + ((i * 17) % 5) * 0.004
  const inner = 34 + ((i * 29) % 13)
  const p = (ang: number, r: number) => `${(50 + Math.cos(ang) * r).toFixed(2)},${(50 + Math.sin(ang) * r).toFixed(2)}`
  return `M${p(a, inner)}L${p(a - w, 90)}L${p(a + w, 90)}Z`
}).join('')

/* Each layer's position in a phase. `idle` snaps back with no transition. */
const X: Record<Phase, string> = { idle: 'translate-x-[110%] duration-0', in: 'translate-x-0', out: '-translate-x-[110%]' }
const Y: Record<Phase, string> = { idle: '-translate-y-[110%] duration-0', in: 'translate-y-0', out: 'translate-y-[110%]' }

/**
 * Page transition, drawn per style:
 *   cel   — a rounded accent-soft panel with an ink outline sweeps across, an accent panel follows with the label
 *   manga — a screentone page then a black panel with focus lines drops down, label in big lettering
 *   flat  — a quick fade
 * The page changes underneath while covered (route change or in-page scroll).
 */
export function Wipe({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [mode, setMode] = useState<UiStyle>('cel')
  const [label, setLabel] = useState('')
  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const pendingHash = useRef<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // After a route change triggered under the cover, land on the requested spot.
  useEffect(() => {
    if (pendingHash.current === null) return
    const hash = pendingHash.current
    pendingHash.current = null
    requestAnimationFrame(() => landOn(hash))
  }, [location.pathname])

  const go = useCallback<WipeFn>(
    (to, text = '') => {
      if (busy.current) return
      const action = typeof to === 'function' ? to : null
      const [rawPath, hash = ''] = action ? [''] : (to as string).split('#')
      const path = rawPath || location.pathname
      const samePage = path === location.pathname

      const land = () => {
        if (action) {
          action()
          return
        }
        if (samePage) {
          landOn(hash)
          if (hash) history.replaceState(null, '', `#${hash}`)
        } else {
          pendingHash.current = hash
          navigate(hash ? `${path}#${hash}` : path)
        }
      }

      if (prefersReducedMotion()) return land()
      const style = uiStyle()
      const t = TIMING[style]
      busy.current = true
      setMode(style)
      setLabel(text)
      // one frame at the idle position first, so the cover always slides in from off-screen
      requestAnimationFrame(() => setPhase('in'))
      const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
      at(t.cover, land)
      at(t.cover + t.hold, () => setPhase('out'))
      at(t.cover + t.hold + t.out, () => {
        setPhase('idle')
        busy.current = false
      })
    },
    [location.pathname, navigate],
  )

  // theme / style / mode switches play this same screen (see setSwitchCover in lib/theme)
  useEffect(() => setSwitchCover((apply, label) => go(apply, label)), [go])
  useEffect(() => () => setSwitchCover(null), [])

  const shown = phase === 'in'

  return (
    <WipeContext value={go}>
      {children}
      <div aria-hidden="true" className={cn('pointer-events-none fixed inset-0 z-[9500] overflow-hidden', phase === 'idle' && 'invisible')}>
        {mode === 'cel' && (
          <>
            <div className={cn('ui-border ui-r-lg absolute -inset-3 bg-accent-soft transition-transform duration-[420ms] ease-whip', X[phase])} />
            <div
              className={cn(
                'ui-border ui-r-lg absolute -inset-3 grid place-items-center bg-accent px-6 transition-transform delay-[70ms] duration-[440ms] ease-whip',
                X[phase],
              )}
            >
              {label && (
                <span
                  className={cn(
                    'ui-head max-w-full text-center text-[clamp(40px,9vw,128px)] leading-none text-white transition duration-300 ease-snap',
                    shown ? 'translate-y-0 scale-100 opacity-100 delay-[300ms]' : 'translate-y-6 scale-90 opacity-0',
                  )}
                >
                  {label}
                </span>
              )}
            </div>
          </>
        )}

        {mode === 'manga' && (
          <>
            <div className={cn('ui-tex absolute inset-0 bg-paper transition-transform duration-[360ms] ease-whip', Y[phase])} />
            <div className={cn('absolute inset-0 grid place-items-center bg-ink px-6 transition-transform delay-[60ms] duration-[380ms] ease-whip', Y[phase])}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className={cn('absolute inset-0 size-full fill-paper transition duration-500 ease-out', shown ? 'scale-100 opacity-90' : 'scale-125 opacity-0')}
              >
                <path d={FOCUS} />
              </svg>
              {label && (
                <span
                  className={cn(
                    'ui-head relative max-w-full text-center text-[clamp(48px,11vw,160px)] leading-none text-paper transition duration-200 ease-snap',
                    shown ? 'scale-100 opacity-100 delay-[260ms]' : 'scale-150 opacity-0',
                  )}
                >
                  {label}
                </span>
              )}
            </div>
          </>
        )}

        {mode === 'flat' && (
          <div
            className={cn(
              'absolute inset-0 grid place-items-center bg-paper transition-opacity ease-out',
              phase === 'idle' ? 'opacity-0 duration-0' : shown ? 'opacity-100 duration-[180ms]' : 'opacity-0 duration-[220ms]',
            )}
          >
            {label && <span className="ui-head text-[clamp(24px,4vw,40px)] leading-none text-ink">{label}</span>}
          </div>
        )}
      </div>
    </WipeContext>
  )
}
