import { useEffect, useRef, useState } from 'react'
import { BrandMark } from '@/components/art/stickers'
import { prefersReducedMotion, uiStyle } from '@/fx'
import { site } from '@/data/site'
import { cn } from '@/lib/utils'
import { brand } from '../../../brand.config'

/*
 * The landing page's title card: a short, confident title sequence (≈1 s once the fonts are in).
 *
 *   load     the mark spins up inside a thin ring while the style's faces load
 *            (≤1.2 s, at least 360 ms so it never flickers; no text shows in a fallback face)
 *   0        the spin settles upright, the mark rises to its place with one scale pop, the ring pings out
 *   120      the wordmark rolls up letter by letter out of a clipped line, a hair of overshoot
 *   200      an accent line draws under it, left to right, like a bar reaching 100 %
 *   480      the tagline fades up
 *   960      the title fades, the paper splits down the middle and the halves slide apart (onReveal)
 *   1520     done (onDone)
 *
 * Only transform and opacity animate, no filters, no canvas, ~35 nodes.
 * Flat fades and scales in place and the card fades out instead of splitting.
 * Reduced motion skips it. Any click or key skips (mid-title it jumps to the exit).
 */

const NAME = site.name
/** The wordmark: word, then the accent suffix. */
const WORDS = [site.word, site.suffix]
const FLUSH = site.suffix.startsWith('/')
const TAGLINE = brand.tagline
const LETTERS = [...NAME.replace(/ /g, '')].length
/** A first guess that keeps the wordmark on one line; it is fitted to the screen once the faces load. */
const NAME_SIZE = `min(120px, 12vmin, ${(96 / Math.max(NAME.length, 1)).toFixed(1)}vw)`

const OUT = 'cubic-bezier(.2,.9,.25,1)'
/** A hair of overshoot: the letters pass their line by a few percent and come back. */
const ROLL = 'cubic-bezier(.25,1.25,.4,1)'
const POP = 'cubic-bezier(.3,1.5,.5,1)'
const SPLIT = 'cubic-bezier(.76,0,.24,1)'

/** Resolves once the active style's display, jp and body faces are loaded, or after `ms`. */
function fontsReady(ms: number) {
  const fonts = document.fonts
  if (!fonts) return Promise.resolve()
  const cs = getComputedStyle(document.documentElement)
  const first = (name: string) => cs.getPropertyValue(name).split(',')[0].trim()
  const weight = cs.getPropertyValue('--ui-font-weight').trim() || '400'
  const loads = [
    fonts.load(`${weight} 40px ${first('--font-display')}`, `${NAME} Click to skip`),
    ...(site.mark === 'heart' || site.mark === 'star' ? [] : [fonts.load(`40px ${first('--font-jp')}`, site.mark)]),
    fonts.load(`500 16px ${first('--font-sans')}`, `${TAGLINE} Loading`),
  ]
  return Promise.race([Promise.allSettled(loads), new Promise((r) => window.setTimeout(r, ms))])
}

/** The current rotation of an element in degrees, 0–360. */
function angleOf(el: Element) {
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  const m = new DOMMatrix(t)
  return ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360
}

type Props = {
  /** The cover starts to open: the page underneath can start its own entrance. */
  onReveal?: () => void
  /** The sequence is over (or skipped): unmount the overlay. */
  onDone: () => void
}

