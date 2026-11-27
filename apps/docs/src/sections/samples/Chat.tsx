import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { SpeechBubble } from '@/components/art/stickers'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HoverCard } from '@/components/ui/hover-card'
import { Icon } from '@/components/ui/icon'
import { Switch } from '@/components/ui/switch'
import { Typewriter } from '@/components/ui/typewriter'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { XRay } from '../xray'
import { PhoneFrame, Sample } from './sample'
import type { Part } from './sample'

const PARTS: Part[] = [
  { name: 'AvatarGroup', slug: 'avatar' },
  { name: 'HoverCard', slug: 'hover-card' },
  { name: 'SpeechBubble', slug: 'stickers' },
  { name: 'Switch', slug: 'switch' },
  { name: 'Typewriter', slug: 'typewriter' },
  { name: 'Button', slug: 'button' },
  { name: 'Toast', slug: 'toast' },
]

type Msg = { id: number; from: 'mina' | 'rook' | 'you'; text?: string; sticker?: string }
const START: Msg[] = [
  { id: 1, from: 'mina', text: 'Raid starts at 9. Bring potions, the boss hits hard.' },
  { id: 2, from: 'rook', text: 'I have 12 Pop Tonics. Happy to share.' },
  { id: 3, from: 'mina', sticker: 'Yay!' },
]
const REPLIES = ['See you there! Saving you the healer spot.', 'Perfect. Rook, you tank this time?', 'Bring snacks too, it is a long one.']
const NAMES = { mina: 'Mina', rook: 'Rook', you: 'You' } as const

function MinaCard() {
  return (
    <div className="grid w-[220px] gap-2.5">
      <div className="flex items-center gap-3">
        <Avatar alt="Mina" size="md" status="online" hop={false} />
        <div className="grid gap-1">
          <p className="ui-head m-0 text-[16px] leading-none text-ink">Mina</p>
          <p className="m-0 text-[12px] font-semibold text-mute">Lv 42 · Healer</p>
        </div>
      </div>
      <p className="m-0 text-[13px] leading-snug text-ink">Raid lead on Thursdays. Never misses a buff.</p>
      <div className="flex gap-1.5">
        <Badge variant="accent">Guild officer</Badge>
        <Badge variant="paper">EU-West</Badge>
      </div>
    </div>
  )
}

