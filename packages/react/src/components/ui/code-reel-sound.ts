/**
 * Tiny synthesized sounds for CodeReel: soft key clicks, an accept pop, a low error blip, a
 * two-note "ok" and a terminal tick. Everything is generated with the Web Audio API (no files).
 * Browsers only start audio after a user gesture, so sounds stay silent until the page has
 * been clicked or tapped once.
 */

export type ReelSound = 'key' | 'accept' | 'error' | 'warn' | 'ok' | 'info' | 'tick'

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.04), ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

function tone(c: AudioContext, out: AudioNode, type: OscillatorType, from: number, to: number, at: number, len: number, vol: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(from, at)
  o.frequency.exponentialRampToValueAtTime(to, at + len)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  o.connect(g).connect(out)
  o.start(at)
  o.stop(at + len + 0.02)
}

/** Play one sound at `volume` (0..1). Safe to call every frame: keys are rate-limited. */
let lastKey = 0
export function playReelSound(kind: ReelSound, volume = 0.5) {
  const c = audio()
  if (!c || c.state !== 'running' || volume <= 0) return
  const now = c.currentTime
  const out = c.createGain()
  out.gain.value = volume
  out.connect(c.destination)
  if (kind === 'key') {
    if (now - lastKey < 0.035) return
    lastKey = now
    const src = c.createBufferSource()
    src.buffer = noise
    src.playbackRate.value = 0.8 + Math.random() * 0.5
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800 + Math.random() * 1600
    bp.Q.value = 1.4
    const g = c.createGain()
    g.gain.value = 0.55
    src.connect(bp).connect(g).connect(out)
    src.start(now)
    tone(c, out, 'sine', 140, 90, now, 0.03, 0.12)
  } else if (kind === 'accept') {
    tone(c, out, 'sine', 880, 1320, now, 0.08, 0.18)
    tone(c, out, 'triangle', 1320, 1760, now + 0.05, 0.08, 0.1)
  } else if (kind === 'error') {
    tone(c, out, 'square', 196, 160, now, 0.16, 0.08)
    tone(c, out, 'square', 147, 120, now + 0.09, 0.18, 0.07)
  } else if (kind === 'warn') {
    tone(c, out, 'triangle', 440, 392, now, 0.14, 0.14)
  } else if (kind === 'ok' || kind === 'info') {
    tone(c, out, 'sine', kind === 'ok' ? 660 : 587, kind === 'ok' ? 662 : 589, now, 0.12, 0.16)
    tone(c, out, 'sine', kind === 'ok' ? 990 : 784, kind === 'ok' ? 992 : 786, now + 0.08, 0.2, 0.14)
  } else {
    tone(c, out, 'sine', 1200, 900, now, 0.04, 0.08)
  }
}

/** Unlock audio from a click or key handler (call it in the gesture itself). */
export function unlockReelSound() {
  audio()
}
