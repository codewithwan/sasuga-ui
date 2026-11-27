import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Countdown } from '@/components/ui/countdown'
import { Icon } from '@/components/ui/icon'
import { Progress } from '@/components/ui/progress'
import { QuestLog } from '@/components/ui/quest-log'
import type { QuestGroup } from '@/components/ui/quest-log'
import { RadioGroup } from '@/components/ui/radio-group'
import { useAchievement } from '@/components/ui/use-achievement'
import { useToast } from '@/components/ui/use-toast'
import { XRay } from '../xray'
import { Sample, WindowFrame } from './sample'
import type { Part } from './sample'

const PARTS: Part[] = [
  { name: 'QuestLog', slug: 'quest-log' },
  { name: 'Progress', slug: 'progress' },
  { name: 'RadioGroup', slug: 'radio-group' },
  { name: 'Checkbox', slug: 'checkbox' },
  { name: 'Countdown', slug: 'countdown' },
  { name: 'Achievement', slug: 'achievement' },
]

const QUIZ = [
  { q: 'Which kana reads "ka"?', options: ['か', 'さ', 'た', 'な'], answer: 'か' },
  { q: 'Which one is "ki"?', options: ['け', 'き', 'こ', 'く'], answer: 'き' },
  { q: 'And "ku"?', options: ['こ', 'け', 'く', 'き'], answer: 'く' },
]

export function Learn() {
  const toast = useToast()
  const { unlock } = useAchievement()
  const [step, setStep] = useState(0)
  const [pick, setPick] = useState<string | undefined>()
  const [remind, setRemind] = useState(false)
  const [started, setStarted] = useState(false)
  const cleared = useRef(false)

  const answered = Math.min(step, QUIZ.length)
  const doneQuiz = answered >= QUIZ.length
  // the warm-up (intro + tracing) is already done: 2 of 4 steps
  const progress = Math.round(((2 + answered / QUIZ.length + (remind ? 1 : 0)) / 4) * 100)
  const q = QUIZ[Math.min(step, QUIZ.length - 1)]

  useEffect(() => {
    if (progress < 100 || cleared.current) return
    cleared.current = true
    unlock({ title: 'Day 3 cleared', description: 'The か row is yours. 3-day streak!', points: 30, next: { label: 'Streak', value: 3, max: 7 } })
  }, [progress, unlock])

  const groups: QuestGroup[] = [
    {
      id: 'today',
      title: 'Today',
      quests: [
        { id: 'quiz', title: 'Quick quiz', reward: '20 XP', objectives: [{ id: 'answers', label: 'Answer 3 questions', current: answered, target: QUIZ.length }] },
        { id: 'streak', title: 'Keep the streak', reward: '5 XP', objectives: [{ id: 'remind', label: 'Set a reminder', done: remind }] },
      ],
    },
  ]

  const check = () => {
    if (!pick) return toast('Pick an answer first', { sfx: false })
    if (pick === q.answer) {
      setStep((s) => s + 1)
      setPick(undefined)
    } else {
      toast(`Not quite: ${q.answer} is the one`, { variant: 'danger', sfx: false })
    }
  }

  return (
    <Sample
      id="uc-learn"
      kind="Learning app"
      icon="book"
      title="Onboarding that cheers you on"
      caption="Answer the quiz and set a reminder: the checklist ticks off, the bar fills and the day clears with a trophy."
      parts={PARTS}
    >
      <WindowFrame url="kanaquest.app/day-3">
        <div className="flex items-center gap-4 px-3 pt-3 @md:px-4">
          <div className="grid min-w-0 flex-1 gap-3">
            <div className="grid gap-1">
              <p className="m-0 text-[12px] leading-none font-bold text-mute">Day 3 of 7 · warm-up done</p>
              <h4 className="ui-head m-0 text-[20px] leading-tight text-ink">The か row</h4>
            </div>
            <XRay name="Progress" slug="progress">
              <Progress label="Today's lesson" value={progress} showValue doneLabel="Cleared!" />
            </XRay>
          </div>
          <XRay name="Countdown" slug="countdown" at="top-right" className="relative size-[92px] shrink-0">
            <div className="absolute top-0 left-0 origin-top-left scale-50">
              <Countdown variant="timer" from={90} running={started && !doneQuiz} panicAt={15} endText="Time up!" label="Quiz timer" />
            </div>
          </XRay>
        </div>

        <div className="grid gap-4 p-3 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @md:p-4">
          <section aria-label="Quiz" className="ui-r ui-border-thin grid content-start gap-3 bg-canvas p-3">
            <p className="m-0 grid gap-1 text-[12px] leading-none font-bold text-mute">
              <span>
                Question {answered + (doneQuiz ? 0 : 1)} of {QUIZ.length}
              </span>
              <span className="font-semibold">{started ? 'The clock is running' : 'The timer starts on your first pick'}</span>
            </p>
            {doneQuiz ? (
              <p className="ui-head m-0 flex items-center gap-2 py-6 text-[18px] text-ink">
                <Icon name="trophy" size={28} /> Quiz done, 3 / 3!
              </p>
            ) : (
              <>
                <p className="ui-head m-0 text-[17px] leading-tight text-ink">{q.q}</p>
                <XRay name="RadioGroup" slug="radio-group">
                  <RadioGroup
                    label={q.q}
                    options={q.options.map((o) => ({ value: o, label: <span className="text-[20px] leading-none">{o}</span> }))}
                    value={pick ?? ''}
                    onValueChange={(v) => {
                      setPick(v)
                      setStarted(true)
                    }}
                    sfx={false}
                  />
                </XRay>
                <Button size="sm" variant="accent" sfx="正解!" onClick={check} className="justify-self-start" iconEnd={<Icon name="arrow-right" tone="line" size={16} />}>
                  Check
                </Button>
              </>
            )}
          </section>

          <div className="grid content-start gap-3">
            <XRay name="QuestLog" slug="quest-log">
              <QuestLog groups={groups} clearText="CLEAR!" className="w-full" />
            </XRay>
            <XRay name="Checkbox" slug="checkbox" className="w-fit">
              <Checkbox
                checked={remind}
                onChange={(v) => {
                  setRemind(v)
                  if (v) toast('Reminder set for 8:00 pm', { sfx: false })
                }}
                sfx="OK!"
              >
                Remind me at 8 pm
              </Checkbox>
            </XRay>
          </div>
        </div>
      </WindowFrame>
    </Sample>
  )
}
