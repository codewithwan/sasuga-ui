/**
 * An original 9-bar loop ("Night Run", A minor, 100 BPM) composed for the docs and rendered in
 * the browser with an OfflineAudioContext, then encoded as a WAV so it plays through a real
 * <audio> element. No samples, no files: drums, bass, arpeggio and lead are all oscillators and
 * noise, so there is nothing to license.
 */

export const BPM = 100
export const BEAT = 60 / BPM
export const BAR = BEAT * 4
export const BARS = 9

const midi = (m: number) => 440 * 2 ** ((m - 69) / 12)

// Am, F, C, G twice, then Am to land on
const ROOTS = [45, 41, 48, 43, 45, 41, 48, 43, 45]
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [60, 64, 67],
  [55, 59, 62],
]
// the lead enters on bar 4: [beat, note, length in beats]
const LEAD: [number, number, number][][] = [
  [],
  [],
  [],
  [],
  [
    [0, 76, 1],
    [1, 74, 0.5],
    [1.5, 72, 0.5],
    [2, 69, 1.5],
  ],
  [
    [0, 72, 1],
    [1, 74, 1],
    [2, 76, 0.5],
    [2.5, 77, 1.5],
  ],
  [
    [0, 79, 1],
    [1, 76, 1],
    [2, 74, 0.5],
    [2.5, 72, 1.5],
  ],
  [
    [0, 74, 1],
    [1, 71, 1],
    [2, 67, 2],
  ],
  [[0, 69, 3]],
]

function noiseBuffer(c: BaseAudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.round(c.sampleRate * seconds), c.sampleRate)
  const d = b.getChannelData(0)
  let s = 7
  for (let i = 0; i < d.length; i++) {
    s = (s * 16807) % 2147483647
    d[i] = (s / 2147483647) * 2 - 1
  }
  return b
}

function env(g: GainNode, at: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
}

function render(c: OfflineAudioContext) {
  const master = c.createGain()
  master.gain.value = 0.7
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 3
  master.connect(comp).connect(c.destination)
  const noise = noiseBuffer(c, 0.5)

  // a small echo for the lead
  const delay = c.createDelay(1)
  delay.delayTime.value = BEAT * 0.75
  const fb = c.createGain()
  fb.gain.value = 0.3
  const wet = c.createGain()
  wet.gain.value = 0.25
  delay.connect(fb).connect(delay)
  delay.connect(wet).connect(master)

  const osc = (type: OscillatorType, f: number, at: number, len: number, peak: number, out: AudioNode, cutoff = 0, attack = 0.005) => {
    const o = c.createOscillator()
    o.type = type
    o.frequency.value = f
    const g = c.createGain()
    env(g, at, peak, attack, len)
    let node: AudioNode = o
    if (cutoff) {
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = cutoff
      node = node.connect(lp)
    }
    node.connect(g).connect(out)
    o.start(at)
    o.stop(at + attack + len + 0.05)
  }
  const hit = (at: number, hp: number, len: number, peak: number) => {
    const s = c.createBufferSource()
    s.buffer = noise
    const f = c.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = hp
    const g = c.createGain()
    env(g, at, peak, 0.002, len)
    s.connect(f).connect(g).connect(master)
    s.start(at)
    s.stop(at + len + 0.05)
  }
  const kick = (at: number) => {
    const o = c.createOscillator()
    o.frequency.setValueAtTime(150, at)
    o.frequency.exponentialRampToValueAtTime(45, at + 0.13)
    const g = c.createGain()
    env(g, at, 0.95, 0.003, 0.32)
    o.connect(g).connect(master)
    o.start(at)
    o.stop(at + 0.4)
  }

  for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * BAR
    const last = bar === BARS - 1
    const chord = CHORDS[bar % 4]
    const full = bar >= 2 && !last

    // drums: hats from the top, kick and snare from bar 2
    for (let e = 0; e < 8; e++) {
      const at = t0 + e * (BEAT / 2)
      if (!last) hit(at, 7000, e === 7 ? 0.18 : 0.045, e % 2 ? 0.12 : 0.18)
      if (full && (e === 0 || e === 4 || e === 5)) kick(at)
      if (full && (e === 2 || e === 6)) {
        hit(at, 1400, 0.16, 0.45)
        osc('triangle', 190, at, 0.08, 0.25, master)
      }
    }
    if (last) kick(t0)

    // bass: root on eighths, octave on the offbeats
    for (let e = 0; e < (last ? 1 : 8); e++) {
      const note = ROOTS[bar] + (e % 4 === 3 ? 12 : 0)
      osc('triangle', midi(note), t0 + e * (BEAT / 2), last ? BAR * 0.9 : BEAT * 0.42, 0.42, master, 600)
    }

    // arpeggio over the chord
    const arp = [0, 1, 2, 1, 0, 2, 1, 2]
    for (let e = 0; e < (last ? 3 : 8); e++) {
      const note = chord[arp[e]] + (e >= 4 && bar % 2 ? 12 : 0)
      osc('square', midi(note), t0 + e * (BEAT / 2), BEAT * 0.4, 0.05, master, 2200)
    }
    // a soft pad
    for (const n of chord) osc('sawtooth', midi(n - 12), t0, BAR * 0.95, 0.025, master, 900, 0.3)

    // lead, into the echo too
    for (const [b, n, len] of LEAD[bar]) {
      const at = t0 + b * BEAT
      const g = c.createGain()
      g.gain.value = 1
      g.connect(master)
      g.connect(delay)
      osc('sawtooth', midi(n), at, len * BEAT * 0.9, 0.09, g, 1800, 0.01)
    }
  }
}

function wav(buffer: AudioBuffer): Blob {
  const data = buffer.getChannelData(0)
  const bytes = new DataView(new ArrayBuffer(44 + data.length * 2))
  const str = (o: number, s: string) => [...s].forEach((ch, i) => bytes.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF')
  bytes.setUint32(4, 36 + data.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  bytes.setUint32(16, 16, true)
  bytes.setUint16(20, 1, true)
  bytes.setUint16(22, 1, true)
  bytes.setUint32(24, buffer.sampleRate, true)
  bytes.setUint32(28, buffer.sampleRate * 2, true)
  bytes.setUint16(32, 2, true)
  bytes.setUint16(34, 16, true)
  str(36, 'data')
  bytes.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) bytes.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true)
  return new Blob([bytes], { type: 'audio/wav' })
}

let cached: Promise<string> | null = null

/** Renders the track once and returns an object URL for an <audio> element. */
export function trackUrl(): Promise<string> {
  cached ??= (async () => {
    const rate = 44100
    const c = new OfflineAudioContext(1, Math.ceil(rate * (BARS * BAR + 1)), rate)
    render(c)
    return URL.createObjectURL(wav(await c.startRendering()))
  })()
  return cached
}
