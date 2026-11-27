import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Chibi, MASCOT_NAME } from '@/components/art/mascot'
import type { ChibiPose } from '@/components/art/mascot'
import { MONSTER_NAME, Monster } from '@/components/art/monster'
import type { MonsterPose } from '@/components/art/monster'
import { Badge } from '@/components/ui/badge'
import { ComboCounter } from '@/components/ui/combo-counter'
import { DamageLayer } from '@/components/ui/damage-numbers'
import { HealthBar } from '@/components/ui/health-bar'
import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/components/ui/icon'
import { InventoryGrid } from '@/components/ui/item-slot'
import type { InventoryItem } from '@/components/ui/item-slot'
import { SkillButton } from '@/components/ui/skill-button'
import { useDamageNumbers } from '@/components/ui/use-damage-numbers'
import { burst, centerOf, rand, sfx, spawn } from '@/fx'
import { XRay } from '../xray'
import { Sample, WindowFrame } from './sample'
import type { Part } from './sample'

const PARTS: Part[] = [
  { name: 'HealthBar', slug: 'health-bar' },
  { name: 'SkillButton', slug: 'skill-button' },
  { name: 'ComboCounter', slug: 'combo-counter' },
  { name: 'InventoryGrid', slug: 'item-slot' },
  { name: 'DamageLayer', slug: 'damage-numbers' },
  { name: 'Badge', slug: 'badge' },
]

const FOE_MAX = 180
const HERO_MAX = 100

const art = (name: IconName, fill: string) => <Icon name={name} size="100%" style={{ '--icon-fill': fill } as CSSProperties} />
const BAG: (InventoryItem | null)[] = [
  { id: 'blade', name: 'Starlit Blade', icon: art('sword', 'var(--color-paper)'), rarity: 'epic', kind: 'Weapon', description: 'Slashes leave a sparkle.', stats: [{ label: 'ATK', value: '+12' }] },
  { id: 'tonic', name: 'Pop Tonic', icon: art('potion', 'var(--color-pop)'), rarity: 'common', kind: 'Consumable', description: 'Fizzy. Restores 30 HP.', quantity: 3 },
  { id: 'shard', name: 'Prism Shard', icon: art('gem', 'var(--color-accent-soft)'), rarity: 'rare', kind: 'Material', description: 'Hums near slimes.', quantity: 7 },
  { id: 'crown', name: 'Hero Crown', icon: art('crown', 'var(--color-pop)'), rarity: 'legendary', kind: 'Accessory', description: 'Shout louder.' },
]

const START_LOG = [
  'You enter Whisper Grove.',
  `${MASCOT_NAME} found 3 Pop Tonics.`,
  `${MONSTER_NAME} blocks the path. It looks squishy.`,
  `Tip: poke ${MONSTER_NAME} or tap a skill.`,
]
const LOG_LINES = 4
const QUEST_GOAL = 3

