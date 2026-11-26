import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { QuestLog } from '@/components/ui/quest-log'
import type { QuestGroup } from '@/components/ui/quest-log'
import type { DocEntry } from '../types'

const START: QuestGroup[] = [
  {
    id: 'main',
    title: 'Main story',
    quests: [
      {
        id: 'festival',
        title: 'Festival Night',
        description: 'Get the shrine ready before the lanterns go up.',
        reward: '300 G',
        objectives: [
          { id: 'lanterns', label: 'Hang lanterns', current: 3, target: 5 },
          { id: 'mika', label: 'Talk to Mika', done: false },
          { id: 'drums', label: 'Tune the drums', current: 0, target: 2 },
        ],
      },
    ],
  },
  {
    id: 'side',
    title: 'Side quests',
    defaultOpen: false,
    quests: [
      {
        id: 'cat',
        title: 'Lost Cat',
        reward: 'Bell Charm',
        objectives: [{ id: 'find', label: 'Find Mochi', done: true }],
      },
    ],
  },
]

/** Advance the first unfinished objective of the first quest by one step. */
function step(groups: QuestGroup[]): QuestGroup[] {
  let moved = false
  return groups.map((g) => ({
    ...g,
    quests: g.quests.map((q) => ({
      ...q,
      objectives: q.objectives.map((o) => {
        if (moved) return o
        const done = o.done ?? (o.target != null && (o.current ?? 0) >= o.target)
        if (done) return o
        moved = true
        return o.target != null ? { ...o, current: (o.current ?? 0) + 1 } : { ...o, done: true }
      }),
    })),
  }))
}

function QuestDemo() {
  const [groups, setGroups] = useState(START)
  const finished = groups[0].quests[0].objectives.every((o) => o.done ?? (o.target != null && (o.current ?? 0) >= o.target))
  return (
    <div className="grid w-full justify-items-center gap-5">
      <QuestLog groups={groups} />
      <Button size="sm" variant={finished ? 'paper' : 'accent'} sfx={finished ? 'リセット' : 'グッ'} onClick={() => setGroups((g) => (finished ? START : step(g)))}>
        {finished ? 'Reset' : 'Make progress'}
      </Button>
    </div>
  )
}

export default {
  slug: 'quest-log',
  name: 'Quest Log',
  jp: 'クエスト',
  category: 'Game',
  description:
    'A quest journal driven by your data. Finishing an objective cuts it with a slash, a strike line and a self-drawing check, and the card bounces; when every objective is done the quest stamps CLEAR! with a burst. Groups collapse, and every change is announced to screen readers.',
  preview: <QuestDemo />,
  usage: `import { QuestLog } from '@/components/ui/quest-log'

<QuestLog
  groups={[
    {
      id: 'main',
      title: 'Main story',
      quests: [
        {
          id: 'festival',
          title: 'Festival Night',
          reward: '300 G',
          objectives: [
            { id: 'lanterns', label: 'Hang lanterns', current: 3, target: 5 },
            { id: 'mika', label: 'Talk to Mika', done: false },
          ],
        },
      ],
    },
  ]}
/>`,
  examples: [
    {
      title: 'Already cleared',
      preview: (
        <QuestLog
          groups={[
            {
              id: 'done',
              title: 'Completed',
              quests: [{ id: 'q', title: 'Lost Cat', reward: 'Bell Charm', objectives: [{ id: 'a', label: 'Find Mochi', done: true }, { id: 'b', label: 'Return her home', current: 1, target: 1 }] }],
            },
          ]}
        />
      ),
      code: `<QuestLog groups={[{ id: 'done', title: 'Completed', quests: [lostCat] }]} />`,
    },
  ],
  props: [
    { name: 'groups', type: 'QuestGroup[]', description: 'Required. { id, title, quests, defaultOpen? }. Pass new data to animate what changed.' },
    { name: 'Quest', type: '{ id; title; description?; reward?; objectives }', description: 'A card. Cleared when every objective is done.' },
    { name: 'QuestObjective', type: '{ id; label; current?; target?; done? }', description: 'With a target it shows "3/5" and a bar and is done at the target; otherwise use done.' },
    { name: 'clearText', type: 'string | false', default: "'CLEAR!'", description: 'Stamp lettering on a cleared quest (hidden in flat; the Clear chip stays).' },
    { name: '...props', type: 'HTMLAttributes<HTMLDivElement>', description: 'Passed to the root.' },
  ],
} satisfies DocEntry
