import { useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/ui/icon'
import { Tabs } from '@/components/ui/tabs'
import { agentPrompt, rawUrl } from '@/docs/sources'
import type { SourceFile } from '@/docs/sources'
import { site } from '@/data/site'
import { cn } from '@/lib/utils'
import { CodeBlock, CopyButton } from './CodeBlock'
import { InstallSnippet } from './InstallSnippet'

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

function download(file: SourceFile) {
  const url = URL.createObjectURL(new Blob([file.code], { type: 'text/plain' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName(file.path) })
  a.click()
  URL.revokeObjectURL(url)
}

const PILL =
  'ui-head ui-pill ui-border-thin inline-flex cursor-pointer items-center gap-1.5 bg-paper px-3 py-1.5 text-[13px] leading-none text-ink transition-[background-color,color,translate] duration-200 ease-snap hover:-translate-y-px hover:bg-canvas focus-visible:ui-focus'

function Manual({ files }: { files: SourceFile[] }) {
  const [at, setAt] = useState(0)
  const file = files[Math.min(at, files.length - 1)]
  return (
    <div className="grid gap-4">
      <p className="m-0 text-[15px] leading-relaxed text-mute">
        Copy {files.length > 1 ? 'these files' : 'this file'} into the same path in your project. It needs the kit core once (
        <code className="font-mono text-ink">src/index.css</code>, <code className="font-mono text-ink">src/lib/utils.ts</code>,{' '}
        <code className="font-mono text-ink">src/fx/</code>) —{' '}
        <Link to="/docs/installation" className="font-bold text-accent">
          see Installation
        </Link>
        .
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {files.length > 1 &&
          files.map((f, i) => (
            <button
              key={f.path}
              type="button"
              aria-pressed={i === at}
              onClick={() => setAt(i)}
              className={cn(PILL, 'aria-pressed:border-transparent aria-pressed:bg-accent aria-pressed:text-white')}
            >
              {fileName(f.path)}
            </button>
          ))}
        <span className="flex-1" />
        <button type="button" onClick={() => download(file)} className={PILL}>
          <Icon name="arrow-right" size={14} tone="line" className="rotate-90" /> Download {fileName(file.path)}
        </button>
        <a href={rawUrl(file.path)} target="_blank" rel="noreferrer" className={cn(PILL, 'no-underline')}>
          <Icon name="github" size={14} tone="line" /> Raw
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      <CodeBlock key={file.path} code={file.code} title={file.path} />
    </div>
  )
}

function Cli({ slug, files }: { slug: string; files: SourceFile[] }) {
  return (
    <div className="grid gap-4">
      <p className="m-0 text-[15px] leading-relaxed text-mute">
        One command copies {files.length > 1 ? `the ${files.length} files` : 'the file'} into your project and installs what{' '}
        {files.length > 1 ? 'they need' : 'it needs'}. First time? Run <code className="font-mono text-ink">{site.package} init</code> once —{' '}
        <Link to="/docs/installation" className="font-bold text-accent">
          see Installation
        </Link>
        .
      </p>
      <InstallSnippet mode="cli" command={`add ${slug}`} />
    </div>
  )
}

function Agent({ prompt }: { prompt: string }) {
  return (
    <div className="grid gap-4">
      <p className="m-0 text-[15px] leading-relaxed text-mute">
        Using Cursor, Copilot or another coding agent? Paste this prompt — it lists the exact files with raw links, the setup
        and the usage.
      </p>
      <div>
        <CopyButton text={prompt} label="Copy prompt" />
      </div>
      <CodeBlock code={prompt} title="prompt.txt" lang="text" lineNumbers={false} />
    </div>
  )
}

/** "Add it to your project": the CLI command, the full source to copy or download, or a prompt for an AI agent. */
export function AddComponent({ slug, name, usage, files }: { slug: string; name: string; usage: string; files: SourceFile[] | null }) {
  if (!files) return <p className="m-0 text-mute">Loading the source…</p>
  if (!files.length) return null
  const prompt = agentPrompt(
    name,
    slug,
    files.map((f) => f.path),
    usage,
  )
  return (
    <Tabs
      label={`Add ${name} to your project`}
      tabs={[
        { id: 'cli', label: 'CLI', content: <Cli slug={slug} files={files} /> },
        { id: 'manual', label: 'Copy the code', content: <Manual files={files} /> },
        { id: 'agent', label: 'With an AI agent', content: <Agent prompt={prompt} />, sfx: 'エージェント' },
      ]}
    />
  )
}