/* The minimap: a 7 × 4 grove. 0 = unexplored, 1 = explored, 2 = you, 3 = the slime. */
const MAP = [
  [0, 0, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0],
  [1, 1, 1, 2, 3, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
]
const CELL = ['bg-canvas', 'bg-accent-soft', 'ui-fill bg-accent', 'ui-fill bg-pop'] as const

/** The backdrop, drawn only from tokens: sky, sun, clouds, two hill layers, trees, ground. */
function Backdrop() {
  const line = { stroke: 'var(--ui-line)', strokeWidth: 'var(--ui-bw-thin)', vectorEffect: 'non-scaling-stroke' } as const
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent-soft) 70%, var(--color-paper)) 0%, var(--color-paper) 70%)' }}
      />
      <span className="ui-border-thin absolute top-[12%] right-[30%] size-14 rounded-full bg-pop opacity-80" />
      <span className="ui-border-thin ui-pill absolute top-[16%] left-[38%] h-5 w-24 bg-paper" />
      <span className="ui-border-thin ui-pill absolute top-[11%] left-[44%] h-5 w-14 bg-paper" />
      <span className="ui-border-thin ui-pill absolute top-[30%] right-[6%] h-4 w-20 bg-paper" />
      <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[24%] h-[34%] w-full">
        <path
          d="M0 120V62C40 40 80 30 120 46S190 78 230 52 320 10 400 40V120Z"
          style={{ fill: 'color-mix(in srgb, var(--color-accent-soft) 45%, var(--color-paper))', ...line }}
        />
        <path d="M0 120V88C60 70 110 64 170 80S280 104 330 82 380 70 400 74V120Z" style={{ fill: 'color-mix(in srgb, var(--color-accent-soft) 80%, var(--color-paper))', ...line }} />
      </svg>
      {[
        ['left-[4%]', 'h-16'],
        ['left-[30%]', 'h-12'],
        ['right-[3%]', 'h-14'],
      ].map(([at, h]) => (
        <span key={at} className={`absolute bottom-[23%] grid justify-items-center ${at}`}>
          <span className={`ui-border-thin aspect-[4/5] rounded-full bg-accent ${h}`} />
          <span className="ui-border-thin -mt-1 h-4 w-2.5 bg-canvas" />
        </span>
      ))}
      <div className="ui-border-t ui-tone absolute inset-x-0 bottom-0 h-[24%] bg-canvas">
        <span className="ui-pill absolute top-[38%] left-[8%] h-2.5 w-[84%] bg-paper opacity-70" />
      </div>
    </div>
  )
}

/** Where you are and what you are doing: the area, a small map and the quest count. */
function Tracker({ kos }: { kos: number }) {
  const done = Math.min(kos, QUEST_GOAL)
  return (
    <div className="ui-card grid w-[168px] gap-2 px-2.5 pt-2 pb-2.5">
      <p className="m-0 flex items-center justify-between text-[11px] leading-none font-bold text-mute">
        <span className="ui-head text-[13px] text-ink">Whisper Grove</span>
        <Icon name="map" size={14} />
      </p>
      <div aria-hidden="true" className="grid grid-cols-7 gap-[3px]">
        {MAP.flat().map((c, i) => (
          <span key={i} className={`ui-border-thin aspect-square ui-r-sm ${CELL[c]}`} />
        ))}
      </div>
      <div className="grid gap-1">
        <p className="m-0 flex items-center justify-between text-[11px] leading-none font-bold text-ink">
          <span>Clear the grove</span>
          <span className="tabular-nums text-mute">
            {done}/{QUEST_GOAL}
          </span>
        </p>
        <span aria-hidden="true" className="ui-pill ui-border-thin block h-2 overflow-hidden bg-canvas">
          <span className="ui-fill block h-full bg-accent transition-[width] duration-500 ease-snap" style={{ width: `${(done / QUEST_GOAL) * 100}%` }} />
        </span>
      </div>
    </div>
  )
}

