import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Mascot } from '@/components/art/mascot'
import type { MascotColors, MascotExpression } from '@/components/art/mascot'
import { Icon } from '@/components/ui/icon'
import { TAU, burst, clamp, delayed, prefersReducedMotion, rand, rays, sfx, shards, smoke, sparkle, spawn, speedLines, uiStyle, useSprings } from '@/fx'
import { C } from '@/fx/palette'
import { cn } from '@/lib/utils'

export type GachaRarity = 'N' | 'R' | 'SR' | 'SSR'

export type GachaCardProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'children'> & {
  rarity: GachaRarity
  title: string
  subtitle?: string
  /** Illustration for the front. Default: the mascot, dressed up a little more per rarity. */
  art?: ReactNode
  /** Controlled face-up state. Pair with `onReveal`. */
  revealed?: boolean
  defaultRevealed?: boolean
  /** Fired when the reader flips a face-down card (click / Enter / Space). */
  onReveal?: (rarity: GachaRarity) => void
  /** Fired when the whole reveal sequence has finished. */
  onLanded?: (rarity: GachaRarity) => void
  /** Lettering for SR ('SR!') and SSR ('SSR!!') pulls. `false` = none. */
  sfx?: string | false
  /** `md` = 184px wide, `sm` = 128px (for multi-pull rows). */
  size?: 'sm' | 'md'
  /** Timing multiplier for the reveal: 2 = slow motion. */
  tempo?: number
  /** Darken the card's own stage while an SR / SSR charges. Turn off when a parent dims a whole row. */
  dim?: boolean
}

type RarityConfig = { rc: string; ink: string; stars: number; name: string; lvl: 0 | 1 | 2 | 3; face: MascotExpression; dress: MascotColors }

const RARITY: Record<GachaRarity, RarityConfig> = {
  N: { rc: 'var(--color-mute)', ink: 'text-paper', stars: 1, name: 'Normal', lvl: 0, face: 'neutral', dress: {} },
  R: {
    rc: 'var(--color-accent-soft)',
    ink: 'text-ink',
    stars: 2,
    name: 'Rare',
    lvl: 1,
    face: 'happy',
    dress: { outfit: 'color-mix(in srgb, var(--color-accent-soft) 55%, #fffaf4)' },
  },
  SR: {
    rc: 'var(--color-accent)',
    ink: 'text-white',
    stars: 3,
    name: 'Super Rare',
    lvl: 2,
    face: 'smug',
    dress: { trim: 'color-mix(in srgb, var(--color-pop) 55%, var(--m-line))', ribbon: 'var(--color-accent)' },
  },
  SSR: {
    rc: 'var(--color-pop)',
    ink: 'text-white',
    stars: 5,
    name: 'Super Special Rare',
    lvl: 3,
    face: 'wink',
    dress: {
      outfit: 'color-mix(in srgb, var(--color-pop) 16%, #fffaf4)',
      trim: 'color-mix(in srgb, var(--color-pop) 70%, var(--m-line))',
      ribbon: 'var(--color-accent)',
      eyes: 'var(--color-accent)',
    },
  },
}

const RAINBOW = ['hsl(340 95% 66%)', 'hsl(35 100% 60%)', 'hsl(55 100% 60%)', 'hsl(150 75% 52%)', 'hsl(200 95% 60%)', 'hsl(265 90% 70%)']
const FOIL =
  'radial-gradient(circle at var(--mx, 50%) var(--my, 35%), hsl(48 100% 96% / .6), transparent 42%), repeating-linear-gradient(115deg, hsl(340 100% 72% / .55) 0%, hsl(45 100% 68% / .55) 6%, hsl(150 90% 62% / .55) 12%, hsl(200 100% 68% / .55) 18%, hsl(270 100% 74% / .55) 24%, hsl(340 100% 72% / .55) 30%)'
