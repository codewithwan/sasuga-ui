import type { ReactNode } from 'react'
import {
  ArrowDoodle,
  BaanSticker,
  DonSticker,
  FilmStrip,
  ImpactStar,
  BrandLogo,
  BrandMark,
  KiraSticker,
  KomaScene,
  NewTag,
  RibbonBanner,
  ShoutBubble,
  SparkleCluster,
  SpeechBubble,
  SpeedLines,
  ToneBlob,
} from '@/components/art/stickers'
import type { KomaSceneName } from '@/components/art/stickers'
import type { DocEntry } from '../types'

function Cell({ name, children }: { name: string; children: ReactNode }) {
  return (
    <figure className="m-0 grid justify-items-center gap-2">
      <div className="grid h-24 w-full place-items-center">{children}</div>
      <figcaption className="font-mono text-[11px] leading-none text-mute">{name}</figcaption>
    </figure>
  )
}

function Sheet() {
  return (
    <div className="grid w-full max-w-[560px] grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-x-4 gap-y-6">
      <Cell name="DonSticker">
        <DonSticker className="w-24" />
      </Cell>
      <Cell name="KiraSticker">
        <KiraSticker className="w-24" />
      </Cell>
      <Cell name="BaanSticker">
        <BaanSticker className="w-24" />
      </Cell>
      <Cell name="ImpactStar">
        <ImpactStar className="w-20" />
      </Cell>
      <Cell name="SparkleCluster">
        <SparkleCluster className="w-20" />
      </Cell>
      <Cell name="NewTag">
        <NewTag className="w-20" />
      </Cell>
      <Cell name="ArrowDoodle">
        <ArrowDoodle className="w-20 text-ink" />
      </Cell>
      <Cell name="ToneBlob">
        <ToneBlob fade={false} outlined className="w-20" />
      </Cell>
      <Cell name="BrandMark">
        <BrandMark className="w-16" />
      </Cell>
    </div>
  )
}

const SCENES: KomaSceneName[] = ['hello', 'shout', 'cheer', 'wink']

