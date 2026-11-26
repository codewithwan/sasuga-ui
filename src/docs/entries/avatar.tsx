import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import type { DocEntry } from '../types'

export default {
  slug: 'avatar',
  name: 'Avatar',
  jp: 'アバター',
  category: 'Display',
  description:
    'A round outlined sticker for a portrait; without an image it falls back to initials. It hops when hovered (stretching on the way up, squashing with a puff of dust on landing), an online dot keeps pinging, and AvatarGroup stacks a party that fans out on hover.',
  preview: (
    <div className="flex items-center gap-6">
      <Avatar alt="Code With Wan" fallback="CW" status="online" />
      <Avatar alt="codewithwan" size="lg" />
    </div>
  ),
  usage: `import { Avatar, AvatarGroup } from '@/components/ui/avatar'

<Avatar src="/me.jpg" alt="codewithwan" fallback="CW" status="online" />`,
  examples: [
    {
      title: 'Sizes',
      preview: (
        <div className="flex items-end gap-6">
          <Avatar alt="Small" fallback="SM" size="sm" />
          <Avatar alt="Medium" fallback="MD" size="md" />
          <Avatar alt="Large" fallback="LG" size="lg" />
        </div>
      ),
      code: `<Avatar alt="Small" fallback="SM" size="sm" />
<Avatar alt="Medium" fallback="MD" size="md" />
<Avatar alt="Large" fallback="LG" size="lg" />`,
    },
    {
      title: 'Status',
      preview: (
        <div className="flex items-center gap-6">
          <Avatar alt="Online player" fallback="ON" status="online" size="lg" />
          <Avatar alt="Away player" fallback="AF" status="away" size="lg" />
        </div>
      ),
      code: `<Avatar alt="Online player" fallback="ON" status="online" size="lg" />
<Avatar alt="Away player" fallback="AF" status="away" size="lg" />`,
    },
    {
      title: 'Group',
      preview: (
        <AvatarGroup max={4}>
          <Avatar alt="Aki" fallback="AK" status="online" />
          <Avatar alt="Ren" fallback="RE" />
          <Avatar alt="Mio" fallback="MI" />
          <Avatar alt="Sora" fallback="SO" status="away" />
          <Avatar alt="Kai" fallback="KA" />
          <Avatar alt="Yuu" fallback="YU" />
        </AvatarGroup>
      ),
      code: `import { Avatar, AvatarGroup } from '@/components/ui/avatar'

<AvatarGroup max={4}>
  <Avatar alt="Aki" status="online" />
  <Avatar alt="Ren" />
  <Avatar alt="Mio" />
  <Avatar alt="Sora" status="away" />
  <Avatar alt="Kai" />
  <Avatar alt="Yuu" />
</AvatarGroup>`,
    },
  ],
  props: [
    { name: 'alt', type: 'string', description: 'Required. Used as the image alt, or as the accessible name of the initials.' },
    { name: 'src', type: 'string', description: 'Image URL. Falls back to initials if missing or it fails to load.' },
    { name: 'fallback', type: 'string', description: 'Initials to show (first two characters). Defaults to the first letters of alt.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Sticker size.' },
    { name: 'status', type: "'online' | 'away'", description: 'Adds a status dot in the corner; online pings.' },
    { name: 'hop', type: 'boolean', default: 'true', description: 'Hop on hover.' },
    { name: '<AvatarGroup>', type: "{ children; size?: 'sm' | 'md' | 'lg'; max?: number }", description: 'Overlapping stack that fans out on hover or focus. Match size to its avatars; past max the rest become a +N sticker.' },
  ],
} satisfies DocEntry
