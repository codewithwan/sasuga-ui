import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

type PlayGateProps = {
  /** Gets the run count: 0 = idle (render the calm, static version), 1+ = played (key on it to replay). */
  children: (run: number) => ReactNode
  label?: string
  replay?: string
  className?: string
}

/**
 * Keeps a docs preview calm until someone asks for the show: nothing fires on mount
 * or on scroll-into-view; the button plays it, and plays it again.
 */
export function PlayGate({ children, label = 'Play', replay = 'Replay', className }: PlayGateProps) {
  const [run, setRun] = useState(0)
  return (
    <div className={cn('grid w-full justify-items-center gap-5', className)}>
      {children(run)}
      <Button size="sm" variant={run ? 'paper' : 'accent'} sfx={false} icon={<Icon name="play" tone="line" size={16} />} onClick={() => setRun((r) => r + 1)}>
        {run ? replay : label}
      </Button>
    </div>
  )
}
