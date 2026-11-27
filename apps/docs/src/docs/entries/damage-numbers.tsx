import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { Chibi, MASCOT_NAME } from '@/components/art/mascot'
import type { ChibiPose } from '@/components/art/mascot'
import { Button } from '@/components/ui/button'
import { DamageLayer } from '@/components/ui/damage-numbers'
import { HealthBar } from '@/components/ui/health-bar'
import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/components/ui/icon'
import { showDamage, useDamageNumbers } from '@/components/ui/use-damage-numbers'
import { TAU, centerOf, prefersReducedMotion, rand, sparkle, spawn, speedLines, uiStyle } from '@/fx'
import { C } from '@/fx/palette'
import type { DocEntry } from '../types'

type Hit = 'damage' | 'crit' | 'heal' | 'miss'
const MAX = 1000

const ATTACKS: { kind: Hit; label: string; icon: IconName; variant: 'paper' | 'pop' | 'accent' | 'ink' }[] = [
  { kind: 'damage', label: 'Hit', icon: 'sword', variant: 'paper' },
  { kind: 'crit', label: 'Crit', icon: 'bolt', variant: 'pop' },
  { kind: 'heal', label: 'Heal', icon: 'potion', variant: 'accent' },
  { kind: 'miss', label: 'Miss', icon: 'shield', variant: 'ink' },
]

/** showDamage() needs no hook: any code with an element or a point can call it. */
function PlainDemo() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button size="sm" variant="pop" sfx={false} icon={<Icon name="bolt" tone="line" />} onClick={(e) => showDamage(e.currentTarget, 99, { kind: 'crit' })}>
        Crit here
      </Button>
      <Button size="sm" variant="ink" sfx={false} icon={<Icon name="shield" tone="line" />} onClick={(e) => showDamage(e.currentTarget, undefined, { kind: 'miss', text: 'BLOCK' })}>
        Block
      </Button>
    </div>
  )
}

