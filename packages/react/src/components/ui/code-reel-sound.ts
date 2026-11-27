/**
 * Sample playback for CodeReel: keystrokes, the Enter key, and optional cues for autocomplete,
 * diagnostics and terminal logs, from audio files you provide (`sounds` prop). Files are fetched and decoded once, then played
 * through the Web Audio API so rapid key clicks overlap cleanly. Browsers only start audio after
 * a user gesture, so sounds stay silent until the page has been clicked or tapped once.
 *
 * The docs use real mechanical keyboard recordings, all CC0: single keys on a Cherry KC 1000 from
 * "Keyboard Soundpack 1" by unicaegames (OpenGameArt) and an Enter key by alpinemesh (Freesound).
 */

export type ReelSound = 'key' | 'enter' | 'accept' | 'error' | 'warn' | 'ok' | 'info' | 'tick'

/** A URL per event. `key` can list several files (one is picked at random per keystroke). `enter` plays when a new line starts; `accept` falls back to `enter`, `info` to `tick`. Events without a file stay silent. */
export type CodeReelSounds = Partial<Record<Exclude<ReelSound, 'key'>, string>> & { key?: string | string[] }

let ctx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer | null>()
const loading = new Map<string, Promise<void>>()

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

function load(url: string) {
  const c = audio()
  if (!c || buffers.has(url) || loading.has(url)) return
  loading.set(
    url,
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => c.decodeAudioData(data))
      .then(
        (b) => void buffers.set(url, b),
        () => void buffers.set(url, null),
      )
      .finally(() => loading.delete(url)),
  )
}

const urlsOf = (set: CodeReelSounds) => Object.values(set).flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []))

/** Fetch and decode a sound set ahead of time (CodeReel does this when sound turns on). */
export function preloadReelSounds(set: CodeReelSounds) {
  urlsOf(set).forEach(load)
}

let lastKey = 0
/** Play one event at `volume` (0..1). Key clicks are rate-limited and slightly detuned so fast typing never sounds like a machine gun. */
export function playReelSound(kind: ReelSound, volume: number, set: CodeReelSounds) {
  const c = audio()
  if (!c || c.state !== 'running' || volume <= 0) return
  const pick = kind === 'key' ? set.key : kind === 'info' ? (set.info ?? set.tick) : kind === 'accept' ? (set.accept ?? set.enter) : set[kind]
  const list = Array.isArray(pick) ? pick : pick ? [pick] : []
  if (!list.length) return
  const url = list[Math.floor(Math.random() * list.length)]
  const buffer = buffers.get(url)
  if (!buffer) return load(url)
  const now = c.currentTime
  if (kind === 'key') {
    if (now - lastKey < 0.04) return
    lastKey = now
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  // real keys barely vary: a few percent of pitch keeps repeats from sounding identical
  if (kind === 'key') src.playbackRate.value = 0.96 + Math.random() * 0.08
  const g = c.createGain()
  g.gain.value = volume * (kind === 'key' ? 0.7 : 0.8)
  src.connect(g).connect(c.destination)
  src.start(now)
}

/** Unlock audio from a click or key handler (call it in the gesture itself). */
export function unlockReelSound() {
  audio()
}