const SWEEP = `linear-gradient(100deg, transparent 30%, ${RAINBOW.map((c) => c.replace(')', ' / .55)')).join(', ')}, transparent 70%)`
const SUNBURST = 'repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--rc) 60%, transparent) 0deg 7deg, transparent 7deg 18deg)'
const RADIAL_FADE = 'radial-gradient(closest-side, #000 25%, transparent)'
const DIM = 'light-dark(color-mix(in srgb, var(--color-ink) 58%, transparent), color-mix(in srgb, var(--color-canvas) 72%, transparent))'

// Constant objects: React never re-applies them.
const FRONT: CSSProperties = { transform: 'rotateY(180deg)' }
const STAMP: CSSProperties = { fontFamily: 'var(--font-display)', color: 'var(--color-pop)', opacity: 0 }
const POP = 'cubic-bezier(.2,1.6,.4,1)'

/** Anticipation: a jitter that grows, squashing a little as it winds up. */
function windUp(amp: number, steps = 22): Keyframe[] {
  return Array.from({ length: steps + 1 }, (_, k) => {
    const g = k / steps
    const a = k === steps ? 0 : amp * (0.15 + g * g)
    return { translate: `${rand(-a, a)}px ${rand(-a, a) * 0.6}px`, scale: `${1 - 0.06 * g}`, offset: g }
  })
}

const PARTICLES = Array.from({ length: 14 }, (_, k) => ({ x: 0.08 + (((k * 37) % 100) / 100) * 0.84, s: 0.6 + ((k * 13) % 7) / 10 }))

const rectCenter = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }
}

/**
 * A collectible card dealt face-down on its own little stage. A pull plays in stages:
 * the card trembles as a rarity-coloured aura and rising particles build (an SSR starts
 * out looking like an SR, then turns), the stage dims, a beam of light and a sunburst
 * break, the card flips with motion blur and lands with a hit sized to its rarity. Then
 * each star stamps in on its own spot with its own burst, the name banner slams down and
 * SR / SSR finish with lettering (SSR: rainbow sweep and confetti). Every DOM effect is
 * clipped to the stage, so the card never paints over its neighbours. Face-up, the card
 * tilts toward the pointer and its foil follows it.
 */
