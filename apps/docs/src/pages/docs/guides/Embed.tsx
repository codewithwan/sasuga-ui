import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Mascot } from '@/components/art/mascot'
import { Button, Field, Select, Slider, Switch, ToggleGroup } from '@/components/ui'
import { FX_SCREEN_EFFECTS } from '@/components/ui/fx-screen'
import type { FxScreenBackground, FxScreenColor, FxScreenEffect, FxScreenTrigger } from '@/components/ui/fx-screen'
import { Icon } from '@/components/ui/icon'
import { withBase } from '@/data/site'
import { useTheme } from '@/lib/theme'
import { EMBED_DEFAULTS, embedQuery } from '@/pages/embed/params'
import type { EmbedConfig, EmbedLook } from '@/pages/embed/params'
import { CodeBlock } from '../CodeBlock'
import { C, Guide, P, Section, Table } from './Guide'

const EFFECTS: { value: FxScreenEffect; label: string; hint: string }[] = [
  { value: 'speed-lines', label: 'Speed lines', hint: 'Streaks rushing past' },
  { value: 'focus-lines', label: 'Focus lines', hint: 'Radial lines pulsing on a centre' },
  { value: 'impact', label: 'Impact', hint: 'Burst, shards, ring and shake' },
  { value: 'flash-cut', label: 'Flash cut', hint: 'Hard flash frames like a fast edit' },
  { value: 'sparkle-rain', label: 'Sparkle rain', hint: 'Twinkles falling' },
  { value: 'slash-storm', label: 'Slash storm', hint: 'Blade swipes across the screen' },
]

const COLORS = ['accent', 'pop', 'ink', 'paper'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))
const BACKGROUNDS = [
  { value: 'transparent', label: 'Clear' },
  { value: 'paper', label: 'Paper' },
  { value: 'ink', label: 'Ink' },
  { value: 'canvas', label: 'Canvas' },
]
const TRIGGERS = [
  { value: 'loop', label: 'Loop' },
  { value: 'interval', label: 'Interval' },
  { value: 'click', label: 'Click' },
]
const STYLE_ITEMS = [
  { value: 'cel', label: 'Cel' },
  { value: 'manga', label: 'Manga' },
  { value: 'flat', label: 'Flat' },
]
const THEME_ITEMS = ['lilac', 'mint', 'peach', 'sky'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))
const MODE_ITEMS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const EMBED_PATH = '/embed/fx/'
const absolute = (path: string) => (typeof window === 'undefined' ? path : `${window.location.origin}${withBase(path)}`)

