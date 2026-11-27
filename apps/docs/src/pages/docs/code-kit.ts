// Shared pieces of the code snippet cards (CodeBlock, InstallSnippet):
// the theme-token colour scheme, a tiny tokenizer, clipboard and scroll-edge helpers.
import { useCallback, useLayoutEffect, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'

/* The code surface is a deep ink-tinted panel in both modes. Only the two base colours
   depend on the mode (light: ink is dark, so mix from ink; dark: ink is light, so mix from
   canvas). Everything else is derived from them plus the theme's accent and pop. */
export const CODE_SURFACE =
  '[--code-bg:color-mix(in_oklab,var(--color-ink)_90%,var(--color-accent))] [--code-fg:color-mix(in_oklab,var(--color-paper)_90%,var(--color-accent-soft))] [[data-mode=dark]_&]:[--code-bg:color-mix(in_oklab,var(--color-canvas)_88%,var(--color-accent))] [[data-mode=dark]_&]:[--code-fg:var(--color-ink)]'

export const CODE_VARS = {
  '--code-mute': 'color-mix(in oklab, var(--code-fg) 50%, var(--code-bg))',
  '--code-punc': 'color-mix(in oklab, var(--code-fg) 66%, var(--code-bg))',
  '--code-kw': 'color-mix(in oklab, var(--color-accent) 58%, var(--code-fg))',
  '--code-type': 'color-mix(in oklab, color-mix(in oklab, var(--color-accent), var(--color-pop)) 46%, var(--code-fg))',
  '--code-str': 'color-mix(in oklab, var(--color-pop) 60%, var(--code-fg))',
  '--code-num': 'color-mix(in oklab, var(--color-pop) 38%, var(--code-fg))',
  '--code-attr': 'color-mix(in oklab, var(--color-accent) 32%, var(--code-fg))',
  '--code-fn': 'color-mix(in oklab, var(--color-accent) 18%, var(--code-fg))',
} as CSSProperties

export type TokenKind = 'com' | 'str' | 'kw' | 'type' | 'tag' | 'attr' | 'num' | 'fn' | 'punc' | 'cmd' | 'flag'
export type Token = { text: string; kind?: TokenKind }

export const TOKEN_CLASS: Record<TokenKind, string> = {
  com: 'italic text-(color:--code-mute)',
  str: 'text-(color:--code-str)',
  kw: 'font-bold text-(color:--code-kw)',
  type: 'text-(color:--code-type)',
  tag: 'font-bold text-(color:--code-type)',
  attr: 'text-(color:--code-attr)',
  num: 'text-(color:--code-num)',
  fn: 'text-(color:--code-fn)',
  punc: 'text-(color:--code-punc)',
  cmd: 'font-bold text-(color:--code-kw)',
  flag: 'text-(color:--code-attr)',
}

const KEYWORDS = new Set(
  'import from export default const let var function return type interface extends implements new await async if else for of in while true false null undefined as typeof keyof void this class'.split(
    ' ',
  ),
)
const COMMANDS = new Set(['npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'bun', 'bunx'])

/* comments | strings | tag open | flags & css vars | at-rules | numbers | words | punctuation */
const RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<!\S)#(?=\s)[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(<\/?)([A-Za-z][\w.:-]*)|((?<![\w-])--?[A-Za-z][\w-]*)|(@[\w-]+)|(\b\d+(?:\.\d+)?(?:px|em|rem|ms|s|%)?\b)|([A-Za-z_$][\w$]*(?:-[\w$]+)*)|([{}()[\];,.:=<>/+*?!&|-])/g

/** Splits code into coloured tokens. Small on purpose: good enough for docs snippets. */
export function tokenize(code: string): Token[] {
  const out: Token[] = []
  let at = 0
  const push = (text: string, kind?: TokenKind) => {
    if (!text) return
    const prev = out[out.length - 1]
    if (prev && prev.kind === kind) prev.text += text
    else out.push({ text, kind })
  }
  for (const m of code.matchAll(RE)) {
    const i = m.index ?? 0
    push(code.slice(at, i))
    at = i + m[0].length
    const next = code[at]
    if (m[1]) push(m[1], 'com')
    else if (m[2]) push(m[2], next === ':' && m[2][0] === '"' ? 'attr' : 'str')
    else if (m[3]) {
      push(m[3], 'punc')
      push(m[4], 'tag')
    } else if (m[5]) push(m[5], 'flag')
    else if (m[6]) push(m[6], 'kw')
    else if (m[7]) push(m[7], 'num')
    else if (m[8]) {
      const w = m[8]
      if (COMMANDS.has(w)) push(w, 'cmd')
      else if (KEYWORDS.has(w)) push(w, 'kw')
      else if (next === '(') push(w, 'fn')
      else if (next === '=' && code[at + 1] !== '=' && code[at + 1] !== '>') push(w, 'attr')
      else if (/^[A-Z]/.test(w)) push(w, 'type')
      else push(w)
    } else push(m[9], 'punc')
  }
  push(code.slice(at))
  return out
}

/** Tokens split into lines (a token spanning lines is cut at each newline). */
export function toLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]]
  for (const t of tokens) {
    const parts = t.text.split('\n')
    parts.forEach((p, i) => {
      if (i > 0) lines.push([])
      if (p) lines[lines.length - 1].push({ text: p, kind: t.kind })
    })
  }
  return lines
}

const EXT_LANG: Record<string, string> = { ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx', css: 'css', html: 'html', json: 'json', sh: 'bash' }

/** A best guess at the language label, from a file name or the code itself. */
export function guessLang(code: string, file?: string) {
  const ext = file?.split('.').pop()?.toLowerCase()
  if (ext && EXT_LANG[ext]) return EXT_LANG[ext]
  const s = code.trimStart()
  if (/^(npm|npx|pnpm|yarn|bun|bunx)\s/.test(s)) return 'bash'
  if (/^<(!doctype|html|link|head|meta|script)\b/i.test(s)) return 'html'
  if (/^[{[]\s*"/.test(s) || /^"[\w@/*-]+":/.test(s)) return 'json'
  if (/(^|\n)\s*(@import|@theme|@utility|:root|\[data-[\w-]+=)/.test(s)) return 'css'
  if (/(^|\n)\s*(import|export|const|function|type)\s/.test(s) || /<[A-Z]\w*[\s/>]/.test(s)) return /<[A-Za-z]/.test(s) ? 'tsx' : 'ts'
  return 'text'
}

/** Languages that read better with line numbers (file trees and commands do not). */
export const NUMBERED = new Set(['ts', 'tsx', 'js', 'jsx', 'css', 'html', 'json'])

/** Copies text, falling back to a hidden textarea where the async clipboard is missing. */
export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  ta.remove()
  if (!ok) throw new Error('copy failed')
}

/** Whether a horizontal scroller has more content to its left / right (for the fade edges). */
export function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ left: false, right: false })
  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const left = el.scrollLeft > 1
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }))
  }, [ref])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [ref, update])
  return { edges, update }
}