export function GachaCard({
  rarity,
  title,
  subtitle,
  art,
  revealed,
  defaultRevealed = false,
  onReveal,
  onLanded,
  sfx: sfxText,
  size = 'md',
  tempo = 1,
  dim = true,
  className,
  onClick,
  onPointerMove,
  onPointerLeave,
  ...rest
}: GachaCardProps) {
  const [inner, setInner] = useState(defaultRevealed)
  const open = revealed ?? inner
  const [landed, setLanded] = useState(open)
  // flipping resets "landed" during render (reduced motion lands at once); the reveal lands it later
  const [seenOpen, setSeenOpen] = useState(open)
  if (seenOpen !== open) {
    setSeenOpen(open)
    setLanded(open && prefersReducedMotion())
  }
  const cfg = RARITY[rarity]
  const sm = size === 'sm'
  const stage = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLButtonElement>(null)
  const shakeEl = useRef<HTMLSpanElement>(null)
  const tiltEl = useRef<HTMLSpanElement>(null)
  const flipEl = useRef<HTMLSpanElement>(null)
  const glint = useRef<HTMLSpanElement>(null)
  const foil = useRef<HTMLSpanElement>(null)
  const flash = useRef<HTMLSpanElement>(null)
  const aura = useRef<HTMLSpanElement>(null)
  const auraHi = useRef<HTMLSpanElement>(null)
  const sun = useRef<HTMLSpanElement>(null)
  const beam = useRef<HTMLSpanElement>(null)
  const sparks = useRef<HTMLSpanElement>(null)
  const dimEl = useRef<HTMLSpanElement>(null)
  const sweep = useRef<HTMLSpanElement>(null)
  const stamp = useRef<HTMLSpanElement>(null)
  const stars = useRef<HTMLSpanElement>(null)
  const banner = useRef<HTMLSpanElement>(null)
  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const anims = useRef<Animation[]>([])
  const prevOpen = useRef(open)
  const landedCb = useRef(onLanded)
  useEffect(() => {
    landedCb.current = onLanded
  })

  const flip = useSprings(
    flipEl,
    { f: open ? 180 : 0, y: 0, s: 1 },
    (v, el) => {
      el.style.transform = `translateY(${v.y}px) rotateY(${v.f}deg) scale(${v.s})`
    },
    { stiffness: 170, damping: 15 },
  )
  // hover is this card's own: its own pointer events drive its own spring and its own layers
  const tilt = useSprings(
    tiltEl,
    { rx: 0, ry: 0, s: 1, g: -1 },
    (v, el) => {
      el.style.transform = `perspective(900px) rotateX(${v.rx}deg) rotateY(${v.ry}deg) scale(${v.s})`
      const hover = clamp((v.s - 1) * 25, 0, 1)
      if (glint.current) {
        glint.current.style.backgroundPosition = `${50 - v.g * 55}% 0`
        glint.current.style.opacity = String(hover)
      }
      if (foil.current) foil.current.style.opacity = String(0.45 + hover * 0.55)
    },
    { stiffness: 260, damping: 20 },
  )

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      anims.current.forEach((a) => a.cancel())
    },
    [],
  )

  useEffect(() => {
    if (prevOpen.current === open) return
    prevOpen.current = open
    const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    const play = (el: Element | null | undefined, kf: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = el?.animate(kf, opts)
      if (a) anims.current.push(a)
      return a
    }
    const faces = () => Array.from(flipEl.current?.children ?? [])
    timers.current.forEach(clearTimeout)
    anims.current.forEach((a) => a.cancel())
    timers.current = []
    anims.current = []
    if (!open) {
      busy.current = false
      flip.set({ f: 0 })
      return
    }
    if (prefersReducedMotion()) {
      flip.snap({ f: 180 })
      return
    }

    const flat = uiStyle() === 'flat'
    const { lvl } = cfg
    const T = (ms: number) => ms * Math.max(0.25, tempo)
    const big = lvl === 3
    const hi = lvl >= 2
    const color = big ? C.pop : lvl === 2 ? C.accent : C.soft
    const wind = T(flat ? 320 + lvl * 90 : [450, 720, 1100, 1650][lvl])
    busy.current = true
    tilt.set({ rx: 0, ry: 0, s: 1, g: -1 })
    // canvas hits are sized to the card (u = 1 for the 184px card)
    const card = () => {
      const el = root.current
      if (!el) return null
      const c = rectCenter(el)
      return { ...c, u: c.r.width / 184 }
    }

    // 1) charge: tremble, aura, rising particles, the stage dims
    play(shakeEl.current, windUp(flat ? 1.5 : [2.5, 3.5, 5, 7][lvl]), { duration: wind, easing: 'linear' })
    play(aura.current, [{ opacity: 0, scale: '.5' }, { opacity: 1, scale: '1.15' }], { duration: wind, easing: 'ease-in', fill: 'forwards' })
    if (big) {
      // an SSR starts out looking like an SR, then turns
      play(auraHi.current, [{ opacity: 0, scale: '.9' }, { opacity: 0, offset: 0.55 }, { opacity: 1, scale: '1.2' }], { duration: wind, easing: 'ease-in', fill: 'forwards' })
      after(wind * 0.6, () => {
        const c = card()
        if (!c) return
        spawn(burst(c.x, c.y, { radius: 36 * c.u, spikes: 10, color: C.pop }))
        faces().forEach((f) => play(f, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: T(260) }))
      })
    }
    const ps = sparks.current?.children
    const rise = (stage.current?.clientHeight ?? 260) * 0.8
    if (ps && !flat) {
      Array.from(ps).forEach((p, k) => {
        const drift = rand(-20, 20)
        play(
          p,
          [
            { transform: 'translate(0, 0) scale(.3)', opacity: 0 },
            { opacity: 1, offset: 0.25 },
            { transform: `translate(${drift}px, ${-rise * rand(0.55, 1)}px) scale(1)`, opacity: 0 },
          ],
          { duration: T(rand(700, 1100)), delay: (k / ps.length) * wind * 0.85, easing: 'cubic-bezier(.2,.6,.4,1)', iterations: lvl >= 2 ? 2 : 1 },
        )
      })
    }
    if (hi && dim) play(dimEl.current, [{ opacity: 0 }, { opacity: 1 }], { duration: wind * 0.7, delay: wind * 0.3, easing: 'ease-in', fill: 'forwards' })

    // 3) the hit, then each star on its own spot, the banner, and the finale
    const land = () => {
      const c = card()
      if (!c) return
      const { x, y, r, u } = c
      setLanded(true)
      play(flash.current, [{ opacity: 1 }, { opacity: 0 }], { duration: big ? 620 : 360, easing: 'ease-out' })
      flip.kick({ s: hi ? 2 : 1.2 })
      play(aura.current, [{ opacity: 1, scale: '1.15' }, { opacity: 1, scale: '1.4', offset: 0.2 }, { opacity: hi ? 0.55 : 0, scale: '1' }], {
        duration: T(900),
        fill: 'forwards',
      })
      if (big) play(auraHi.current, [{ opacity: 1, scale: '1.2' }, { opacity: 1, scale: '1.5', offset: 0.2 }, { opacity: 0.7, scale: '1' }], { duration: T(900), fill: 'forwards' })
      if (hi) {
        play(
          sun.current,
          [
            { opacity: 0, transform: 'scale(.3) rotate(0deg)' },
            { opacity: 1, transform: 'scale(1) rotate(25deg)', offset: 0.25 },
            { opacity: big ? 0.45 : 0, transform: 'scale(1.1) rotate(70deg)' },
          ],
          { duration: T(1500), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
        )
      }
      // the hit itself: small and centred on the card
      if (lvl === 0) spawn(burst(x, y, { radius: 40 * u, spikes: 10, color }))
      else if (lvl === 1) spawn(burst(x, y, { radius: 52 * u, color }), shards(x, y, { count: 8, speed: 260 * u, size: 8 * u }))
      else {
        spawn(
          rays(x, y, { inner: r.width * 0.32, outer: r.width * 0.72, count: big ? 22 : 16, width: 6 * u }),
          burst(x, y, { radius: (big ? 74 : 62) * u, spikes: big ? 14 : 12, color }),
          shards(x, y, { count: big ? 14 : 10, speed: 300 * u, size: 8 * u }),
          delayed(0.06, smoke(x, r.bottom - 16 * u, { count: 5, spread: 44 * u, size: 10 * u })),
        )
      }

      // each star stamps in on its own spot: pop + burst + sparkle measured from that star
      const starEls = stars.current ? Array.from(stars.current.children) : []
      const starStart = T(hi ? 440 : 260)
      const gap = T(hi ? 200 : 150)
      const stampDur = T(320)
      starEls.forEach((s, k) => {
        const delay = starStart + k * gap
        const last = k === starEls.length - 1
        play(
          s,
          [
            { opacity: 0, transform: 'scale(3) rotate(-40deg)', filter: 'brightness(2)' },
            { opacity: 1, transform: 'scale(.78) rotate(6deg)', filter: 'brightness(1.6)', offset: 0.6 },
            { opacity: 1, transform: 'none', filter: 'brightness(1)' },
          ],
          { duration: stampDur, delay, easing: POP, fill: 'backwards' },
        )
        after(delay + stampDur * 0.6, () => {
          if (!s.isConnected) return
          const p = rectCenter(s)
          const sz = p.r.width
          const tint = k % 2 ? C.pop : color
          const boost = big && last ? 1.6 : 1
          spawn(burst(p.x, p.y, { radius: sz * 1.25 * boost, spikes: 8, color: tint }))
          spawn(delayed(0.04, sparkle(p.x + sz * 0.7, p.y - sz * 0.6, { size: sz * 0.75 * boost, color: k % 2 ? C.white : C.pop })))
          spawn(shards(p.x, p.y, { count: hi ? 6 : 4, speed: 150 * boost, size: Math.max(3, sz * 0.32) }))
        })
      })
      // the name banner slams down after the last star
      const slam = starStart + starEls.length * gap + T(120)
      play(
        banner.current,
        [
          { opacity: 0, transform: 'translateY(-30px) scale(1.45)' },
          { opacity: 1, transform: 'translateY(3px) scale(.94, .9)', offset: 0.5 },
          { opacity: 1, transform: 'none' },
        ],
        { duration: T(380), delay: slam, easing: POP, fill: 'backwards' },
      )
      after(slam + T(190), () => {
        flip.kick({ y: 90, s: -0.8 })
        const b = banner.current?.getBoundingClientRect()
        if (b && !flat) spawn(shards(b.left + b.width / 2, b.top + b.height / 2, { count: hi ? 8 : 4, speed: 220, size: 6 }))
      })

      // the finale (SR / SSR): centred on the card, after the stars have had their moment
      const finale = slam + T(320)
      if (lvl === 2 && sfxText !== false) {
        after(finale, () => {
          const f = card()
          if (f) spawn(sfx(f.x, f.y - f.r.height * 0.12, sfxText ?? 'SR!', { size: 38 * f.u, color }))
        })
      }
      if (big) {
        after(finale, () => {
          const f = card()
          if (!f) return
          spawn(rays(f.x, f.y, { inner: f.r.width * 0.38, outer: f.r.width * 0.8, count: 24, width: 7 * f.u }), burst(f.x, f.y, { radius: 66 * f.u, spikes: 16, color: C.pop }))
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * TAU + rand(-0.3, 0.3)
            spawn(
              delayed(
                0.08 + k * 0.06,
                sparkle(f.x + Math.cos(a) * f.r.width * rand(0.25, 0.42), f.y + Math.sin(a) * f.r.height * rand(0.25, 0.4), {
                  size: rand(10, 16) * f.u,
                  color: k % 2 ? C.pop : C.white,
                }),
              ),
            )
          }
          // confetti, sprinkled from the top of the card
          for (let k = 0; k < 4; k++) {
            spawn(delayed(0.05 + k * 0.1, shards(f.x + rand(-0.35, 0.35) * f.r.width, f.r.top + 12, { count: 8, speed: 200 * f.u, size: 7 * f.u, colors: RAINBOW })))
          }
        })
        play(sweep.current, [{ backgroundPosition: '130% 0', opacity: 0 }, { opacity: 1, offset: 0.15 }, { backgroundPosition: '-30% 0', opacity: 0 }], {
          duration: T(1300),
          delay: finale,
          easing: 'cubic-bezier(.4,0,.2,1)',
        })
        if (sfxText !== false) {
          play(
            stamp.current,
            [
              { opacity: 0, transform: 'translate(-50%, -50%) scale(2.4)' },
              { opacity: 1, transform: 'translate(-50%, -50%) scale(.86)', offset: 0.16 },
              { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.26 },
              { opacity: 1, transform: 'translate(-50%, -60%) scale(1)', offset: 0.84 },
              { opacity: 0, transform: 'translate(-50%, -80%) scale(1.04)' },
            ],
            { duration: T(1800), delay: finale, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' },
          )
        }
      }

      const done = hi ? finale + T(big ? 1600 : 700) : slam + T(500)
      after(done, () => {
        play(dimEl.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' })
      })
      after(done + 500, () => {
        busy.current = false
        landedCb.current?.(rarity)
      })
    }

    // 2) the flip: beam of light, motion blur, speed lines
    after(wind, () => {
      const c = card()
      if (!c) return
      flip.set({ f: 180 })
      flip.kick({ f: 520, s: 1.6, y: -220 })
      // motion blur on the faces (a filter on the 3D parent would flatten the flip)
      faces().forEach((f) => play(f, [{ filter: 'blur(0px)' }, { filter: 'blur(5px)', offset: 0.35 }, { filter: 'blur(0px)' }], { duration: T(320) }))
      if (lvl >= 1) {
        play(
          beam.current,
          [
            { transform: 'translateX(-50%) scaleX(0)', opacity: 0 },
            { transform: 'translateX(-50%) scaleX(1)', opacity: 1, offset: 0.25 },
            { transform: 'translateX(-50%) scaleX(.15)', opacity: 0 },
          ],
          { duration: T(hi ? 800 : 500), easing: 'ease-out' },
        )
      }
      spawn(speedLines(c.r, 1, { count: 6, length: 40 * c.u }), speedLines(c.r, -1, { count: 6, length: 40 * c.u }))
      after(T(flat ? 170 : 240), land)
    })
    // only on a face-down → face-up change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // face-up SSR: the glow keeps breathing and the rays keep turning (inside the stage)
  useEffect(() => {
    if (!landed || cfg.lvl < 3 || prefersReducedMotion()) return
    const a = auraHi.current?.animate([{ opacity: 0.5, scale: '1' }, { opacity: 0.85, scale: '1.06' }], {
      duration: 1200,
      delay: 900,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out',
    })
    const b = sun.current?.animate([{ opacity: 0.4, transform: 'scale(1.1) rotate(70deg)' }, { opacity: 0.4, transform: 'scale(1.1) rotate(430deg)' }], {
      duration: 24000,
      delay: 1400,
      iterations: Infinity,
    })
    return () => {
      a?.cancel()
      b?.cancel()
    }
  }, [landed, cfg.lvl])

  const holo = cfg.lvl >= 2
  const showStatic = landed // stars / banner are visible once landed (their entrance plays during the reveal)

  return (
    <span
      ref={stage}
      className={cn('ui-r-lg relative isolate inline-grid place-items-center', sm ? 'p-3' : 'p-5', className)}
      style={{ '--rc': cfg.rc } as CSSProperties}
    >
      {/* the stage, behind the card: every DOM effect is clipped to it */}
      <span aria-hidden="true" className="ui-r-lg pointer-events-none absolute inset-0 overflow-clip">
        <span ref={dimEl} className="absolute inset-0 opacity-0" style={{ background: DIM }} />
        <span
          ref={aura}
          data-on={(landed && holo) || undefined}
          className="absolute inset-[4%] rounded-full opacity-0 blur-xl data-on:opacity-55"
          style={{ background: `radial-gradient(closest-side, ${cfg.lvl === 3 ? 'var(--color-accent)' : 'var(--rc)'}, transparent)` }}
        />
        {cfg.lvl === 3 && (
          <span
            ref={auraHi}
            data-on={landed || undefined}
            className="absolute inset-0 rounded-full opacity-0 blur-xl data-on:opacity-70"
            style={{ background: `radial-gradient(closest-side, var(--rc), color-mix(in srgb, var(--rc) 40%, transparent) 60%, transparent)` }}
          />
        )}
        {holo && (
          <span
            ref={sun}
            data-on={(landed && cfg.lvl === 3) || undefined}
            className="fx-only absolute top-1/2 left-1/2 -mt-[100%] -ml-[100%] aspect-square w-[200%] rounded-full opacity-0 data-on:opacity-40"
            style={{ background: SUNBURST, maskImage: RADIAL_FADE, WebkitMaskImage: RADIAL_FADE }}
          />
        )}
        <span
          ref={beam}
          className="absolute inset-y-0 left-1/2 w-[60%] opacity-0 blur-sm"
          style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--rc) 75%, transparent) 35%, hsl(48 100% 96% / .9) 50%, color-mix(in srgb, var(--rc) 75%, transparent) 65%, transparent)' }}
        />
        <span ref={sparks} className="fx-only absolute inset-x-0 bottom-[6%] h-0">
          {PARTICLES.map((p, k) => (
            <svg
              key={k}
              viewBox="0 0 24 24"
              className="absolute bottom-0 opacity-0"
              style={{ left: `${p.x * 100}%`, width: `${10 * p.s}px`, fill: k % 3 === 0 && cfg.lvl === 3 ? 'var(--color-accent)' : 'var(--rc)' }}
            >
              <path d="M12 1Q13.4 10.6 23 12Q13.4 13.4 12 23Q10.6 13.4 1 12Q10.6 10.6 12 1Z" />
            </svg>
          ))}
        </span>
      </span>

      <button
        ref={root}
        type="button"
        aria-label={open ? `${title}, ${cfg.name} (${rarity})${subtitle ? `, ${subtitle}` : ''}` : 'Face-down card. Press to reveal.'}
        aria-disabled={open || undefined}
        {...rest}
        onClick={(e) => {
          onClick?.(e)
          if (open || busy.current || e.defaultPrevented) return
          if (revealed === undefined) setInner(true)
          onReveal?.(rarity)
        }}
        onPointerMove={(e) => {
          onPointerMove?.(e)
          if (busy.current || e.pointerType === 'touch' || prefersReducedMotion()) return
          const r = e.currentTarget.getBoundingClientRect()
          const px = (e.clientX - r.left) / r.width - 0.5
          const py = (e.clientY - r.top) / r.height - 0.5
          const k = uiStyle() === 'flat' ? 0.5 : 1
          tilt.set({ rx: -py * 20 * k, ry: px * 24 * k, s: 1.04, g: px * 2 })
          const t = tiltEl.current
          if (t) {
            t.style.setProperty('--mx', `${(px + 0.5) * 100}%`)
            t.style.setProperty('--my', `${(py + 0.5) * 100}%`)
          }
        }}
        onPointerLeave={(e) => {
          onPointerLeave?.(e)
          tilt.set({ rx: 0, ry: 0, s: 1, g: -1 })
        }}
        className="group/gacha relative z-10 inline-grid cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-ink focus-visible:outline-none aria-disabled:cursor-default"
      >
        <span ref={shakeEl} className="grid">
          <span ref={tiltEl} className="grid transform-3d">
            <span
              ref={flipEl}
              className={cn('grid aspect-[5/7] transform-3d ui-r-lg group-focus-visible/gacha:ui-focus', sm ? 'w-[128px]' : 'w-[184px]')}
            >
              {/* back */}
              <span className="ui-border ui-r-lg ui-shadow ui-fill motion-lines relative grid animate-drift place-items-center overflow-hidden bg-accent backface-hidden [grid-area:1/1]">
                <span className="ui-pill absolute inset-[12%] border-2 border-white/35" />
                <span className={cn('ui-border ui-pill ui-shadow-sm relative grid place-items-center bg-paper', sm ? 'size-14' : 'size-20')}>
                  <Icon name="sparkle" size={sm ? 30 : 42} />
                </span>
                <span className={cn('ui-head absolute inset-x-0 text-center leading-none text-white', sm ? 'bottom-2 text-[10px]' : 'bottom-3 text-xs')}>Tap to reveal</span>
              </span>

              {/* front */}
              <span
                className="ui-r-lg ui-shadow relative grid grid-rows-[1fr_auto] overflow-hidden bg-paper backface-hidden [border:var(--ui-bw)_solid_var(--rc)] [grid-area:1/1]"
                style={FRONT}
              >
                {/* art panel */}
                <span
                  className="ui-tone relative min-h-0 overflow-hidden"
                  style={{ background: 'radial-gradient(120% 90% at 50% 30%, color-mix(in srgb, var(--rc) 38%, var(--color-paper)), var(--color-canvas) 75%)' }}
                >
                  {cfg.lvl === 3 && (
                    <span
                      aria-hidden="true"
                      className="fx-only absolute top-[38%] left-1/2 -mt-[80%] -ml-[80%] aspect-square w-[160%] opacity-60"
                      style={{ background: SUNBURST, maskImage: RADIAL_FADE, WebkitMaskImage: RADIAL_FADE }}
                    />
                  )}
                  {cfg.lvl >= 2 && <span aria-hidden="true" className="motion-lines pointer-events-none absolute inset-0 opacity-30" />}
                  <span className="absolute inset-x-[-4%] top-[9%]">{art ?? <Mascot expression={cfg.face} {...cfg.dress} />}</span>
                  <span className="absolute inset-x-1.5 top-1.5 flex items-start justify-between gap-1">
                    <span className={cn('ui-head ui-pill ui-fill ui-border-thin bg-(--rc) leading-none', sm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs', cfg.ink)}>
                      {rarity}
                    </span>
                    <span ref={stars} aria-hidden="true" className={cn('flex flex-wrap justify-end', !showStatic && 'opacity-0')} style={{ '--icon-fill': 'var(--rc)' } as CSSProperties}>
                      {Array.from({ length: cfg.stars }, (_, k) => (
                        <Icon key={k} name="star" size={sm ? 11 : 15} className="block origin-center" />
                      ))}
                    </span>
                  </span>
                </span>
                {/* name banner */}
                <span
                  ref={banner}
                  className={cn(
                    'ui-r ui-border-thin relative z-10 -mt-4 grid gap-0.5 text-center',
                    sm ? 'mx-1 mb-1 px-1.5 py-1' : 'mx-1.5 mb-1.5 px-2 py-1.5',
                    holo ? cn('ui-fill bg-(--rc)', cfg.ink) : 'bg-paper',
                    !showStatic && 'opacity-0',
                  )}
                >
                  <span className={cn('ui-head truncate leading-tight', sm ? 'text-[12px]' : 'text-[15px]')}>{title}</span>
                  {subtitle && <span className={cn('truncate leading-snug opacity-80', sm ? 'text-[10px]' : 'text-[11px]', !holo && 'text-mute')}>{subtitle}</span>}
                </span>
                {/* holographic foil: fades in once landed, brightens only while this card is hovered */}
                {holo && (
                  <span
                    aria-hidden="true"
                    data-on={landed || undefined}
                    className={cn('pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700', cfg.lvl === 3 ? 'data-on:opacity-70' : 'data-on:opacity-45')}
                  >
                    <span
                      ref={foil}
                      className="absolute inset-0 opacity-45 mix-blend-color-dodge"
                      style={{ backgroundImage: FOIL, backgroundSize: '100% 100%, 300% 300%', backgroundPosition: 'center, var(--mx, 50%) var(--my, 50%)' }}
                    />
                  </span>
                )}
                <span
                  ref={glint}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.7)_50%,transparent_65%)] bg-[length:250%_100%] opacity-0"
                />
                <span ref={flash} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" style={{ background: 'hsl(48 100% 97%)' }} />
              </span>
            </span>
          </span>
        </span>
      </button>

      {/* the stage, in front of the card: rainbow sweep and SSR lettering, clipped the same way */}
      {cfg.lvl === 3 && (
        <span aria-hidden="true" className="fx-only ui-r-lg pointer-events-none absolute inset-0 z-20 overflow-clip">
          <span ref={sweep} className="absolute inset-0 opacity-0 mix-blend-screen" style={{ backgroundImage: SWEEP, backgroundSize: '300% 100%' }} />
          <span ref={stamp} className={cn('ui-lettering absolute top-[40%] left-1/2 whitespace-nowrap', sm ? 'text-[30px]' : 'text-[46px]')} style={STAMP}>
            {sfxText || 'SSR!!'}
          </span>
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {landed ? `Revealed: ${cfg.name}, ${title}` : ''}
      </span>
    </span>
  )
}
