import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { DocEntry } from '../types'

export default {
  slug: 'card',
  name: 'Card',
  jp: 'カード',
  category: 'Display',
  description:
    'An outlined sticker panel with the style\'s offset shadow. Same composable parts as shadcn: header, title, description, content, footer. `interactive` cards tilt toward the pointer in 3D, lift with a glint sweep and a glare that follows the pointer, and land a hit where you click.',
  preview: (
    <Card interactive className="w-[min(100%,320px)]">
      <CardHeader>
        <CardTitle>Episode 01</CardTitle>
        <CardDescription>Ship the landing page before Friday.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Badge variant="accent">In progress</Badge>
      </CardFooter>
    </Card>
  ),
  usage: `import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card interactive>
  <CardHeader>
    <CardTitle>Episode 01</CardTitle>
    <CardDescription>Ship the landing page.</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>`,
  examples: [
    {
      title: 'Variants',
      preview: (
        <div className="grid w-full gap-8 sm:grid-cols-3">
          <Card variant="paper">
            <CardTitle>Paper</CardTitle>
            <CardDescription>Default panel.</CardDescription>
          </Card>
          <Card variant="ink">
            <CardTitle>Ink</CardTitle>
            <CardDescription>For contrast.</CardDescription>
          </Card>
          <Card variant="accent">
            <CardTitle>Accent</CardTitle>
            <CardDescription>For highlights.</CardDescription>
          </Card>
        </div>
      ),
      code: `<Card variant="paper">…</Card>
<Card variant="ink">…</Card>
<Card variant="accent">…</Card>`,
    },
    {
      title: 'Interactive with actions',
      preview: (
        <Card interactive className="w-[min(100%,360px)]">
          <CardHeader>
            <CardTitle>Key animation</CardTitle>
            <CardDescription>Hover me, move around, then click the panel.</CardDescription>
          </CardHeader>
          <CardContent>Twelve drawings, one big impact frame.</CardContent>
          <CardFooter>
            <Button size="sm" variant="accent" sfx="バン!">
              Accept
            </Button>
          </CardFooter>
        </Card>
      ),
      code: `<Card interactive>
  <CardHeader>
    <CardTitle>Key animation</CardTitle>
    <CardDescription>Hover me.</CardDescription>
  </CardHeader>
  <CardContent>Twelve drawings, one big impact frame.</CardContent>
  <CardFooter>
    <Button size="sm" variant="accent" sfx="バン!">Accept</Button>
  </CardFooter>
</Card>`,
    },
  ],
  props: [
    { name: 'variant', type: "'paper' | 'ink' | 'accent'", default: "'paper'", description: 'Fill colour. Line, radius and shadow come from the active style.' },
    { name: 'interactive', type: 'boolean', default: 'false', description: 'Tilts toward the pointer (springs back on leave), lifts with a glint sweep, squashes on press and bursts at the click point. Clicks on controls inside the card are left to them.' },
    { name: 'tilt', type: 'number', default: '9', description: 'Maximum tilt in degrees (halved in flat).' },
    { name: '...props', type: 'HTMLAttributes<HTMLDivElement>', description: 'Passed to the outer wrapper. Sub-parts accept their native element props.' },
  ],
} satisfies DocEntry
