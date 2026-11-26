import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Mascot } from '@/components/art/mascot'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Kbd } from '@/components/ui/kbd'
import { Rating } from '@/components/ui/rating'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { TextRotate } from '@/components/ui/text-rotate'
import { useToast } from '@/components/ui/use-toast'
import { XRay } from '../xray'
import { PhoneFrame, Sample } from './sample'
import type { Part } from './sample'

const PARTS: Part[] = [
  { name: 'Slider', slug: 'slider' },
  { name: 'Switch', slug: 'switch' },
  { name: 'Rating', slug: 'rating' },
  { name: 'Kbd', slug: 'kbd' },
  { name: 'TextRotate', slug: 'text-rotate' },
  { name: 'Spinner', slug: 'spinner' },
]

const TRACKS = [
  { title: 'Night Bus Home', artist: 'Koma & the Kites', length: 214 },
  { title: 'Rooftop Rain', artist: 'Lantern Club', length: 187 },
  { title: '4 a.m. Arcade', artist: 'Pixel Picnic', length: 242 },
]
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export function Player() {
  const toast = useToast()
  const [track, setTrack] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(63)
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const t = TRACKS[track]
  const upNext = [1, 2].map((k) => TRACKS[(track + k) % TRACKS.length])

  const go = (dir: 1 | -1) => {
    setTrack((i) => (i + dir + TRACKS.length) % TRACKS.length)
    setPos(0)
  }
  const keys = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
    const k = e.key.toLowerCase()
    if (k === 'k') setPlaying((p) => !p)
    else if (k === 'j') go(-1)
    else if (k === 'l') go(1)
    else if (k === 'm') setMuted((m) => !m)
    else return
    e.preventDefault()
  }

  return (
    <Sample
      id="uc-player"
      kind="Music player"
      icon="music"
      title="A player with a pulse"
      caption="Scrub, skip, shuffle and rate. With focus in the player, K plays, J and L skip, M mutes."
      parts={PARTS}
    >
      <PhoneFrame>
        <div onKeyDown={keys} className="flex flex-1 flex-col gap-3.5 px-4 pt-2 pb-4">
          <p className="m-0 flex items-center justify-between text-[12px] leading-none font-bold text-mute">
            <span>Playing from Late Night Mix</span>
            <Icon name="menu" tone="line" size={16} />
          </p>

          <div className="ui-r ui-border ui-tone relative grid aspect-[16/10] place-items-end justify-items-center overflow-hidden bg-accent-soft">
            <Mascot crop="bust" expression={playing ? 'happy' : 'neutral'} talking={false} className="block h-[92%] w-auto" label="Album art: Koma with headphones on" />
            <span className="absolute top-2.5 right-2.5">
              {playing ? (
                <XRay name="Spinner" slug="spinner" at="bottom-right">
                  <span className="ui-pill ui-border-thin flex items-center bg-paper px-2 py-1">
                    <Spinner variant="bars" size="sm" label={false} srLabel="Playing" />
                  </span>
                </XRay>
              ) : (
                <span className="ui-pill ui-border-thin block bg-paper px-2.5 py-1 text-[11px] leading-none font-bold text-mute">Paused</span>
              )}
            </span>
          </div>

          <div className="grid gap-1">
            <h4 className="ui-head m-0 truncate text-[20px] leading-tight text-ink">{t.title}</h4>
            <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-mute">
              <span className="shrink-0">{t.artist} ·</span>
              <XRay name="TextRotate" slug="text-rotate" className="min-w-0">
                <TextRotate words={upNext.map((u) => `Up next: ${u.title}`)} interval={2600} />
              </XRay>
            </div>
          </div>

          <XRay name="Slider" slug="slider">
            <Slider key={track} label="Seek" min={0} max={t.length} defaultValue={pos} ticks={false} maxSfx={false} minSfx={false} onChange={setPos} />
            <p aria-hidden="true" className="m-0 -mt-1 flex justify-between text-[12px] font-bold text-mute tabular-nums">
              <span>{clock(pos)}</span>
              <span>-{clock(t.length - pos)}</span>
            </p>
          </XRay>

          <div className="flex items-center justify-center gap-3">
            <Button size="icon" variant="paper" aria-label="Previous track" sfx={false} onClick={() => go(-1)}>
              <Icon name="arrow-left" tone="line" size={20} />
            </Button>
            <Button size="icon" variant="accent" aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} sfx={playing ? false : '再生!'} onClick={() => setPlaying((p) => !p)}>
              <Icon name={playing ? 'pause' : 'play'} tone="solid" size={20} />
            </Button>
            <Button size="icon" variant="paper" aria-label="Next track" sfx={false} onClick={() => go(1)}>
              <Icon name="arrow-right" tone="line" size={20} />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
            <XRay name="Switch" slug="switch" className="flex items-center gap-2">
              <Switch
                label="Shuffle"
                checked={shuffle}
                onChange={(v) => {
                  setShuffle(v)
                  toast(v ? 'Shuffle on' : 'Shuffle off', { sfx: false, duration: 1800 })
                }}
                sfxOn={false}
                sfxOff={false}
              />
              <span aria-hidden="true" className="text-[13px] font-bold text-ink">
                Shuffle
              </span>
            </XRay>
            <XRay name="Rating" slug="rating" at="top-right">
              <Rating key={track} label={`Rate ${t.title}`} defaultValue={track === 0 ? 4 : 0} sfx="神曲!" />
            </XRay>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label={muted ? 'Unmute' : 'Mute'}
              aria-pressed={muted}
              onClick={() => setMuted((m) => !m)}
              className="grid cursor-pointer place-items-center border-0 bg-transparent p-1 text-ink focus-visible:ui-focus"
            >
              <Icon name={muted ? 'mute' : 'volume'} size={22} />
            </button>
            <div className={muted ? 'min-w-0 flex-1 opacity-50 transition-opacity' : 'min-w-0 flex-1 transition-opacity'}>
              <Slider label="Volume" defaultValue={70} ticks={8} minSfx={false} />
            </div>
          </div>

          <XRay name="Kbd" slug="kbd" className="mt-auto">
            <p className="m-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[12px] font-semibold text-mute">
              <span className="flex items-center gap-1">
                <Kbd listen="k">K</Kbd> play
              </span>
              <span className="flex items-center gap-1">
                <Kbd listen="j">J</Kbd>
                <Kbd listen="l">L</Kbd> skip
              </span>
              <span className="flex items-center gap-1">
                <Kbd listen="m">M</Kbd> mute
              </span>
            </p>
          </XRay>
        </div>
      </PhoneFrame>
    </Sample>
  )
}
