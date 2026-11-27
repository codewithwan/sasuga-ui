import { useRef } from 'react'
import { AchievementHost } from '@/components/ui/achievement'
import { Button } from '@/components/ui/button'
import { useAchievement } from '@/components/ui/use-achievement'
import type { Achievement } from '@/components/ui/use-achievement'
import type { DocEntry } from '../types'

const PRESETS: Achievement[] = [
  { title: 'First Frame', description: 'Drew your first impact frame.', points: 10, next: { label: 'Animator', value: 1, max: 10 } },
  { title: 'Combo Artist', description: 'Chained 25 hits without a miss.', points: 50 },
  { title: 'Combo Legend', description: 'Every effect, every style.', points: 100, next: { label: 'Tier III', value: 7, max: 10 } },
]

function AchievementDemo() {
  const { unlock } = useAchievement()
  const n = useRef(0)
  return (
    <div className="grid justify-items-center gap-3">
      <Button variant="accent" sfx="解除!" onClick={() => unlock(PRESETS[n.current++ % PRESETS.length])}>
        Unlock achievement
      </Button>
      <p className="m-0 text-center text-xs text-mute">Click a few times to stack them. Hover a banner to pause it.</p>
      <AchievementHost />
    </div>
  )
}

function BurstDemo() {
  const { unlock } = useAchievement()
  return (
    <Button
      size="sm"
      onClick={() => {
        unlock({ title: 'Speedrunner', description: 'Cleared the stage in under a minute.', points: 25 })
        window.setTimeout(() => unlock({ title: 'Untouchable', description: 'No damage taken.', points: 40, duration: 6000 }), 450)
      }}
    >
      Unlock two at once
    </Button>
  )
}

export default {
  slug: 'achievement',
  name: 'Achievement',
  jp: '実績解除',
  category: 'Game',
  description:
    'Unlock banners on their own fixed layer. Each one slides in on speed lines, its trophy stamps down with a burst and lettering, the title rolls up letter by letter, a chip shows progress to the next tier, and a drain bar counts down to auto-dismiss. They stack, and hovering pauses the timer.',
  preview: <AchievementDemo />,
  usage: `import { AchievementHost } from '@/components/ui/achievement'
import { useAchievement } from '@/components/ui/use-achievement'

// once, near the root of the app
<AchievementHost position="top-right" />

// anywhere
const { unlock } = useAchievement()
unlock({ title: 'First Frame', points: 10, next: { label: 'Animator', value: 1, max: 10 } })`,
  examples: [
    {
      title: 'Stacking (uses the host from the preview above)',
      preview: <BurstDemo />,
      code: `unlock({ title: 'Speedrunner', points: 25 })
unlock({ title: 'Untouchable', points: 40, duration: 6000 })`,
    },
  ],
  props: [
    { name: 'useAchievement()', type: '{ unlock(a): id; dismiss(id) }', description: 'Hook. Also exported as plain functions: unlockAchievement, dismissAchievement.' },
    { name: 'a.title', type: 'string', description: 'Required. Rolls in letter by letter.' },
    { name: 'a.description', type: 'string', description: 'Second line.' },
    { name: 'a.icon', type: 'ReactNode', default: 'trophy', description: 'Replaces the trophy in the stamp circle.' },
    { name: 'a.points', type: 'number', description: 'Shows a "+N" chip.' },
    { name: 'a.next', type: '{ value; max; label? }', description: 'Progress-to-next chip with a mini bar.' },
    { name: 'a.duration / a.sfx', type: 'number / string | false', description: 'Per-banner overrides of the host settings.' },
    { name: 'position', type: "'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'", default: "'top-right'", description: 'AchievementHost. Corner the banners stack in.' },
    { name: 'max', type: 'number', default: '3', description: 'AchievementHost. Banners on screen at once; older ones leave early.' },
    { name: 'duration', type: 'number', default: '4500', description: 'AchievementHost. Auto-dismiss time in ms.' },
    { name: 'sfx', type: 'string | false', default: "'解除!'", description: 'AchievementHost. Lettering when the trophy stamps.' },
  ],
} satisfies DocEntry
