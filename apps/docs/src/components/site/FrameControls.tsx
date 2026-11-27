import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import type { ReactNode } from 'react'
import { FrameStage } from '@/components/ui/frame-stage'
import { ToggleGroup } from '@/components/ui/toggle-group'

const FRAME_PRESETS = {
  '16:9': [1920, 1080],
  '9:16': [1080, 1920],
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
} as const
type Preset = keyof typeof FRAME_PRESETS | 'custom'

function Size({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="grid min-w-[140px] flex-1 gap-0.5">
      <span className="text-xs font-bold text-mute">{label}</span>
      <Slider label={label} min={320} max={2160} step={10} value={value} onChange={onChange} format={(v) => `${v}px`} ticks={false} maxSfx={false} minSfx={false} className="w-full" />
    </div>
  )
}

/**
 * Docs control for video-style motion: pick a frame (16:9, 9:16, 1:1, 4:5) or set any width and
 * height, and the demo renders at that resolution inside a FrameStage, scaled to fit.
 */
export function FrameControls({ initial = '16:9', maxHeight, children }: { initial?: keyof typeof FRAME_PRESETS; maxHeight?: string; children: (size: { width: number; height: number }) => ReactNode }) {
  const [preset, setPreset] = useState<Preset>(initial)
  const [custom, setCustom] = useState<[number, number]>([...FRAME_PRESETS[initial]])
  const [width, height] = preset === 'custom' ? custom : FRAME_PRESETS[preset]
  return (
    <div className="grid w-full gap-4">
      <FrameStage width={width} height={height} maxHeight={maxHeight} frameClassName="ui-r">
        {children({ width, height })}
      </FrameStage>
      <div className="flex flex-wrap items-end justify-center gap-x-5 gap-y-3">
        <ToggleGroup
          label="Frame"
          size="sm"
          sfx={false}
          value={preset}
          onValueChange={(v) => {
            if (v === 'custom') setCustom([width, height])
            setPreset(v as Preset)
          }}
          items={[...Object.keys(FRAME_PRESETS).map((k) => ({ value: k, label: k })), { value: 'custom', label: 'W × H' }]}
        />
        {preset === 'custom' && (
          <div className="flex w-full max-w-[420px] flex-wrap gap-4">
            <Size label="Width" value={custom[0]} onChange={(n) => setCustom([n, custom[1]])} />
            <Size label="Height" value={custom[1]} onChange={(n) => setCustom([custom[0], n])} />
          </div>
        )}
      </div>
    </div>
  )
}