export default {
  slug: 'stickers',
  name: 'Stickers',
  jp: 'ステッカー',
  category: 'Display',
  description:
    'Hand-built inline SVG decoration for splash screens, empty states and demos: speech and shout bubbles, sound-effect stickers (ドン, キラッ, バーン), impact stars, sparkles, speed lines, screentone blobs, ribbons, an arrow doodle, a NEW! tag, a film strip and ready-made Koma scenes. Fills follow the theme tokens, outlines follow the style’s line and weight, and the offset drop is soft in cel, ink in manga and gone in flat. Decorative by default (aria-hidden); pass label to name one.',
  preview: <Sheet />,
  usage: `import { DonSticker, SpeechBubble, KomaScene } from '@/components/art/stickers'

<DonSticker className="w-28" />
<SpeechBubble tail="left">Nice hit!</SpeechBubble>
<KomaScene scene="cheer" />`,
  examples: [
    {
      title: 'Bubbles and ribbon (HTML text, the shape stretches to fit)',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <SpeechBubble tail="left" className="text-base">
            Nice hit!
          </SpeechBubble>
          <SpeechBubble tail="right" tone="soft" className="max-w-[200px] text-base">
            Bubbles wrap longer lines, too.
          </SpeechBubble>
          <ShoutBubble tone="pop" className="text-2xl">
            <span className="font-jp">ドン!</span>
          </ShoutBubble>
          <RibbonBanner className="text-base">Stage clear</RibbonBanner>
        </div>
      ),
      code: `<SpeechBubble tail="left">Nice hit!</SpeechBubble>
<SpeechBubble tail="right" tone="soft">Bubbles wrap longer lines, too.</SpeechBubble>
<ShoutBubble tone="pop"><span className="font-jp">ドン!</span></ShoutBubble>
<RibbonBanner>Stage clear</RibbonBanner>`,
    },
    {
      title: 'Any sound effect',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <DonSticker text="ドドン!" className="w-32" />
          <KiraSticker text="ピカッ" tone="soft" className="w-28" />
          <BaanSticker text="BAM!" className="w-28" />
          <ImpactStar text="HIT" tone="accent" className="w-24" />
        </div>
      ),
      code: `<DonSticker text="ドドン!" />
<KiraSticker text="ピカッ" tone="soft" />
<BaanSticker text="BAM!" />
<ImpactStar text="HIT" tone="accent" />`,
    },
    {
      title: 'Backdrops',
      preview: (
        <div className="grid w-full max-w-[520px] gap-4 sm:grid-cols-2">
          <div className="ui-r ui-border-thin relative grid h-36 place-items-center overflow-hidden bg-paper">
            <SpeedLines variant="focus" className="absolute inset-0 text-ink opacity-20" />
            <BrandLogo className="relative text-2xl" />
          </div>
          <div className="ui-r ui-border-thin relative grid h-36 place-items-center overflow-hidden bg-paper">
            <SpeedLines variant="horizontal" className="absolute inset-0 text-accent opacity-30" />
            <ToneBlob tone="pop" outlined className="relative w-24" />
          </div>
        </div>
      ),
      code: `<div className="relative overflow-hidden">
  <SpeedLines variant="focus" className="absolute inset-0 text-ink opacity-20" />
  …
</div>
<SpeedLines variant="horizontal" className="text-accent opacity-30" />
<ToneBlob tone="pop" outlined />`,
    },
    {
      title: 'Film strip',
      preview: <FilmStrip label="Koma winding up: neutral, surprised, angry, happy" />,
      code: `<FilmStrip />                       // Koma winding up through four keyframes
<FilmStrip frames={[<A />, <B />, <C />]} />`,
    },
    {
      title: 'Koma scenes',
      preview: (
        <div className="grid w-full max-w-[560px] grid-cols-2 gap-4 sm:grid-cols-4">
          {SCENES.map((s) => (
            <figure key={s} className="m-0 grid justify-items-center gap-1">
              <KomaScene scene={s} />
              <figcaption className="font-mono text-[11px] text-mute">{s}</figcaption>
            </figure>
          ))}
        </div>
      ),
      code: `<KomaScene scene="hello" />   // hello | shout | cheer | wink
<KomaScene scene="cheer" line="Stage clear!" />`,
    },
  ],
  props: [
    { name: 'tone', type: "'accent' | 'pop' | 'soft' | 'paper' | 'ink'", description: 'Fill colour of the sticker (bubbles: paper | soft | accent | pop). Text on accent / pop turns white.' },
    { name: 'text', type: 'string', description: 'SfxSticker, the presets, ImpactStar and NewTag: the word. It shrinks to fit.' },
    { name: 'ink', type: 'StickerTone', default: "'accent'", description: 'SfxSticker: the lettering colour.' },
    { name: 'spikes / seed', type: 'number', description: 'Bursts: how many spikes, and which hand-drawn jitter.' },
    { name: 'tail', type: "'left' | 'right' | 'none'", default: "'left'", description: 'SpeechBubble / ShoutBubble: where the tail points.' },
    { name: 'variant', type: "'focus' | 'horizontal'", default: "'focus'", description: 'SpeedLines: focus lines closing in, or speed streaks. Drawn in currentColor.' },
    { name: 'animated', type: 'boolean', description: 'SparkleCluster / Sparkle / KomaScene: twinkle and idle life. Always off under reduced motion.' },
    { name: 'scene', type: "'hello' | 'shout' | 'cheer' | 'wink'", default: "'hello'", description: 'KomaScene: which composition. `line` replaces its text.' },
    { name: 'frames', type: 'ReactNode[]', description: 'FilmStrip: one node per frame. Defaults to four Koma keyframes.' },
    { name: 'label', type: 'string', description: 'Accessible name. Without it the sticker is decorative (aria-hidden).' },
    { name: '...props', type: 'SVGProps<SVGSVGElement>', description: 'SVG stickers pass the rest to the <svg>; size them with a width class (they keep their aspect ratio).' },
  ],
} satisfies DocEntry