export function Chat() {
  const toast = useToast()
  const [msgs, setMsgs] = useState<Msg[]>(START)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [notify, setNotify] = useState(true)
  const list = useRef<HTMLOListElement>(null)
  const timer = useRef(0)
  const nextReply = useRef(0)
  const nextId = useRef(START.length + 1)
  useEffect(() => () => clearTimeout(timer.current), [])

  // keep the newest message in view (scrolls the list only, never the page)
  useLayoutEffect(() => {
    const el = list.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, typing])

  const post = (m: Omit<Msg, 'id'>) => setMsgs((all) => [...all, { ...m, id: nextId.current++ }].slice(-8))

  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    post({ from: 'you', text })
    setDraft('')
    toast('Sent to #raid-night', { sfx: false, duration: 2200 })
    clearTimeout(timer.current)
    setTyping(true)
    timer.current = window.setTimeout(() => {
      setTyping(false)
      post({ from: 'mina', text: REPLIES[nextReply.current++ % REPLIES.length] })
    }, 2200)
  }

  return (
    <Sample
      id="uc-chat"
      kind="Chat app"
      icon="bell"
      title="A party chat that feels alive"
      caption="Hover Mina for her card, mute the channel, send a line and watch her type back."
      parts={PARTS}
    >
      <PhoneFrame>
        <div className="grid gap-2.5 px-3 pt-1 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="grid min-w-0 gap-1">
              <p className="ui-head m-0 truncate text-[17px] leading-none text-ink">#raid-night</p>
              <p className="m-0 text-[11px] leading-none font-semibold text-mute">Moonlit Guild · 5 members</p>
            </div>
            <XRay name="Switch" slug="switch" at="top-right" className="flex shrink-0 items-center gap-1.5">
              <Icon name={notify ? 'bell' : 'mute'} size={18} className="text-mute" />
              <Switch label="Channel notifications" checked={notify} onChange={setNotify} sfxOn={false} sfxOff={false} />
            </XRay>
          </div>
          <div className="flex items-center gap-2.5">
            <XRay name="AvatarGroup" slug="avatar">
              <AvatarGroup size="sm" max={3} aria-label="Members">
                <Avatar alt="Mina" size="sm" status="online" />
                <Avatar alt="Rook" size="sm" />
                <Avatar alt="Koma" size="sm" status="online" />
                <Avatar alt="Ivy" size="sm" />
                <Avatar alt="Teo" size="sm" />
              </AvatarGroup>
            </XRay>
            <p className="m-0 text-[12px] leading-none font-semibold text-mute">3 online now</p>
          </div>
        </div>
        <div className="ui-divider" />

        <ol
          ref={list}
          aria-label="Messages"
          aria-live="polite"
          className="m-0 grid h-[300px] flex-1 list-none content-start gap-3 overflow-y-auto overscroll-contain px-3 pt-4 pb-3"
        >
          {msgs.map((m) => {
            const mine = m.from === 'you'
            return (
              <li key={m.id} className={cn('flex animate-rise items-end gap-2', mine && 'flex-row-reverse')}>
                {!mine && <Avatar alt={NAMES[m.from]} size="sm" hop={false} className="shrink-0 scale-[.8]" />}
                <div className={cn('grid max-w-[78%] gap-1', mine && 'justify-items-end')}>
                  {!mine &&
                    (m.from === 'mina' ? (
                      <HoverCard content={<MinaCard />} side="bottom" align="start">
                        <button
                          type="button"
                          className="w-fit cursor-pointer border-0 bg-transparent p-0 text-[12px] leading-none font-bold text-accent underline decoration-dotted underline-offset-2 focus-visible:ui-focus"
                        >
                          Mina
                        </button>
                      </HoverCard>
                    ) : (
                      <span className="text-[12px] leading-none font-bold text-mute">{NAMES[m.from]}</span>
                    ))}
                  {m.sticker ? (
                    <XRay name="SpeechBubble" slug="stickers">
                      <SpeechBubble tone="accent" tail="left" className="text-[18px]">
                        {m.sticker}
                      </SpeechBubble>
                    </XRay>
                  ) : (
                    <p
                      className={cn(
                        'ui-r m-0 px-3 py-2 text-[14px] leading-snug',
                        mine ? 'ui-fill ui-border-thin bg-accent text-white' : 'ui-border-thin bg-paper text-ink',
                      )}
                    >
                      {m.text}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
          {typing && (
            <li className="flex items-center gap-2 text-[12px] font-semibold text-mute">
              <XRay name="Typewriter" slug="typewriter">
                <Typewriter texts={['Mina is typing…']} speed={45} loop={false} cursor />
              </XRay>
            </li>
          )}
        </ol>

        <form onSubmit={send} className="ui-divider mt-auto flex items-center gap-2 px-3 pt-3 pb-3.5">
          <label className="sr-only" htmlFor="uc-chat-input">
            Message #raid-night
          </label>
          <input
            id="uc-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message #raid-night"
            autoComplete="off"
            className="ui-pill ui-border-thin min-w-0 flex-1 bg-paper px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-mute focus-visible:ui-focus"
          />
          <XRay name="Button" slug="button" at="top-right">
            <Button type="submit" size="icon" variant="accent" aria-label="Send" sfx="送信!" power={0.6}>
              <Icon name="arrow-right" tone="line" size={20} />
            </Button>
          </XRay>
        </form>
      </PhoneFrame>
    </Sample>
  )
}