export function Intro({ onReveal, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [flat] = useState(() => uiStyle() === 'flat')

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (prefersReducedMotion()) {
      onReveal?.()
      onDone()
      return
    }

    const anims: Animation[] = []
    const timers: number[] = []
    let alive = true
    let revealed = false
    let stage: 'load' | 'title' | 'exit' = 'load'

    const q = (k: string) => [...el.querySelectorAll<HTMLElement>(`[data-i="${k}"]`)]
    const one = (k: string) => el.querySelector<HTMLElement>(`[data-i="${k}"]`)
    const run = (n: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions = {}) => {
      if (!n) return undefined
      const a = n.animate(frames, { fill: 'both', ...opts })
      anims.push(a)
      return a
    }
    const play = (k: string, frames: Keyframe[], opts: KeyframeAnimationOptions = {}) => q(k).forEach((n) => run(n, frames, opts))
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const clear = () => timers.splice(0).forEach(clearTimeout)
    const reveal = () => {
      if (revealed) return
      revealed = true
      onReveal?.()
    }
    const finish = () => {
      if (!alive) return
      alive = false
      clear()
      reveal()
      onDone()
    }

    const move = one('move')
    const spin = one('spin')
    const glyph = spin?.querySelector<SVGElement>('[data-glyph]') ?? null

    /* load: in cel / manga the mark waits at screen centre (dy below its place) and spins up; in flat it waits in place */
    let dy = 0
    const centre = () => {
      if (flat || !move) return
      const r = move.getBoundingClientRect()
      dy = window.innerHeight / 2 - (r.top - dy + r.height / 2)
      move.style.transform = `translateY(${dy.toFixed(1)}px)`
    }
    centre()
    play('pop', [{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: OUT })
    run(glyph, [{ opacity: 0 }], { duration: 1 })
    let spinning: Animation | undefined
    if (flat) {
      play('track', [{ transform: 'scale(.94)', opacity: 0.12 }, { transform: 'scale(1.04)', opacity: 0.3 }], {
        duration: 700,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out',
      })
    } else {
      spinning = run(spin, [{ transform: 'rotate(0turn)' }, { transform: 'rotate(1turn)' }], { duration: 1600, iterations: Infinity, easing: 'linear' })
      if (spinning) spinning.playbackRate = 0.3
      at(140, () => spinning?.updatePlaybackRate(0.65))
      at(300, () => spinning?.updatePlaybackRate(1))
      play('arc', [{ transform: 'rotate(0turn)' }, { transform: 'rotate(1turn)' }], { duration: 850, iterations: Infinity, easing: 'linear' })
    }

    const exit = (fast: boolean) => {
      stage = 'exit'
      clear()
      const k = fast ? 0.6 : 1
      play('hint', [{ opacity: 0 }], { duration: 100 })
      if (flat) {
        reveal()
        play('content', [{ transform: 'none' }, { transform: 'scale(1.03)' }], { duration: 300 * k, easing: 'ease-in' })
        run(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 * k, easing: 'ease-out' })
        at(300 * k, finish)
        return
      }
      play('content', [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 200 * k, easing: 'cubic-bezier(.5,0,.75,0)' })
      at(40 * k, () => {
        reveal()
        play('edge', [{ opacity: 0 }, { opacity: 1 }], { duration: 120 })
        play('left', [{ transform: 'none' }, { transform: 'translateX(-101%)' }], { duration: 560 * k, easing: SPLIT })
        play('right', [{ transform: 'none' }, { transform: 'translateX(101%)' }], { duration: 560 * k, easing: SPLIT })
      })
      at(600 * k, finish)
    }

    const title = () => {
      stage = 'title'

      // the real faces are in: size the wordmark to the screen once, keeping the waiting mark where it is
      const name = one('name')
      if (name) {
        const w = name.getBoundingClientRect().width
        const cur = parseFloat(getComputedStyle(name).fontSize)
        const max = Math.min(120, 0.15 * Math.min(window.innerWidth, window.innerHeight))
        if (w > 0) name.style.fontSize = `${Math.min(max, (cur * Math.min(window.innerWidth * 0.84, 960)) / w).toFixed(1)}px`
      }
      centre()

      // the mark: the spin settles upright with a hair of overshoot, it rises to its place and pops once
      if (spinning && spin) {
        const from = angleOf(spin)
        spinning.cancel()
        run(spin, [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${from > 240 ? 720 : 360}deg)` }], { duration: 520, easing: ROLL })
      }
      if (!flat) run(move, [{ transform: `translateY(${dy.toFixed(1)}px)` }, { transform: 'none' }], { duration: 560, easing: OUT })
      play('pop', [{ transform: 'none' }, { transform: 'scale(1.14)', offset: 0.35 }, { transform: 'scale(.97)', offset: 0.7 }, { transform: 'none' }], {
        duration: 420,
        delay: 60,
        easing: 'ease-out',
      })
      run(glyph, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 140 })
      play('arc', [{ opacity: 1 }, { opacity: 0 }], { duration: 140 })
      play('track', [{ transform: 'none', opacity: 0.2 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 480, delay: 60, easing: OUT })

      // the wordmark rolls up out of its line, letter by letter
      const stagger = Math.min(32, 320 / Math.max(LETTERS, 1))
      q('ch').forEach((n, i) =>
        run(
          n,
          flat
            ? [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }]
            : [{ opacity: 0, transform: 'translateY(115%)' }, { opacity: 1, transform: 'translateY(30%)', offset: 0.3 }, { opacity: 1, transform: 'none' }],
          { duration: flat ? 360 : 460, delay: 120 + i * stagger, easing: flat ? POP : ROLL },
        ),
      )

      // the bar fills to 100 %, then the tagline and the hint come up
      play('bar', [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 160 })
      play('fill', [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 640, delay: 200, easing: 'cubic-bezier(.65,0,.35,1)' })
      play('tag', [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 480, easing: OUT })
      play('hint', [{ opacity: 0 }, { opacity: 0.55 }], { duration: 240, delay: 400 })

      at(960, () => exit(false))
    }

    const t0 = performance.now()
    fontsReady(1200).then(() => {
      if (!alive) return
      at(Math.max(0, 360 - (performance.now() - t0)), title)
    })

    const skip = () => {
      if (stage === 'title') exit(true)
      else if (stage === 'load') finish()
    }
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    return () => {
      alive = false
      clear()
      anims.forEach((a) => a.cancel())
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [flat, onReveal, onDone])

  return (
    <div ref={root} className="fixed inset-0 z-[9600] overflow-hidden text-ink">
      <p className="sr-only" role="status">
        Loading {NAME}
      </p>
      <div aria-hidden="true" className="absolute inset-0 select-none">
        {/* the paper: two halves that part at the end, each painting the whole screen's pattern so the seam is invisible */}
        {(['left', 'right'] as const).map((side) => (
          <div
            key={side}
            data-i={side}
            className={cn('absolute inset-y-0 overflow-hidden bg-paper', side === 'left' ? 'left-0 w-[calc(50%+1px)]' : 'right-0 w-1/2')}
          >
            <div className={cn('absolute inset-y-0 w-[200%]', side === 'left' ? 'left-0' : 'right-0')} style={PAPER} />
            <span data-i="edge" className={cn('absolute inset-y-0 w-0.5 bg-accent opacity-0', side === 'left' ? 'right-0' : 'left-0')} />
          </div>
        ))}

        <div data-i="content" className="absolute inset-0 grid place-items-center px-4">
          <div className="grid justify-items-center">
            <div data-i="move" className="relative mb-[clamp(18px,3.4vmin,32px)]">
              <div data-i="pop" className="relative grid size-[clamp(64px,13vmin,112px)] place-items-center opacity-0">
                <Ring flat={flat} />
                <div data-i="spin" className="w-full">
                  <BrandMark mark={site.mark} />
                </div>
              </div>
            </div>

            <div className="grid justify-items-stretch">
              <p data-i="name" className={cn('ui-head m-0 flex leading-none whitespace-nowrap', FLUSH ? 'gap-0' : 'gap-[0.28em]')} style={{ fontSize: NAME_SIZE }}>
                {WORDS.map((word, w) => (
                  <span
                    key={w}
                    className={cn('-mx-[0.06em] -my-[0.14em] inline-block overflow-hidden px-[0.06em] py-[0.14em]', WORDS.length > 1 && w === WORDS.length - 1 && 'text-accent')}
                  >
                    {[...word].map((ch, i) => (
                      <span key={i} data-i="ch" className="inline-block opacity-0">
                        {ch}
                      </span>
                    ))}
                  </span>
                ))}
              </p>
              <div data-i="bar" className="relative mt-[clamp(12px,2.2vmin,20px)] h-[3px] overflow-hidden ui-pill opacity-0">
                <span className="absolute inset-0 bg-current opacity-10" />
                <span data-i="fill" className="absolute inset-0 origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />
              </div>
            </div>

            <p data-i="tag" className="m-0 mt-[clamp(12px,2vmin,18px)] text-center text-[clamp(13px,1.1vmin+9px,17px)] text-mute opacity-0">
              {TAGLINE}
            </p>
          </div>
        </div>

        <p data-i="hint" className="ui-head absolute right-4 bottom-4 m-0 text-xs text-mute opacity-0">
          Click to skip
        </p>
      </div>
    </div>
  )
}

/** Paper with a faint dot grid and a soft accent glow behind the title. Static, token-based. */
const PAPER = {
  backgroundImage: [
    'radial-gradient(closest-side, color-mix(in srgb, var(--color-accent-soft) 28%, transparent), transparent)',
    'radial-gradient(circle, color-mix(in srgb, var(--color-ink) 9%, transparent) 1px, transparent 1.6px)',
  ].join(', '),
  backgroundSize: 'min(1100px, 120vmax) min(700px, 90vmax), 24px 24px',
  backgroundPosition: 'center, center',
  backgroundRepeat: 'no-repeat, repeat',
} as const

/** A thin ring around the mark: a faint track plus a short arc that runs while the faces load (no arc in flat). */
function Ring({ flat }: { flat: boolean }) {
  return (
    <div className="pointer-events-none absolute -inset-[34%]">
      <svg data-i="track" viewBox="0 0 100 100" className="absolute inset-0 size-full opacity-20">
        <circle cx={50} cy={50} r={48} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      {!flat && (
        <svg data-i="arc" viewBox="0 0 100 100" className="absolute inset-0 size-full text-accent">
          <circle
            cx={50}
            cy={50}
            r={48}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="22 78"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  )
}
