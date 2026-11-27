import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { ImageLoader } from '@/components/ui/image-loader'
import type { ImageReveal } from '@/components/ui/image-loader'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { ART } from '@/data/art'
import type { ArtName } from '@/data/art'
import type { DocEntry } from '../types'

/** A pretend network: the src only arrives `ms` after each "load", so the placeholder is visible. */
function useSlowSrc(name: ArtName, ms = 1400) {
  const [round, setRound] = useState(0)
  const [arrived, setArrived] = useState(-1)
  const ready = arrived === round
  useEffect(() => {
    const t = window.setTimeout(() => setArrived(round), ms)
    return () => window.clearTimeout(t)
  }, [round, ms])
  return { round, ready, src: ready ? ART[name].src : undefined, reload: () => setRound((r) => r + 1) }
}

function Reload({ onClick, ready }: { onClick: () => void; ready: boolean }) {
  return (
    <Button size="sm" sfx={false} onClick={onClick} disabled={!ready} icon={<Icon name="play" tone="line" size={14} />}>
      {ready ? 'Load again' : 'Loading…'}
    </Button>
  )
}

function RevealDemo() {
  const [reveal, setReveal] = useState<ImageReveal>('ink')
  const { round, ready, src, reload } = useSlowSrc('mascot/koma-happy')
  const art = ART['mascot/koma-happy']
  return (
    <div className="grid w-[min(100%,360px)] justify-items-center gap-4">
      <ImageLoader key={`${round}-${reveal}`} {...art} src={src} alt="Koma cheering" reveal={reveal} className="w-[min(100%,240px)]" />
      <ToggleGroup
        label="Reveal"
        size="sm"
        sfx={false}
        value={reveal}
        onValueChange={(v) => {
          setReveal(v as ImageReveal)
          reload()
        }}
        items={(['ink', 'slash', 'pop', 'fade'] as const).map((v) => ({ value: v, label: v }))}
      />
      <Reload onClick={reload} ready={ready} />
    </div>
  )
}

function KindsDemo() {
  const { round, ready, reload } = useSlowSrc('mascot/koma-wink', 1800)
  const cut = ART['mascot/koma-wink']
  const photo = ART['og-image']
  return (
    <div className="grid w-full max-w-[620px] justify-items-center gap-5">
      <div className="grid w-full grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)_minmax(0,0.8fr)] items-center gap-4">
        <figure className="m-0 grid gap-2 text-center">
          <ImageLoader key={`a${round}`} {...cut} src={ready ? cut.src : undefined} alt="Koma winking" reveal="pop" />
          <figcaption className="text-xs font-bold text-mute">shape</figcaption>
        </figure>
        <figure className="m-0 grid gap-2 text-center">
          <ImageLoader key={`b${round}`} {...photo} src={ready ? photo.src : undefined} alt="The social card" fit="cover" reveal="slash" className="ui-r overflow-hidden" />
          <figcaption className="text-xs font-bold text-mute">blur</figcaption>
        </figure>
        <figure className="m-0 grid gap-2 text-center">
          <ImageLoader key={`c${round}`} width={768} height={768} src={ready ? ART['mascot/koma-neutral'].src : undefined} alt="Koma smiling" reveal="fade" />
          <figcaption className="text-xs font-bold text-mute">none</figcaption>
        </figure>
      </div>
      <Reload onClick={reload} ready={ready} />
    </div>
  )
}

/** Reads an image in the browser and builds its placeholder: a 32 px alpha mask for cut-outs, a 16 px preview otherwise. */
function makePlaceholder(img: HTMLImageElement) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const probe = Object.assign(document.createElement('canvas'), { width: 64, height: Math.max(1, Math.round((64 * h) / w)) })
  const pc = probe.getContext('2d', { willReadFrequently: true })
  if (!pc) return null
  pc.drawImage(img, 0, 0, probe.width, probe.height)
  const px = pc.getImageData(0, 0, probe.width, probe.height).data
  let cutout = false
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) cutout = true
  const side = cutout ? 32 : 16
  const k = side / Math.max(w, h)
  const c = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) })
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, c.width, c.height)
  if (cutout) {
    // keep only the alpha: black pixels carrying the image's coverage
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, c.width, c.height)
  }
  return { uri: c.toDataURL('image/png'), kind: cutout ? ('shape' as const) : ('blur' as const), width: w, height: h }
}

const PICKS: ArtName[] = ['mascot/koma-wink', 'mascot/koma-side', 'hero/koma-impact', 'og-image']