/** The mascot as a training target: she flinches, spins, cheers and dodges. */
function TargetDemo() {
  const dmg = useDamageNumbers()
  const target = useRef<HTMLButtonElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const orbit = useRef<HTMLDivElement>(null)
  const [pose, setPose] = useState<ChibiPose>('idle')
  const [hp, setHp] = useState(MAX)
  const settleT = useRef(0)
  const reviveT = useRef(0)
  useEffect(
    () => () => {
      window.clearTimeout(settleT.current)
      window.clearTimeout(reviveT.current)
    },
    [],
  )

  const settle = (ms: number) => {
    window.clearTimeout(settleT.current)
    settleT.current = window.setTimeout(() => setPose('idle'), ms)
  }
  const play = (kf: Keyframe[], ms: number, easing = 'cubic-bezier(.2,.8,.3,1)') => {
    if (!prefersReducedMotion()) body.current?.animate(kf, { duration: ms, easing, composite: 'add' })
  }
  /** One frame of white: the classic hit flash. */
  const flash = () => {
    if (!prefersReducedMotion()) body.current?.animate([{ filter: 'none' }, { filter: 'contrast(0) brightness(2.2)', offset: 0.12 }, { filter: 'contrast(0) brightness(2.2)', offset: 0.3 }, { filter: 'none' }], { duration: 230 })
  }
  const dizzy = () => {
    const stars = orbit.current ? Array.from(orbit.current.children) : []
    if (prefersReducedMotion() || uiStyle() === 'flat') return
    stars.forEach((s, k) => {
      const frames: Keyframe[] = Array.from({ length: 17 }, (_, n) => {
        const a = (n / 16) * TAU * 1.5 + (k / stars.length) * TAU
        const front = Math.sin(a) > 0
        return { transform: `translate(${Math.cos(a) * 34}px, ${Math.sin(a) * 9}px) scale(${front ? 1 : 0.7})`, opacity: n === 16 ? 0 : 1, zIndex: front ? 2 : 0 }
      })
      s.animate(frames, { duration: 1300, easing: 'linear' })
    })
  }

  const hit = (kind: Hit, e?: MouseEvent) => {
    const el = target.current
    if (!el) return
    const { x } = centerOf(el)
    // knocked away from where the hit came from
    const dir = e && e.clientX ? (e.clientX < x ? 1 : -1) : 1
    if (kind === 'miss') {
      dmg.miss(el)
      setPose('dodge')
      const side = Math.random() < 0.5 ? -1 : 1
      play([{ translate: '0 0' }, { translate: `${side * 52}px -8px`, offset: 0.28 }, { translate: `${side * 52}px 0`, offset: 0.62 }, { translate: '0 0' }], 640)
      if (!prefersReducedMotion()) spawn(speedLines(el.getBoundingClientRect(), side as 1 | -1, { count: 7, length: 80 }))
      settle(560)
      return
    }
    if (kind === 'heal') {
      const v = 120 + Math.round(Math.random() * 80)
      dmg.heal(el, v)
      setHp((h) => Math.min(MAX, h + v))
      setPose('cheer')
      play([{ translate: '0 0' }, { translate: '0 -16px', offset: 0.35 }, { translate: '0 0' }], 480, 'cubic-bezier(.2,1.4,.4,1)')
      if (!prefersReducedMotion()) {
        const r = el.getBoundingClientRect()
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU
          spawn(sparkle(r.left + r.width / 2 + Math.cos(a) * r.width * 0.42, r.top + r.height * 0.45 + Math.sin(a) * r.height * 0.36, { size: rand(9, 15), color: k % 2 ? C.accent : C.white }))
        }
      }
      settle(900)
      return
    }
    const crit = kind === 'crit'
    const v = crit ? 180 + Math.round(Math.random() * 220) : 20 + Math.round(Math.random() * 60)
    if (crit) dmg.crit(el, v)
    else dmg.damage(el, v)
    setHp((h) => {
      const next = Math.max(0, h - v)
      if (next === 0) {
        window.clearTimeout(reviveT.current)
        reviveT.current = window.setTimeout(() => {
          setHp(MAX)
          setPose('cheer')
          settle(900)
        }, 1500)
      }
      return next
    })
    setPose('hurt')
    flash()
    const k = crit ? 1.8 : 1
    play([{ translate: '0 0' }, { translate: `${dir * 16 * k}px ${-4 * k}px`, offset: 0.2 }, { translate: '0 0' }], crit ? 520 : 360)
    if (crit) {
      play([{ rotate: '0deg' }, { rotate: `${dir * 38}deg`, offset: 0.3 }, { rotate: `${-dir * 10}deg`, offset: 0.65 }, { rotate: '0deg' }], 700)
      dizzy()
    }
    settle(crit ? 900 : 420)
  }

  const attack = (e: MouseEvent) => {
    const roll = Math.random()
    hit(roll < 0.12 ? 'miss' : roll < 0.3 ? 'crit' : 'damage', e)
  }

  return (
    <div className="grid w-full max-w-sm justify-items-center gap-4">
      <DamageLayer />
      <HealthBar value={hp} max={MAX} label={MASCOT_NAME} showNumbers segments={10} className="w-full max-w-60" />
      <button
        ref={target}
        type="button"
        aria-label={`${MASCOT_NAME}, the training target. Press to attack.`}
        onClick={attack}
        className="ui-r-lg relative grid w-40 cursor-crosshair touch-manipulation place-items-center border-0 bg-transparent p-0 focus-visible:ui-focus"
      >
        <div ref={body} className="relative w-full">
          <Chibi pose={hp === 0 ? 'hurt' : pose} />
        </div>
        <div ref={orbit} aria-hidden="true" className="pointer-events-none absolute top-[2%] left-1/2 h-0 w-0" style={{ '--icon-fill': 'var(--color-pop)' } as CSSProperties}>
          {[0, 1, 2].map((k) => (
            <span key={k} className="absolute -top-2 -left-2 opacity-0">
              <Icon name="star" size={16} />
            </span>
          ))}
        </div>
      </button>
      {/* one row of four under the target; two by two when narrow */}
      <div role="group" aria-label="Attacks" className="@container w-full">
        <div className="grid grid-cols-2 gap-2.5 @[22rem]:grid-cols-4">
          {ATTACKS.map((a) => (
            <Button key={a.kind} size="sm" variant={a.variant} sfx={false} icon={<Icon name={a.icon} tone="line" />} className="w-full" onClick={(e) => hit(a.kind, e)}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default {
  slug: 'damage-numbers',
  name: 'Damage Numbers',
  jp: 'ダメージ',
  category: 'Game',
  description:
    'Floating combat numbers in chunky outlined digits that pop in one by one. Damage arcs off the target in a parabola, crits slam in bigger in the pop colour with a CRIT! tag and a burst, heals float up with sparkles, misses slide off. Drawn as DOM in a fixed, click-through layer. In the demo the target is the mascot: click her or use the buttons.',
  preview: <TargetDemo />,
  usage: `import { DamageLayer } from '@/components/ui/damage-numbers'
import { useDamageNumbers } from '@/components/ui/use-damage-numbers'

// once, near the root
<DamageLayer />

// anywhere
const dmg = useDamageNumbers()
dmg.damage(enemyEl, 42)
dmg.crit({ x: e.clientX, y: e.clientY }, 248)
dmg.heal(heroEl, 30)
dmg.miss(enemyEl)`,
  examples: [
    {
      title: 'Without the hook',
      preview: <PlainDemo />,
      code: `import { showDamage } from '@/components/ui/use-damage-numbers'

// game loops, event handlers, anything (a <DamageLayer /> must be mounted)
showDamage(enemyEl, 99, { kind: 'crit' })
showDamage({ x: 320, y: 180 }, undefined, { kind: 'miss', text: 'BLOCK' })`,
    },
  ],
  props: [
    { name: 'useDamageNumbers()', type: '{ show, damage, crit, heal, miss }', description: 'Stable helpers; each takes a target (Element or { x, y } in viewport px) and a value.' },
    { name: 'showDamage(target, value?, opts?)', type: "(DamageTarget, number?, { kind?: 'damage' | 'heal' | 'miss' | 'crit'; text?: string }) => void", description: 'The same thing as a plain function.' },
    { name: '<DamageLayer limit>', type: 'number', default: '40', description: 'Most numbers alive at once.' },
    { name: '<DamageLayer effects>', type: 'boolean', default: 'true', description: 'Canvas hits: burst + focus lines on crits, sparkles on heals, chips on damage.' },
    { name: '<DamageLayer announce>', type: 'boolean', default: 'true', description: 'Reads each number to screen readers (aria-live="polite").' },
    { name: '<DamageLayer zIndex>', type: 'number', default: '10000', description: 'Stacking of the fixed layer (the FX canvas is 9999).' },
  ],
} satisfies DocEntry
