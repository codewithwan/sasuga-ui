import { useState } from 'react'
import type { ReactNode } from 'react'
import { unlockReelSound } from '@/components/ui/code-reel-sound'
import { Icon } from '@/components/ui/icon'
import { Switch } from '@/components/ui/switch'
import { TerminalReplay, terminalReplayLength } from '@/components/ui/terminal-replay'
import type { CodeReelSounds, TerminalLine, TerminalPrompt, TerminalSkin, TerminalStep } from '@/components/ui/terminal-replay'
import { TimelineScrubber, useTimeline } from '@/components/ui/timeline'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { FrameControls } from '@/components/site/FrameControls'
import { withBase } from '@/data/site'
import { brand } from '../../../../../brand.config'
import type { DocEntry } from '../types'

/** Real mechanical keyboard recordings (CC0), the same set CodeReel uses. */
const SFX: CodeReelSounds = {
  key: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => withBase(`/assets/sfx/keys/key-${n}.wav`)),
  enter: withBase('/assets/sfx/keys/enter.wav'),
}

/* ── the real CLI: these are the lines cli/src/index.mjs prints for `init` and `add` ── */

const PKG = brand.package
const SLUG = PKG.replace(/^@[^/]+\//, '')
const VERSION = '0.1.0'
const DEPS = ['class-variance-authority', 'clsx', 'tailwind-merge']
const CORE_FILES = [
  `styles/${SLUG}.css`,
  'lib/theme-core.ts',
  'lib/theme.ts',
  'lib/use-theme.ts',
  'lib/utils.ts',
  'fx/effects.ts',
  'fx/engine.ts',
  'fx/impact.ts',
  'fx/index.ts',
  'fx/palette.ts',
  'fx/spring.ts',
  'fx/style.ts',
  'fx/use-springs.ts',
]

const header = (cmd: string): TerminalLine => [{ icon: 'star', tone: 'pop' }, ' ', { text: brand.name, tone: 'strong' }, { text: ` · ${cmd} · v${VERSION}`, tone: 'muted' }]
const created = (file: string): TerminalLine => ['  ', { text: 'created ', tone: 'ok' }, ` src/${file}`]

const PROMPT: TerminalPrompt = { user: 'koma', host: 'studio', path: '~/dev' }

const INSTALL: TerminalStep[] = [
  { cmd: 'cd my-game' },
  { cmd: `npx ${PKG} init` },
  { out: ['', header('init'), ''], delay: 0.4 },
  {
    out: [[{ text: '  project', tone: 'muted' }, '  Vite + TypeScript ', { text: '·', tone: 'muted' }, ' npm ', { text: '·', tone: 'muted' }, ' src/'], ''],
  },
  { out: 'Tailwind CSS v4', tone: 'ok' },
  {
    out: ['Wrote ', { text: `${SLUG}.json`, tone: 'accent' }, { text: ' (components ', tone: 'muted' }, { icon: 'arrow-right', tone: 'muted' }, { text: ' src/components/ui)', tone: 'muted' }],
    tone: 'ok',
  },
  {
    out: ['Alias ', { text: '@/*', tone: 'accent' }, ' ', { icon: 'arrow-right' }, ' src/'],
    tone: 'ok',
  },
  { out: `Core files (${CORE_FILES.length})`, tone: 'ok', delay: 0.6 },
  { out: CORE_FILES.map(created) },
  { out: `$ npm install ${DEPS.join(' ')}`, tone: 'muted' },
  // npm draws its own spinner and erases it when it is done
  { spinner: '', duration: 2.2, done: false },
  {
    out: ['', `added ${DEPS.length} packages, and audited 212 packages in 3s`, '', ['found ', { text: '0', tone: 'ok' }, ' vulnerabilities']],
  },
  { out: `Installed ${DEPS.join(', ')}`, tone: 'ok' },
  {
    out: ['Imported the styles in src/index.css ', { text: `(@import './styles/${SLUG}.css')`, tone: 'muted' }],
    tone: 'ok',
  },
  { out: 'Added the Google Fonts <link> to index.html', tone: 'ok' },
  { out: '' },
  {
    out: 'Restore the saved style + colour before the first paint:',
    tone: 'info',
  },
  {
    out: [[{ text: '  // src/main.tsx', tone: 'muted' }], [{ text: "    import { initTheme } from '@/lib/theme'", tone: 'pop' }], '', [{ text: '    initTheme()', tone: 'pop' }], ''],
  },
  {
    out: [
      [{ text: 'Ready.', tone: 'ok' }, ' Add your first component:'],
      ['  ', { text: `npx ${PKG} add button`, tone: 'accent' }],
      [{ text: `  npx ${PKG} list   ·   docs: ${brand.docs}`, tone: 'muted' }],
      '',
    ],
  },
  { pause: 0.8 },
  { cmd: `npx ${PKG} add health-bar` },
  { out: ['', header('add'), ''], delay: 0.4 },
  { out: '1 component + 1 needed by it (hud-fx)', tone: 'ok', delay: 0.5 },
  {
    out: [
      created('components/ui/hud-fx.ts'),
      created('components/ui/health-bar.tsx'),
      [
        {
          text: `  unchanged ${CORE_FILES.length} files already up to date`,
          tone: 'muted',
        },
      ],
      '',
      [{ text: 'Docs', tone: 'strong' }],
      ['  Health Bar  ', { text: `${brand.docs}components/health-bar`, tone: 'info' }],
      '',
    ],
  },
]

const SKIN_ITEMS = [
  { value: 'night', label: 'Night' },
  { value: 'paper', label: 'Paper' },
  { value: 'crt', label: 'CRT' },
]

function Menu({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">{children}</div>
}

function InstallDemo() {
  const [skin, setSkin] = useState<TerminalSkin>('night')
  const [sound, setSound] = useState(false)
  return (
    <div className="grid w-full max-w-[760px] gap-4">
      <TerminalReplay steps={INSTALL} prompt={PROMPT} skin={skin} sound={sound} sounds={SFX} controls />
      <Menu>
        <ToggleGroup label="Skin" size="sm" sfx={false} value={skin} onValueChange={(v) => setSkin(v as TerminalSkin)} items={SKIN_ITEMS} />
        <span className="inline-flex items-center gap-2 text-sm font-bold text-mute">
          Sound
          <Switch
            label="Sound"
            checked={sound}
            onChange={(on) => {
              if (on) unlockReelSound()
              setSound(on)
            }}
          />
        </span>
      </Menu>
    </div>
  )
}

/* ── a video frame: patch day for Koma's game ── */

const GAME: TerminalPrompt = {
  user: 'koma',
  host: 'dojo',
  path: '~/koma-quest',
}

const PATCH: TerminalStep[] = [
  { cmd: 'npm run assets' },
  {
    out: ['', '> koma-quest@0.9.0 assets', '> node scripts/fetch-assets.mjs', ''],
    tone: 'muted',
  },
  { progress: 'sprites.zip ', duration: 1.4, width: 20 },
  { progress: 'music.zip   ', duration: 2.1, width: 20 },
  { progress: 'voices.zip  ', duration: 1.1, width: 20 },
  { out: 'Fetched 3 packs, 148 MB', tone: 'ok' },
  { cmd: 'npm run build' },
  { out: ['', '> koma-quest@0.9.0 build', '> vite build', ''], tone: 'muted' },
  {
    spinner: 'building for production',
    duration: 1.8,
    done: '212 modules transformed.',
  },
  {
    out: [
      [{ text: 'dist/', tone: 'muted' }, 'index.html                 0.52 kB'],
      [{ text: 'dist/', tone: 'muted' }, { text: 'assets/style-9c2e.css', tone: 'pop' }, '     18.06 kB'],
      [{ text: 'dist/', tone: 'muted' }, { text: 'assets/game-4f1c.js', tone: 'accent' }, '      412.80 kB'],
    ],
  },
  { out: 'built in 1.92s', tone: 'ok' },
  { cmd: 'npm run deploy' },
  { progress: 'uploading   ', duration: 2.2, width: 20 },
  {
    spinner: 'warming the cache',
    duration: 1.3,
    done: 'live at https://koma-quest.example',
  },
]

function FrameDemo() {
  const tl = useTimeline({
    duration: terminalReplayLength({ steps: PATCH }),
    autoplay: true,
    loop: true,
  })
  return (
    <div className="grid w-full max-w-[760px] gap-4">
      <FrameControls initial="16:9" maxHeight="min(62svh, 560px)">
        {() => <TerminalReplay steps={PATCH} prompt={GAME} skin="crt" title="patch day" time={tl.time} className="aspect-auto h-full rounded-none" />}
      </FrameControls>
      <TimelineScrubber timeline={tl} label="Terminal replay" />
    </div>
  )
}

/* ── fail, fix, pass ── */

const BUILD_HEADER: TerminalStep = {
  out: ['', '> koma-quest@0.9.0 build', '> tsc && vite build', ''],
  tone: 'muted',
}

const RETRY: TerminalStep[] = [
  { cmd: 'npm run build' },
  BUILD_HEADER,
  {
    out: [
      [
        { text: 'src/combat.ts', tone: 'accent' },
        ':',
        { text: '42', tone: 'warn' },
        ':',
        { text: '3', tone: 'warn' },
        ' - ',
        { text: 'error', tone: 'error' },
        { text: ' TS2322: ', tone: 'muted' },
        "Type 'string' is not assignable to type 'number'.",
      ],
      '',
      [{ text: '42', tone: 'muted' }, "     player.hp = 'a lot'"],
      ['       ', { text: '~~~~~~~~~', tone: 'error' }],
      '',
      ['Found 1 error in ', { text: 'src/combat.ts', tone: 'accent' }, { text: ':42', tone: 'warn' }],
    ],
    delay: 1.2,
  },
  { pause: 1.2 },
  { cmd: 'clear' },
  { clear: true },
  { cmd: 'git diff' },
  {
    out: [
      [{ text: 'diff --git a/src/combat.ts b/src/combat.ts', tone: 'strong' }],
      [{ text: '@@ -40,5 +40,5 @@', tone: 'accent' }, ' export function takeHit(player: Player) {'],
      '   if (player.dodging) return',
      [{ text: "-  player.hp = 'a lot'", tone: 'error' }],
      [{ text: '+  player.hp = 9999 // still a lot', tone: 'ok' }],
      "   koma.say('ouch')",
    ],
  },
  { pause: 0.6 },
  { cmd: 'npm run build' },
  BUILD_HEADER,
  {
    spinner: 'building for production',
    duration: 1.6,
    done: '214 modules transformed.',
  },
  { out: 'built in 1.84s', tone: 'ok' },
  { cmd: 'git commit -am "hp is a number, not a feeling"' },
  {
    out: ['[main 8d04be7] hp is a number, not a feeling', ' 1 file changed, 1 insertion(+), 1 deletion(-)'],
  },
]

/* ── a README card ── */

const README: TerminalStep[] = [
  { cmd: `npx ${PKG} add health-bar` },
  { out: '1 component + 1 needed by it (hud-fx)', tone: 'ok', delay: 0.5 },
  {
    out: [created('components/ui/hud-fx.ts'), created('components/ui/health-bar.tsx')],
  },
  { cmd: 'npm run dev' },
  {
    out: [
      '',
      ['  ', { text: 'VITE', tone: 'ok' }, ' v6.0.3  ', { text: 'ready in 312 ms', tone: 'muted' }],
      '',
      ['  ', { icon: 'arrow-right', tone: 'ok' }, '  Local:   ', { text: 'http://localhost:5173/', tone: 'accent' }],
    ],
    delay: 0.5,
  },
  { pause: 1 },
]

function ReadmeCard() {
  return (
    <div className="ui-card grid w-full max-w-[520px] gap-3 p-4">
      <div className="flex items-center gap-2">
        <Icon name="book" tone="duo" size={20} />
        <span className="font-bold">Install</span>
        <span className="ml-auto font-mono text-xs text-mute">README.md</span>
      </div>
      <p className="m-0 text-sm text-mute">One command copies the component and what it needs into your project.</p>
      <TerminalReplay steps={README} prompt={{ path: '~/my-game' }} skin="paper" chrome="none" className="aspect-[5/2]" zoom={1.35} />
    </div>
  )
}

export default {
  slug: 'terminal-replay',
  name: 'Terminal Replay',
  jp: 'ターミナル',
  category: 'Motion',
  description:
    'A terminal session that plays itself, for install demos on landing pages, READMEs, docs and videos. Commands are typed with human timing (a little jitter, quicker runs inside words) and submitted with Enter, output streams in a few milliseconds per line, spinners resolve into a done line and progress bars fill with a percentage, while the newest line stays in view on a smooth spring scroll. Three skins (night, paper that follows your theme, green phosphor CRT), an optional window bar, and keyboard sounds from your own recordings. It is all a function of time, so it scrubs, loops and follows a video or a Timeline through time. Reduced motion shows each command whole, with no blinking or scrolling motion.',
  preview: <InstallDemo />,
  usage: `import { TerminalReplay } from '@/components/ui/terminal-replay'

<TerminalReplay
  prompt={{ user: 'koma', host: 'studio', path: '~/dev' }}
  skin="night"           // paper | crt
  chrome="window"        // none
  steps={[
    { cmd: 'cd my-game' },
    { cmd: 'npx ${PKG} init' },
    { out: 'Tailwind CSS v4', tone: 'ok' },
    { out: ['  ', { text: 'created ', tone: 'ok' }, ' src/lib/utils.ts'] },
    { spinner: 'Installing dependencies', duration: 2, done: 'Installed 3 packages' },
    { progress: 'Downloading', duration: 1.5 },
    { pause: 1 },
    { clear: true },
  ]}
  sound
  sounds={{
    key: ['/sfx/keys/key-1.wav', '/sfx/keys/key-2.wav', '/sfx/keys/key-3.wav'],
    enter: '/sfx/keys/enter.wav',
  }}
  controls
/>`,
  examples: [
    {
      title: 'A video frame, driven by your own timeline',
      preview: <FrameDemo />,
      code: `const steps = [
  { cmd: 'npm run assets' },
  { progress: 'sprites.zip ', duration: 1.4, width: 20 },
  { progress: 'music.zip   ', duration: 2.1, width: 20 },
  { out: 'Fetched 3 packs, 148 MB', tone: 'ok' },
  { cmd: 'npm run build' },
  { spinner: 'building for production', duration: 1.8, done: '212 modules transformed.' },
]
const tl = useTimeline({ duration: terminalReplayLength({ steps }), autoplay: true, loop: true })

<FrameStage width={1920} height={1080}>
  <TerminalReplay steps={steps} skin="crt" time={tl.time} className="aspect-auto h-full rounded-none" />
</FrameStage>
<TimelineScrubber timeline={tl} />`,
    },
    {
      title: 'Fail, fix, pass',
      preview: (
        <div className="w-full max-w-[720px]">
          <TerminalReplay steps={RETRY} prompt={GAME} title="koma-quest" sound={0.45} sounds={SFX} controls />
        </div>
      ),
      code: `<TerminalReplay
  prompt={{ user: 'koma', host: 'dojo', path: '~/koma-quest' }}
  steps={[
    { cmd: 'npm run build' },
    {
      delay: 1.2,
      out: [
        [{ text: 'src/combat.ts', tone: 'accent' }, ':42:3 - ', { text: 'error', tone: 'error' }, " TS2322: Type 'string' is not assignable to type 'number'."],
        ['       ', { text: '~~~~~~~~~', tone: 'error' }],
      ],
    },
    { cmd: 'clear' },
    { clear: true },
    { cmd: 'git diff' },
    { out: [[{ text: "-  player.hp = 'a lot'", tone: 'error' }], [{ text: '+  player.hp = 9999 // still a lot', tone: 'ok' }]] },
    { cmd: 'npm run build' },
    { spinner: 'building for production', duration: 1.6, done: '214 modules transformed.' },
    { cmd: 'git commit -am "hp is a number, not a feeling"' },
  ]}
  controls
/>`,
    },
    {
      title: 'Inline, in a README card',
      preview: <ReadmeCard />,
      code: `<TerminalReplay
  prompt={{ path: '~/my-game' }}
  skin="paper"
  chrome="none"
  className="aspect-[5/2]"
  zoom={1.35}
  steps={[
    { cmd: 'npx ${PKG} add health-bar' },
    { out: '1 component + 1 needed by it (hud-fx)', tone: 'ok', delay: 0.5 },
    { out: [['  ', { text: 'created ', tone: 'ok' }, ' src/components/ui/health-bar.tsx']] },
    { cmd: 'npm run dev' },
  ]}
/>`,
    },
  ],
  props: [
    {
      name: 'steps',
      type: 'TerminalStep[]',
      description:
        "{ cmd, at?, speed? } types a command and presses Enter (a cd moves the prompt's path). { out, tone?, mark?, delay? } streams lines: a string, an array of lines, or one line of { text, tone, icon } pieces. { spinner, duration, done?, tone? } spins | / - \\ and resolves into a done line (done: false erases it). { progress, duration, width? } fills a bar. { pause } and { clear: true }.",
    },
    {
      name: 'prompt',
      type: '{ user?, host?, path?, symbol? }',
      default: "{ path: '~' }",
      description: 'Drawn like a shell: user@host in green, the path in blue, then the sign ($ by default).',
    },
    {
      name: 'skin',
      type: "'night' | 'paper' | 'crt'",
      default: "'night'",
      description: 'night: a dark terminal. paper: follows your theme colours and light / dark mode. crt: green phosphor with scanlines and glow.',
    },
    {
      name: 'chrome',
      type: "'window' | 'none'",
      default: "'window'",
      description: 'A window bar with three dots and a title, or the bare screen.',
    },
    {
      name: 'title',
      type: 'string',
      description: 'Window title. Defaults to the working directory, which follows cd.',
    },
    {
      name: 'tone (out)',
      type: "'info' | 'ok' | 'warn' | 'error' | 'muted'",
      description: "Status tones put the tone's icon in front of the line, like a CLI's glyph; mark: false tints the text instead. muted dims it. Pieces take the tones plus accent, pop and strong.",
    },
    {
      name: 'speed',
      type: 'number',
      default: '14',
      description: 'Typing speed in characters per second, before the human jitter (quicker inside words, slower around symbols and spaces).',
    },
    {
      name: 'zoom',
      type: 'number',
      default: '1',
      description: 'Text size relative to the box. The text scales with the box in container units, so it reads the same in a 1920 × 1080 frame and in a small card.',
    },
    {
      name: 'time',
      type: 'number',
      description: 'External clock in seconds (useMediaTime, a Timeline). The terminal follows it and its own clock stops. terminalReplayLength({ steps }) gives the length.',
    },
    {
      name: 'autoplay / loop / controls',
      type: 'boolean',
      default: 'true / true / false',
      description: 'Own clock options; controls adds a play and seek bar under the screen.',
    },
    {
      name: 'glow',
      type: 'boolean',
      description: 'Text glow. Default: on for crt.',
    },
    {
      name: 'sound',
      type: 'boolean | number',
      default: 'false',
      description: 'Play the sounds: true = 0.5 or a volume 0..1. Browsers start audio after the first click on the page.',
    },
    {
      name: 'sounds',
      type: '{ key?: string | string[]; enter?; ok?; warn?; error?; info? }',
      description:
        'Audio file per event: a key per typed character (several files are picked at random), enter when a command is submitted, and the tones for status lines. Events without a file stay silent.',
    },
    {
      name: 'className',
      type: 'string',
      description: 'Sizes the screen (default aspect-video, full width). Give it a height: h-full inside a FrameStage.',
    },
    {
      name: 'label',
      type: 'string',
      description: 'Accessible name of the log; defaults to the commands.',
    },
  ],
} satisfies DocEntry
