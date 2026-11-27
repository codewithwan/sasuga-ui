/**
 * Caption cues: SRT / WebVTT parsing and per-word timing. Plain TypeScript, no React.
 * Times are in seconds. Text keeps the kit's own `*emphasis*` markup and drops everything else
 * (<i>, <b>, <font>, <c.class>, <v Speaker>, {\an8} and friends).
 */

export type CueWord = { start: number; end: number; text: string }
export type Cue = { start: number; end: number; text: string; words?: CueWord[] }

/** `01:02:03,456` · `02:03.456` · `2:03` → seconds, or NaN. */
function stamp(s: string): number {
  const m = /^\s*(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?\s*$/.exec(s)
  if (!m) return Number.NaN
  const [, h = '0', mm, ss, ms = '0'] = m
  return Number(h) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms.padEnd(3, '0')) / 1000
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
const decode = (s: string) =>
  s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : all
    }
    return ENTITIES[e.toLowerCase()] ?? all
  })

/** Remove styling tags; keep text. `<rt>` (ruby readings) is dropped with its content. */
const clean = (s: string) =>
  decode(
    s
      .replace(/<rt>[\s\S]*?<\/rt>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\{\\[^}]*\}/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()

const INLINE_TS = /<((?:\d+:)?\d{1,2}:\d{1,2}[.,]\d{1,3})>/g

/** Words timed by length across [start, end]. Longer words and words before a pause hold longer. */
function spread(tokens: string[], start: number, end: number): CueWord[] {
  if (!tokens.length) return []
  const weight = tokens.map((w) => w.replace(/[*_]/g, '').length + 1 + (/[,.;:!?…]["')\]]*$/.test(w) ? 2 : 0))
  const total = weight.reduce((a, b) => a + b, 0)
  const span = Math.max(0, end - start)
  let t = start
  return tokens.map((text, i) => {
    const d = (span * weight[i]) / total
    const w = { start: t, end: i === tokens.length - 1 ? end : t + d, text }
    t += d
    return w
  })
}

const tokensOf = (s: string) => s.split(/\s+/).filter(Boolean)

/** WebVTT karaoke timestamps (`Never <00:01.200>gonna <00:01.600>give`) → words. */
function inlineWords(raw: string, start: number, end: number): CueWord[] | undefined {
  if (!INLINE_TS.test(raw)) return undefined
  INLINE_TS.lastIndex = 0
  const marks: { at: number; text: string }[] = []
  let cursor = 0
  let at = start
  for (const m of raw.matchAll(INLINE_TS)) {
    marks.push({ at, text: raw.slice(cursor, m.index) })
    const t = stamp(m[1])
    at = Number.isFinite(t) ? t : at
    cursor = (m.index ?? 0) + m[0].length
  }
  marks.push({ at, text: raw.slice(cursor) })
  const words: CueWord[] = []
  marks.forEach((seg, i) => {
    const segEnd = i + 1 < marks.length ? Math.max(seg.at, marks[i + 1].at) : Math.max(seg.at, end)
    words.push(...spread(tokensOf(clean(seg.text)), seg.at, segEnd))
  })
  return words.length ? words : undefined
}

const ARROW = /((?:\d+:)?\d{1,2}:\d{1,2}(?:[.,]\d{1,3})?)\s*-->\s*((?:\d+:)?\d{1,2}:\d{1,2}(?:[.,]\d{1,3})?)/

/** Shared block parser for SRT and VTT: a block is cue settings / ids, one timing line, then text lines. */
function parseBlocks(src: string): Cue[] {
  const text = src.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const cues: Cue[] = []
  for (const block of text.split(/\n[ \t]*\n/)) {
    const lines = block.split('\n')
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i < 0) continue // WEBVTT header, NOTE, STYLE, REGION, stray numbers
    const m = ARROW.exec(lines[i])
    if (!m) continue
    const start = stamp(m[1])
    const end = stamp(m[2])
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    const raw = lines
      .slice(i + 1)
      .filter((l) => l.trim())
      .join(' ')
    const body = clean(raw)
    if (!body) continue
    const cue: Cue = { start, end: Math.max(start, end), text: body }
    const words = inlineWords(raw, cue.start, cue.end)
    if (words) cue.words = words
    cues.push(cue)
  }
  return cues.sort((a, b) => a.start - b.start)
}

/** SubRip (.srt). Tolerates missing indices, `.` instead of `,`, CRLF, a BOM and styling tags. */
export function parseSRT(src: string): Cue[] {
  return parseBlocks(src)
}

/** WebVTT (.vtt). Skips the header, NOTE / STYLE / REGION blocks and cue ids; reads inline karaoke timestamps into `words`. */
export function parseVTT(src: string): Cue[] {
  return parseBlocks(src)
}

/** SRT or VTT, detected from the WEBVTT header. */
export function parseCaptions(src: string): Cue[] {
  return /^﻿?\s*WEBVTT/.test(src) ? parseVTT(src) : parseSRT(src)
}

/**
 * Per-word timing for a cue: its own `words` when present, otherwise an estimate that shares
 * the cue's time by character length (a word before a comma or full stop holds a little longer).
 */
export function splitWords(cue: Cue): CueWord[] {
  if (cue.words?.length) return cue.words
  return spread(tokensOf(cue.text), cue.start, cue.end)
}