/** A labelled control row; `value` is the readout next to the label. */
function Control({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="ui-head text-sm text-ink">{label}</span>
        {value !== undefined && <span className="font-mono text-[13px] font-bold text-accent tabular-nums">{value}</span>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function reactSnippet(c: EmbedConfig) {
  const d = EMBED_DEFAULTS
  const props = [`effect="${c.effect}"`]
  if (c.intensity !== d.intensity) props.push(`intensity={${c.intensity}}`)
  if (c.speed !== d.speed) props.push(`speed={${c.speed}}`)
  if (c.color !== d.color) props.push(`color="${c.color}"`)
  if (c.background !== d.background) props.push(`background="${c.background}"`)
  if (c.trigger !== d.trigger) props.push(`trigger="${c.trigger}"`)
  if (c.trigger === 'interval') props.push(`interval={${c.interval}}`)
  if (c.text.trim()) props.push(`text="${c.text.trim().replace(/"/g, '&quot;')}"`)
  if (c.cx !== d.cx || c.cy !== d.cy) props.push(`center={[${c.cx}, ${c.cy}]}`)
  if (c.effect === 'speed-lines' && c.angle !== d.angle) props.push(`angle={${c.angle}}`)
  if (c.effect === 'flash-cut' && !c.flashes) props.push('flashes={false}')
  return `import { FxScreen } from '@/components/ui/fx-screen'

// fills its positioned parent; play={false} shows a calm still frame
<div className="relative aspect-video">
  <FxScreen ${props.join(' ')} />
</div>`
}

function iframeSnippet(url: string) {
  return `<iframe
  src="${url.replace(/&/g, '&amp;')}"
  title="Animated FX screen"
  style="width: 100%; aspect-ratio: 16 / 9; border: 0; background: transparent; color-scheme: normal"
  sandbox="allow-scripts allow-same-origin"
  loading="lazy"
></iframe>`
}

function Builder() {
  const current = useTheme()
  const [c, setC] = useState<EmbedConfig>({ ...EMBED_DEFAULTS, effect: 'impact', text: 'ドン', intensity: 0.8 })
  const [look, setLook] = useState<EmbedLook>({ style: current.style, theme: current.theme, mode: current.mode })
  const [playing, setPlaying] = useState(false)
  const set = <K extends keyof EmbedConfig>(key: K, value: EmbedConfig[K]) => setC((prev) => ({ ...prev, [key]: value }))

  const query = embedQuery(c, look)
  const url = absolute(EMBED_PATH) + '?' + query
  // the preview only moves once Play is pressed; slider drags settle before the frame reloads
  const previewSrc = `${withBase(EMBED_PATH)}?${embedQuery({ ...c, play: playing }, look)}`
  const [src, setSrc] = useState(previewSrc)
  useEffect(() => {
    const id = window.setTimeout(() => setSrc(previewSrc), 220)
    return () => window.clearTimeout(id)
  }, [previewSrc])

  const snippets = useMemo(() => ({ iframe: iframeSnippet(url), react: reactSnippet(c) }), [url, c])

  return (
    <>
      <div className="ui-card grid gap-6 p-4 min-[640px]:p-6">
        <div className="grid gap-3">
          <div
            className="ui-border ui-r-lg relative mx-auto aspect-video w-full max-w-full min-w-[220px] resize-x overflow-hidden bg-canvas"
            title="Drag the corner to resize"
          >
            {/* what a transparent screen sits on: the host page */}
            <div aria-hidden="true" className="ui-tone absolute inset-0 grid grid-cols-[1fr_auto] items-end bg-canvas">
              <div className="grid gap-2 self-center px-[6%]">
                <span className="ui-head text-[clamp(14px,3.4vw,26px)] leading-tight text-ink">Your page, stream or slide</span>
                <span className="text-[clamp(11px,2vw,14px)] text-mute">shows through a clear background</span>
              </div>
              <Mascot expression="happy" animated={false} className="h-[78%] w-auto" />
            </div>
            <iframe
              src={src}
              title="FX screen preview"
              sandbox="allow-scripts allow-same-origin"
              className="absolute inset-0 block size-full border-0 bg-transparent [color-scheme:normal]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant={playing ? 'paper' : 'accent'}
              sfx={false}
              icon={<Icon name={playing ? 'pause' : 'play'} tone="line" size={16} />}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? 'Pause' : 'Play'}
            </Button>
            <a
              href={withBase(EMBED_PATH) + '?' + query}
              target="_blank"
              rel="noreferrer"
              className="ui-head inline-flex items-center gap-1.5 text-sm text-accent underline-offset-4 hover:underline focus-visible:ui-focus"
            >
              Open full screen
              <Icon name="arrow-right" tone="line" size="1em" />
            </a>
            <span className="text-sm text-mute">{c.trigger === 'click' && playing ? 'Click the frame to hit.' : 'Drag the corner to resize.'}</span>
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-5 min-[760px]:grid-cols-2">
          <Select
            label="Effect"
            options={EFFECTS}
            value={c.effect}
            onValueChange={(v) => set('effect', v as FxScreenEffect)}
            sfx={false}
          />
          <Field label="Lettering (optional)" value={c.text} onChange={(v) => set('text', v.slice(0, 24))} placeholder="ドン" />
          <Control label="Intensity" value={`${Math.round(c.intensity * 100)}%`}>
            <Slider label="Intensity" min={0} max={100} step={5} defaultValue={c.intensity * 100} onChange={(v) => set('intensity', v / 100)} maxSfx={false} minSfx={false} />
          </Control>
          <Control label="Speed" value={`${c.speed}×`}>
            <Slider label="Speed" min={25} max={300} step={25} defaultValue={c.speed * 100} ticks={11} onChange={(v) => set('speed', v / 100)} maxSfx={false} minSfx={false} />
          </Control>
          <Control label="Colour">
            <ToggleGroup label="Colour" size="sm" sfx={false} items={COLORS} value={c.color} onValueChange={(v) => set('color', v as FxScreenColor)} />
          </Control>
          <Control label="Background">
            <ToggleGroup label="Background" size="sm" sfx={false} items={BACKGROUNDS} value={c.background} onValueChange={(v) => set('background', v as FxScreenBackground)} />
          </Control>
          <Control label="Trigger">
            <ToggleGroup label="Trigger" size="sm" sfx={false} items={TRIGGERS} value={c.trigger} onValueChange={(v) => set('trigger', v as FxScreenTrigger)} />
          </Control>
          {c.trigger === 'interval' && (
            <Control label="Interval" value={`${c.interval} ms`}>
              <Slider label="Interval" min={300} max={4000} step={100} defaultValue={c.interval} ticks={10} onChange={(v) => set('interval', v)} maxSfx={false} minSfx={false} />
            </Control>
          )}
          <Control label="Centre x" value={c.cx.toFixed(2)}>
            <Slider label="Centre x" min={0} max={100} step={5} defaultValue={c.cx * 100} onChange={(v) => set('cx', v / 100)} maxSfx={false} minSfx={false} />
          </Control>
          <Control label="Centre y" value={c.cy.toFixed(2)}>
            <Slider label="Centre y" min={0} max={100} step={5} defaultValue={c.cy * 100} onChange={(v) => set('cy', v / 100)} maxSfx={false} minSfx={false} />
          </Control>
          {c.effect === 'speed-lines' && (
            <Control label="Angle" value={`${c.angle}°`}>
              <Slider label="Angle" min={-60} max={60} step={5} defaultValue={c.angle} ticks={12} onChange={(v) => set('angle', v)} maxSfx={false} minSfx={false} />
            </Control>
          )}
          {c.effect === 'flash-cut' && (
            <Control label="Flash frames">
              <Switch label="Flash frames (max 3 per second)" checked={c.flashes} onChange={(v) => set('flashes', v)} sfxOn={false} sfxOff={false} />
            </Control>
          )}
          <Control label="Style">
            <ToggleGroup label="Style" size="sm" sfx={false} items={STYLE_ITEMS} value={look.style} onValueChange={(v) => setLook((l) => ({ ...l, style: v }))} />
          </Control>
          <Control label="Theme">
            <ToggleGroup label="Theme" size="sm" sfx={false} items={THEME_ITEMS} value={look.theme} onValueChange={(v) => setLook((l) => ({ ...l, theme: v }))} />
          </Control>
          <Control label="Mode">
            <ToggleGroup label="Mode" size="sm" sfx={false} items={MODE_ITEMS} value={look.mode} onValueChange={(v) => setLook((l) => ({ ...l, mode: v }))} />
          </Control>
        </div>
      </div>

      <Section id="snippets" title="Copy it">
        <P>An iframe for any page (Notion: paste the plain URL into an /embed block):</P>
        <CodeBlock code={snippets.iframe} title="embed.html" lang="html" />
        <P>
          The plain URL. In OBS add a <strong>Browser</strong> source, paste it, set the width and height of your canvas (1920 × 1080) and keep the
          background clear: OBS's default custom CSS already makes the page transparent, and <C>background=transparent</C> keeps the screen see-through.
        </P>
        <CodeBlock code={url} title="URL" lang="url" lineNumbers={false} />
        <P>Or render it in your own React app — the same component, no iframe:</P>
        <CodeBlock code={snippets.react} />
      </Section>
    </>
  )
}

const PARAMS: [string, string, string][] = [
  ['effect', FX_SCREEN_EFFECTS.join(' · '), 'What plays (default speed-lines)'],
  ['intensity', '0 … 1', 'Density, size and shake (0.7)'],
  ['speed', '0.25 … 3', 'Time multiplier for everything (1)'],
  ['color', 'accent · pop · ink · paper', 'Effect colour from the theme tokens (accent)'],
  ['background', 'transparent · paper · ink · canvas', 'transparent shows the page or OBS scene behind it (transparent)'],
  ['trigger', 'loop · interval · click', "Hits on the effect's own beat, every interval ms, or on click / Enter (loop)"],
  ['interval', 'ms', 'Time between hits with trigger=interval (1200)'],
  ['text', 'up to 24 characters', 'Lettering that slams in on each hit (none)'],
  ['cx · cy', '0 … 1', 'Where hits land and lines converge (0.5, 0.5)'],
  ['angle', '-90 … 90', 'Speed-line direction in degrees (0)'],
  ['flash', '0', 'flash-cut without full-frame flashes'],
  ['play', '0', 'A calm still frame instead of motion'],
  ['style · theme · mode', 'cel|manga|flat · lilac|mint|peach|sky · light|dark', 'The look; without them the visitor’s saved choice or their system mode'],
]

export function Embed() {
  return (
    <Guide
      to="/docs/embed"
      lead={
        <p className="m-0">
          A screen of fast anime effects you can drop anywhere: an iframe on a website, an OBS browser source over a stream, a Notion page, a
          slide that takes web embeds. Pick the effect below, press Play, copy the snippet.
        </p>
      }
    >
      <Section id="builder" title="Builder">
        <P>
          The frame is the real <C>/embed/fx</C> page with the options in its URL. Nothing moves until you press Play.
        </P>
      </Section>
      <Builder />

      <Section id="params" title="URL parameters">
        <Table head={['Parameter', 'Values', 'What it does']} rows={PARAMS.map(([p, v, d]) => [p, v, d])} minWidth={640} />
        <P>
          Unknown or out-of-range values fall back to the default, so a broken link still shows a screen. The page has no scrollbars and no
          site chrome; with <C>background=transparent</C> the page itself is see-through.
        </P>
      </Section>

      <Section id="iframe" title="Iframe attributes">
        <P>
          <C>sandbox="allow-scripts allow-same-origin"</C> is all it needs: scripts draw the canvas, the same origin lets its module scripts and
          fonts load. It asks for no permission, so <C>allow</C> can stay empty. <C>color-scheme: normal</C> on the iframe stops the browser from
          painting it opaque when your page is dark, and <C>loading="lazy"</C> keeps it idle until it scrolls near.
        </P>
        <P>
          The screen pauses itself while it is off-screen or the tab is hidden, and draws on a canvas sized to the frame (sharp on high-density
          screens, capped at 2× to stay light on phones).
        </P>
      </Section>

      <Section id="safety" title="Flashes and motion">
        <P>
          <C>flash-cut</C> alternates full-frame flashes of ink and accent. However fast the speed or interval, flashes never come closer than a
          third of a second (three per second at most, the WCAG limit for flashing). Add <C>flash=0</C> (or <C>flashes={'{false}'}</C>) to keep the
          cut without any full-frame flash, which is the safer choice for a stream or a page you do not control.
        </P>
        <P>
          Visitors who ask their system for reduced motion get one calm still frame and no flashes at all, as with <C>play=0</C>.
        </P>
      </Section>
    </Guide>
  )
}