function PlaceholderMaker() {
  const [src, setSrc] = useState(ART['mascot/koma-wink'].src)
  const [made, setMade] = useState<ReturnType<typeof makePlaceholder>>(null)
  const [round, setRound] = useState(0)
  const [arrived, setArrived] = useState(-1)
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setMade(makePlaceholder(img))
      setRound((r) => r + 1)
    }
    img.src = src
  }, [src])
  useEffect(() => {
    const t = window.setTimeout(() => setArrived(round), 1500)
    return () => window.clearTimeout(t)
  }, [round])
  const bytes = made ? Math.round((made.uri.length - 22) * 0.75) : 0
  return (
    <div className="grid w-full max-w-[560px] gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PICKS.map((p) => (
          <Button key={p} size="sm" variant={ART[p].src === src ? 'accent' : 'paper'} sfx={false} onClick={() => setSrc(ART[p].src)}>
            {p.split('/').pop()}
          </Button>
        ))}
        <label className="ui-head ui-pill ui-border-thin inline-flex cursor-pointer items-center gap-1.5 bg-paper px-3 py-1.5 text-[13px] focus-within:ui-focus">
          <Icon name="plus" tone="line" size={14} /> Your image
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setSrc(URL.createObjectURL(f))
            }}
          />
        </label>
      </div>
      {made && (
        <div className="grid grid-cols-2 items-end gap-4">
          <figure className="m-0 grid gap-2 text-center">
            <ImageLoader width={made.width} height={made.height} placeholder={made.uri} placeholderKind={made.kind} fit={made.kind === 'blur' ? 'cover' : 'contain'} alt="" className="ui-r overflow-hidden" />
            <figcaption className="text-xs font-bold text-mute">
              placeholder: {made.kind}, {bytes} bytes
            </figcaption>
          </figure>
          <figure className="m-0 grid gap-2 text-center">
            <ImageLoader
              key={round}
              width={made.width}
              height={made.height}
              placeholder={made.uri}
              placeholderKind={made.kind}
              fit={made.kind === 'blur' ? 'cover' : 'contain'}
              src={arrived === round ? src : undefined}
              alt="The chosen image"
              reveal="ink"
              className="ui-r overflow-hidden"
            />
            <figcaption className="text-xs font-bold text-mute">loading it (1.5 s)</figcaption>
          </figure>
        </div>
      )}
      <Button size="sm" sfx={false} className="justify-self-center" onClick={() => setRound((r) => r + 1)} icon={<Icon name="play" tone="line" size={14} />}>
        Load again
      </Button>
    </div>
  )
}

export default {
  slug: 'image-loader',
  name: 'Image Loader',
  jp: '画像ローダー',
  category: 'Display',
  description:
    "An image that waits well. Its box is reserved from width and height, so nothing jumps. While the file downloads, a placeholder in the theme tint holds the spot: for cut-out art it is the image's own silhouette, filled with screentone and a sweeping sheen; for photos a blurred preview; with nothing given, a shimmer block. When the file is in it lands with an ink spread, a diagonal slash, a pop or a fade (flat style always rises calmly), and the placeholder melts away. Images already in the cache appear at once without replaying, a broken file keeps its placeholder with a warning and the alt text, and paused holds the reveal behind an intro.",
  preview: <RevealDemo />,
  usage: `import { ImageLoader } from '@/components/ui/image-loader'

<ImageLoader
  src="/assets/mascot/koma-happy.webp"
  alt="Koma cheering"
  width={768}
  height={768}
  placeholder="data:image/png;base64,…"   // 32 px silhouette
  reveal="ink"
/>`,
  examples: [
    {
      title: 'Three kinds of placeholder',
      preview: <KindsDemo />,
      code: `// cut-out art: its silhouette, tinted
<ImageLoader {...size} src={src} placeholder={silhouette} placeholderKind="shape" reveal="pop" />
// photo: a tiny preview, blurred
<ImageLoader {...size} src={src} placeholder={preview} placeholderKind="blur" fit="cover" reveal="slash" />
// nothing known yet: a shimmer block
<ImageLoader width={768} height={768} src={src} reveal="fade" />`,
    },
    {
      title: 'Making the placeholders',
      preview: <PlaceholderMaker />,
      code: `# a 32 px alpha mask for cut-out art (Pillow)
im = Image.open(path).convert('RGBA')
mask = Image.new('RGBA', small, (0, 0, 0, 0))
mask.putalpha(im.getchannel('A').resize(small, Image.LANCZOS))

# or in the browser, once, from a loaded image
const c = Object.assign(document.createElement('canvas'), { width: 32, height: 32 })
c.getContext('2d').drawImage(img, 0, 0, 32, 32)
const placeholder = c.toDataURL()`,
    },
  ],
  props: [
    { name: 'src', type: 'string', description: 'The image. Undefined keeps the placeholder waiting (e.g. while the URL is still being resolved).' },
    { name: 'alt', type: 'string', description: 'Alt text; also shown on the error state.' },
    { name: 'width / height', type: 'number', description: 'Intrinsic size. Reserves the box (aspect-ratio) so the layout never shifts.' },
    { name: 'placeholder', type: 'string', description: 'A tiny data URI: the silhouette (shape) or a small preview (blur). Without it a shimmer block shows.' },
    { name: 'placeholderKind', type: "'shape' | 'blur'", default: "'shape'", description: 'shape fills the silhouette with the theme tint and screentone; blur shows the preview blurred.' },
    { name: 'reveal', type: "'ink' | 'slash' | 'pop' | 'fade' | 'none'", default: "'ink'", description: 'How the image lands. Flat style always uses a calm rise; reduced motion shows it at once.' },
    { name: 'fit', type: "'contain' | 'cover'", default: "'contain'", description: 'object-fit for the image and the placeholder.' },
    { name: 'priority', type: 'boolean', default: 'false', description: 'Above the fold: eager loading with high fetch priority. Otherwise lazy.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Hold the reveal; it plays once this is false and the file is in.' },
    { name: 'delay', type: 'number', default: '0', description: 'Extra milliseconds before the reveal, to stagger a row.' },
    { name: 'burst', type: 'boolean', default: 'false', description: 'A small impact burst where the image lands (cel and manga).' },
    { name: 'className / imgClassName', type: 'string', description: 'Classes for the box (size it with a width) and for the <img>.' },
    { name: 'onLoad / onError', type: '() => void', description: 'Called when the file loads or fails.' },
  ],
} satisfies DocEntry
