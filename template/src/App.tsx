import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HealthBar } from '@/components/ui/health-bar'
import { Icon } from '@/components/ui/icon'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Toaster } from '@/components/ui/toaster'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { useToast } from '@/components/ui/use-toast'
import { STYLES, THEMES, useTheme } from '@/lib/theme'
import type { StyleId, ThemeId } from '@/lib/theme'

/** Style, colour and light/dark switches — all three are attributes on <html>. */
function Controls() {
  const { style, setStyle, theme, setTheme, mode, setMode } = useTheme()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup
        label="Style"
        size="sm"
        sfx={false}
        items={STYLES.map((s) => ({ value: s.id, label: s.label }))}
        value={style}
        onValueChange={(v) => setStyle(v as StyleId)}
      />
      <ToggleGroup
        label="Colour"
        size="sm"
        sfx={false}
        items={THEMES.map((t) => ({ value: t.id, label: t.label }))}
        value={theme}
        onValueChange={(v) => setTheme(v as ThemeId)}
      />
      <Button size="sm" sfx={false} onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
        <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} tone="line" />
        {mode === 'dark' ? 'Light' : 'Dark'}
      </Button>
    </div>
  )
}

function Demo() {
  const toast = useToast()
  const [hp, setHp] = useState(72)
  const [sfx, setSfx] = useState(true)

  return (
    <section className="ui-card grid gap-6 p-6 sm:p-8">
      <HealthBar label="Hero" value={hp} max={100} showNumbers />
      <div className="grid gap-1">
        <span aria-hidden="true" className="ui-head text-sm text-mute">
          Set HP
        </span>
        <Slider label="Set HP" defaultValue={hp} onChange={setHp} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span aria-hidden="true" className="ui-head text-sm text-mute">
          Sound-effect lettering
        </span>
        <Switch label="Sound-effect lettering" checked={sfx} onChange={setSfx} />
      </div>
      <div className="flex flex-wrap gap-4">
        <Button variant="accent" sfx={sfx ? 'ドン!' : false} onClick={() => setHp((v) => Math.max(0, v - 18))}>
          <Icon name="sword" size={20} tone="line" /> Attack
        </Button>
        <Button sfx={sfx ? 'キラッ' : false} onClick={() => setHp((v) => Math.min(100, v + 25))}>
          <Icon name="heart" size={20} tone="line" /> Heal
        </Button>
        <Button variant="ink" sfx={false} onClick={() => toast('Saved!', { variant: 'success', sfx: sfx ? 'OK!' : false })}>
          Save
        </Button>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <Toaster>
      <main className="mx-auto grid min-h-svh w-[min(720px,100%-32px)] content-center gap-8 py-16">
        <header className="grid gap-3">
          <h1 className="ui-head m-0 text-5xl leading-none">My app</h1>
          <p className="m-0 text-mute">
            Edit <code className="font-mono text-ink">src/App.tsx</code>. Every component lives in{' '}
            <code className="font-mono text-ink">src/components/ui</code> — it is your code now.
          </p>
          <Controls />
        </header>
        <Demo />
      </main>
    </Toaster>
  )
}