/** A quiet scene (no loop): Purin only reacts when you poke it or cast at it. */
export function GameHud() {
  const [foe, setFoe] = useState(FOE_MAX)
  const [hero, setHero] = useState(72)
  const [mp, setMp] = useState(40)
  const [combo, setCombo] = useState(0)
  const [hit, setHit] = useState(0)
  const [kos, setKos] = useState(0)
  const [pose, setPose] = useState<MonsterPose>('idle')
  const [koma, setKoma] = useState<ChibiPose>('idle')
  const [log, setLog] = useState<string[]>(START_LOG)
  const foeRef = useRef<HTMLButtonElement>(null)
  const komaRef = useRef<HTMLDivElement>(null)
  const timers = useRef(new Set<number>())
  const dn = useDamageNumbers()

  const note = (line: string) => setLog((l) => [...l, line].slice(-LOG_LINES))

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
  }
  useEffect(() => {
    const set = timers.current
    return () => set.forEach(clearTimeout)
  }, [])

  const strike = (base: number, text: string | false, crit = false) => {
    if (pose === 'ko') return
    const el = foeRef.current
    const dmg = Math.round(base * rand(0.85, 1.15))
    const next = Math.max(0, foe - dmg)
    setFoe(next)
    setCombo((c) => c + 1)
    setHit((h) => h + 1)
    setKoma('dodge')
    later(320, () => setKoma('idle'))
    if (el) {
      const { x, y } = centerOf(el)
      spawn(burst(x, y, { radius: crit ? 46 : 30 }))
      if (text) spawn(sfx(x, y - 46, text, { size: crit ? 34 : 26 }))
      ;(crit ? dn.crit : dn.damage)(el, dmg)
    }
    note(next === 0 ? `${MONSTER_NAME} is K.O.! +40 XP.` : `${MONSTER_NAME} takes ${dmg} damage${combo > 0 ? ` · ${combo + 1} combo` : ''}.`)
    if (next === 0) {
      setPose('ko')
      setKos((k) => k + 1)
      later(1400, () => {
        setFoe(FOE_MAX)
        setPose('idle')
        note(`A fresh ${MONSTER_NAME} wobbles in.`)
      })
    } else {
      setPose('hurt')
      later(260, () => setPose('idle'))
    }
  }

  const cast = (cost: number, fn: () => void) => {
    if (mp < cost) return note(`Not enough MP. Slash ${MONSTER_NAME} to charge up.`)
    setMp((m) => m - cost)
    fn()
  }

  const heal = () => {
    const gain = Math.min(HERO_MAX - hero, 24)
    setHero((h) => Math.min(HERO_MAX, h + 24))
    setKoma('cheer')
    later(600, () => setKoma('idle'))
    if (komaRef.current) dn.heal(komaRef.current, gain)
    note(gain > 0 ? `${MASCOT_NAME} heals ${gain} HP.` : `${MASCOT_NAME} is already at full HP.`)
  }

  return (
    <Sample
      id="uc-game"
      kind="Game HUD"
      icon="sword"
      title="A dungeon HUD that hits back"
      caption={`Poke ${MONSTER_NAME} or cast a skill: the bar chips, the combo stacks, the quest ticks and the bag equips on a double-click.`}
      parts={PARTS}
    >
      <WindowFrame url="play.puddlepeaks.gg/grove-3">
        <div className="grid min-w-0 @3xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
          {/* stage */}
          <div className="relative isolate h-[300px] overflow-hidden @md:h-[360px] @3xl:h-auto @3xl:min-h-[440px] @3xl:rounded-bl-[calc(var(--ui-r-lg)-var(--ui-bw))]">
            <Backdrop />

            <div className="absolute top-3 left-3 z-10 hidden @md:block">
              <Tracker kos={kos} />
            </div>

            <div className="absolute top-3 right-3 z-10 origin-top-right scale-[.8] @3xl:scale-100">
              <XRay name="ComboCounter" slug="combo-counter" at="top-right" className="min-h-[92px] min-w-[150px]">
                <ComboCounter value={combo} timeout={2400} onTimeout={() => setCombo(0)} label="Combo" />
              </XRay>
            </div>

            <div ref={komaRef} className="absolute bottom-[13%] left-[10%] w-[100px] @md:w-[128px] @3xl:w-[156px]">
              <Chibi pose={koma} label={`${MASCOT_NAME}, your hero`} />
            </div>

            <button
              ref={foeRef}
              type="button"
              onClick={() => strike(9, hit % 3 === 2 ? 'ポコッ' : false)}
              aria-label={`Poke ${MONSTER_NAME}`}
              className="absolute right-[9%] bottom-[13%] w-[128px] cursor-pointer touch-manipulation border-0 bg-transparent p-0 focus-visible:ui-focus @md:w-[160px] @3xl:w-[204px]"
            >
              <Monster pose={pose} hit={hit} />
            </button>

            <p className="ui-pill ui-border-thin absolute bottom-2.5 left-1/2 z-10 m-0 -translate-x-1/2 bg-paper px-2.5 py-1 text-[11px] leading-none font-bold whitespace-nowrap text-mute">
              Tap {MONSTER_NAME} to attack
            </p>
          </div>

          {/* HUD */}
          <div className="grid min-w-0 content-start gap-3.5 p-3 [border-top:var(--ui-bw)_solid_var(--ui-line)] @md:p-4 @3xl:[border-top:0] @3xl:[border-left:var(--ui-bw)_solid_var(--ui-line)]">
            <div className="grid gap-2.5 @lg:grid-cols-2 @3xl:grid-cols-1">
              <XRay name="HealthBar" slug="health-bar">
                <div className="ui-r ui-border-thin grid gap-1.5 bg-canvas px-2.5 pt-1.5 pb-2">
                  <HealthBar label={MASCOT_NAME} value={hero} max={HERO_MAX} segments={10} />
                  <HealthBar label="MP" variant="mp" value={mp} max={60} segments={6} />
                </div>
              </XRay>
              <XRay name="HealthBar" slug="health-bar" at="top-right">
                <div className="ui-r ui-border-thin relative bg-canvas px-2.5 pt-1.5 pb-2">
                  <span className="absolute -top-2.5 right-2.5">
                    <XRay name="Badge" slug="badge" at="top-right">
                      <Badge variant="ink">Lv 7</Badge>
                    </XRay>
                  </span>
                  <HealthBar label={MONSTER_NAME} value={foe} max={FOE_MAX} segments={12} koText="K.O." />
                </div>
              </XRay>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 @3xl:grid @3xl:justify-stretch">
              <XRay name="SkillButton" slug="skill-button" className="pt-1">
                <div role="group" aria-label="Skills" className="flex gap-2.5">
                  <SkillButton
                    label="Slash"
                    keybind="1"
                    hotkey={false}
                    size="sm"
                    cooldown={500}
                    sfx="ズバッ"
                    readySfx={false}
                    onCast={() => {
                      setMp((m) => Math.min(60, m + 6))
                      strike(14, false)
                    }}
                  >
                    <Icon name="sword" size="1em" />
                  </SkillButton>
                  <SkillButton label="Fireball" keybind="2" hotkey={false} size="sm" cooldown={2800} sfx={false} onCast={() => cast(18, () => strike(34, 'ドカン!', true))}>
                    <Icon name="fire" size="1em" />
                  </SkillButton>
                  <SkillButton label="Heal" keybind="3" hotkey={false} size="sm" cooldown={4200} sfx="キラッ" onCast={() => cast(12, heal)}>
                    <Icon name="heart" size="1em" />
                  </SkillButton>
                </div>
              </XRay>
              <XRay name="InventoryGrid" slug="item-slot" at="top-right">
                <InventoryGrid
                  label="Bag"
                  items={BAG}
                  columns={4}
                  defaultEquipped={['blade']}
                  onEquippedChange={(ids, item) => note(ids.includes(item.id) ? `Equipped ${item.name}.` : `Put away ${item.name}.`)}
                />
              </XRay>
            </div>

            <ol
              role="log"
              aria-live="polite"
              aria-label="Battle log"
              className="ui-r ui-border-thin m-0 grid h-[106px] list-none content-end gap-1 overflow-hidden bg-canvas px-3 py-2.5 text-[13px] leading-snug"
            >
              {log.map((l, i) => (
                <li key={`${log.length}-${i}`} className={i === log.length - 1 ? 'flex items-baseline gap-2 font-bold text-ink' : 'flex items-baseline gap-2 text-mute'}>
                  <Icon name="arrow-right" tone="line" size={11} className="shrink-0 text-accent" />
                  <span className="min-w-0 truncate">{l}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </WindowFrame>
      <DamageLayer announce={false} />
    </Sample>
  )
}
