import { useRef, useState } from 'react'
import { Mascot } from '@/components/art/mascot'
import type { MascotExpression } from '@/components/art/mascot'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GachaWheel } from '@/components/ui/gacha-spin'
import type { GachaSegment } from '@/components/ui/gacha-spin'
import { Icon } from '@/components/ui/icon'
import { Rating } from '@/components/ui/rating'
import { Select } from '@/components/ui/select'
import { Stepper } from '@/components/ui/stepper'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { useToast } from '@/components/ui/use-toast'
import { XRay } from '../xray'
import { Sample, WindowFrame } from './sample'
import type { Part } from './sample'

const PARTS: Part[] = [
  { name: 'Card', slug: 'card' },
  { name: 'Select', slug: 'select' },
  { name: 'Stepper', slug: 'stepper' },
  { name: 'Rating', slug: 'rating' },
  { name: 'ToggleGroup', slug: 'toggle-group' },
  { name: 'GachaWheel', slug: 'gacha-spin' },
  { name: 'Button', slug: 'button' },
  { name: 'Toast', slug: 'toast' },
]

const PRICE = 48
const SIZES = [
  { value: 'S', label: 'Small', hint: 'Chest 96 cm' },
  { value: 'M', label: 'Medium', hint: 'Chest 104 cm' },
  { value: 'L', label: 'Large', hint: 'Chest 112 cm' },
  { value: 'XL', label: 'Extra large', hint: 'Chest 120 cm' },
]
const COLOURS = [
  { value: 'cream', label: 'Cream', fill: undefined },
  { value: 'lilac', label: 'Haze', fill: 'var(--color-accent-soft)' },
  { value: 'pop', label: 'Pop', fill: 'var(--color-pop)' },
]
const COUPONS: (GachaSegment & { off: number })[] = [
  { label: '5%', off: 5, rarity: 'N', weight: 4 },
  { label: '10%', off: 10, rarity: 'R', weight: 3 },
  { label: '5%', off: 5, rarity: 'N', weight: 4 },
  { label: '15%', off: 15, rarity: 'SR', weight: 2 },
  { label: '5%', off: 5, rarity: 'N', weight: 4 },
  { label: '25%', off: 25, rarity: 'SSR', weight: 1 },
]

const money = (n: number) => `$${n.toFixed(2)}`

export function Shop() {
  const toast = useToast()
  const [size, setSize] = useState('M')
  const [qty, setQty] = useState(1)
  const [colour, setColour] = useState('cream')
  const [cart, setCart] = useState(2)
  const [off, setOff] = useState(0)
  const [face, setFace] = useState<MascotExpression>('neutral')
  const faceTimer = useRef(0)
  const fill = COLOURS.find((c) => c.value === colour)?.fill
  const price = PRICE * (1 - off / 100)

  const react = (e: MascotExpression) => {
    setFace(e)
    window.clearTimeout(faceTimer.current)
    faceTimer.current = window.setTimeout(() => setFace('neutral'), 1400)
  }

  return (
    <Sample
      id="uc-shop"
      kind="Shop"
      icon="coin"
      title="A product page with a little sparkle"
      caption="Pick a colour and size, add it to the cart, then spin the wheel once for a coupon."
      parts={PARTS}
    >
      <WindowFrame url="mochisupply.co/p/cloud-hoodie">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 @md:px-4">
          <span className="ui-head text-[16px] leading-none text-ink">Mochi Supply</span>
          <span className="flex items-center gap-2 text-[13px] font-bold text-mute">
            <Icon name="chest" size={20} />
            Cart
            <Badge variant="accent" count={cart} />
          </span>
        </div>
        <div className="ui-divider" />

        <div className="grid gap-4 p-3 @md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @md:p-4">
          <div className="grid content-start gap-3">
            <XRay name="Card" slug="card">
              <Card interactive>
                <span className="absolute top-3 left-3 z-10">
                  <Badge variant="pop">NEW</Badge>
                </span>
                <Mascot expression={face} outfit={fill} label="Koma modelling the Cloud Hoodie" className="mx-auto -mb-7 block h-auto w-[min(100%,170px)]" />
              </Card>
            </XRay>
            <XRay name="ToggleGroup" slug="toggle-group">
              <ToggleGroup
                label="Colour"
                size="sm"
                items={COLOURS.map((c) => ({ value: c.value, label: c.label }))}
                value={colour}
                onValueChange={(v) => {
                  setColour(v)
                  react('happy')
                }}
                sfx={false}
              />
            </XRay>
          </div>

          <div className="grid content-start gap-3.5">
            <div className="grid gap-1.5">
              <h4 className="ui-head m-0 text-[21px] leading-tight text-ink">Cloud Hoodie</h4>
              <XRay name="Rating" slug="rating" className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Rating label="Rate the Cloud Hoodie" defaultValue={4} />
                <span className="text-[13px] font-semibold text-mute">4.0 · 128 reviews</span>
              </XRay>
              <p className="m-0 flex items-baseline gap-2">
                <span className="ui-head text-[24px] leading-none text-ink">{money(price)}</span>
                {off > 0 && <span className="text-[14px] font-semibold text-mute line-through">{money(PRICE)}</span>}
                {off > 0 && <Badge variant="accent">-{off}%</Badge>}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <XRay name="Select" slug="select" className="min-w-[150px] flex-1">
                <Select label="Size" options={SIZES} value={size} onValueChange={setSize} sfx={false} />
              </XRay>
              <XRay name="Stepper" slug="stepper" at="top-right" className="shrink-0">
                <Stepper label="Qty" value={qty} onValueChange={setQty} min={1} max={9} />
              </XRay>
            </div>
            <XRay name="Button" slug="button" className="justify-self-start">
              <Button
                variant="accent"
                sfx="カート!"
                icon={<Icon name="plus" tone="line" size={18} />}
                onClick={() => {
                  setCart((c) => c + qty)
                  react('wink')
                  toast(`Added ${qty} × Cloud Hoodie (${size}) to your cart`, { variant: 'success', sfx: false })
                }}
              >
                Add to cart
              </Button>
            </XRay>
          </div>
        </div>

        <div className="ui-border-t mt-auto flex items-center gap-4 bg-canvas px-3 py-3 @md:px-4">
          <XRay name="GachaWheel" slug="gacha-spin" className="shrink-0">
            <GachaWheel
              label="Coupon wheel"
              segments={COUPONS}
              size={132}
              duration={2.6}
              spinLabel="Spin"
              onResult={(i) => {
                const pct = COUPONS[i]?.off ?? 5
                setOff((o) => Math.max(o, pct))
                react(pct >= 15 ? 'surprised' : 'happy')
                toast(`Coupon ${pct}% off applied`, { sfx: pct >= 25 ? '大当たり!' : false })
              }}
            />
          </XRay>
          <div className="grid gap-1">
            <p className="ui-head m-0 text-[16px] leading-tight text-ink">Daily spin</p>
            <p className="m-0 text-[13px] leading-snug text-mute">One push, one coupon. The best one you land stays on the price.</p>
          </div>
        </div>
      </WindowFrame>
    </Sample>
  )
}
