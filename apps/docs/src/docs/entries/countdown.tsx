import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/ui/countdown'
import type { DocEntry } from '../types'

function StampDemo({ variant = 'stamp' }: { variant?: 'stamp' | 'ring' }) {
  const [run, setRun] = useState(0)
  const [state, setState] = useState<'idle' | 'counting' | 'go'>('idle')
  return (
    <div className="grid w-full justify-items-center gap-4">
      <Countdown key={run} variant={variant} running={run > 0} onDone={() => setState('go')} />
      <Button
        size="sm"
        variant="accent"
        sfx={false}
        onClick={() => {
          setState('counting')
          setRun((r) => r + 1)
        }}
      >
        {state === 'idle' ? 'Start round' : 'Again'}
      </Button>
    </div>
  )
}

function TimerDemo() {
  const [key, setKey] = useState(0)
  const [running, setRunning] = useState(false)
  return (
    <div className="grid justify-items-center gap-5">
      <Countdown key={key} variant="timer" from={15} running={running} onDone={() => setRunning(false)} />
      <div className="flex gap-3">
        <Button size="sm" variant="accent" sfx={false} onClick={() => setRunning((r) => !r)}>
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button
          size="sm"
          sfx={false}
          onClick={() => {
            setRunning(false)
            setKey((k) => k + 1)
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

export default {
  slug: 'countdown',
  name: 'Countdown',
  jp: 'カウントダウン',
  category: 'Game',
  description:
    'Round start and round clock, played as a show. In `stamp` each number crashes in huge onto a panel that flashes the theme colours, focus lines fan out, a ring sweeps round once per beat and the old number shatters as the next one lands; GO! hits with a full burst, rays, lettering and a shake. `ring` is the same show in a round badge. `timer` is an mm:ss Rolling Number inside a draining ring: the last ten seconds turn the pop colour, pulse and jolt on every tick, and TIME UP! is stamped at zero.',
  preview: <StampDemo />,
  usage: `import { Countdown } from '@/components/ui/countdown'

<Countdown from={3} onDone={startRound} />
<Countdown variant="ring" from={3} onDone={startRound} />
<Countdown variant="timer" from={90} running={!paused} onDone={endRound} />`,
  examples: [
    {
      title: 'Ring',
      preview: <StampDemo variant="ring" />,
      code: `<Countdown key={run} variant="ring" running={run > 0} onDone={go} />`,
    },
    {
      title: 'Timer with panic',
      preview: <TimerDemo />,
      code: `<Countdown key={round} variant="timer" from={15} running={running} onDone={() => setRunning(false)} />`,
    },
  ],
  props: [
    { name: 'variant', type: "'stamp' | 'ring' | 'timer'", default: "'stamp'", description: 'Panel show, round-badge show, or mm:ss clock.' },
    { name: 'mode', type: "'stamp' | 'timer'", description: 'Deprecated alias of `variant`, still honoured.' },
    { name: 'from', type: 'number', default: '3 / 60', description: 'Stamp / ring: first number. Timer: seconds on the clock.' },
    { name: 'running', type: 'boolean', default: 'true', description: 'Stamp / ring: plays when it turns true. Timer: pause / resume. Change `key` to restart.' },
    { name: 'onDone', type: '() => void', description: 'Stamp / ring: fired on GO!. Timer: fired at 0.' },
    { name: 'onTick', type: '(secondsLeft: number) => void', description: 'Timer: whole seconds left, on change.' },
    { name: 'goText', type: 'string', default: "'GO!'", description: 'Stamp / ring: the last word.' },
    { name: 'goSfx', type: 'string | false', default: "'ドン!'", description: 'Stamp / ring: canvas lettering thrown with GO! (cel / manga).' },
    { name: 'readyText', type: 'string | false', default: "'Ready?'", description: 'Stamp / ring: shown on the panel before the first run.' },
    { name: 'endText', type: 'string | false', default: "'Time up!'", description: 'Timer: stamped at zero.' },
    { name: 'step', type: 'number', default: '900', description: 'Stamp / ring: ms per number (one ring sweep).' },
    { name: 'panicAt', type: 'number', default: '10', description: 'Timer: seconds left when the pop colour, pulse and shake start.' },
    { name: 'label', type: 'string', default: "'Countdown' / 'Time left'", description: 'Accessible name. Numbers are announced politely; the timer has role="timer".' },
  ],
} satisfies DocEntry
