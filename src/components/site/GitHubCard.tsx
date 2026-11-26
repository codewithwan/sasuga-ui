import { useEffect, useState } from 'react'
import { ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { RollingNumber } from '@/components/ui/rolling-number'
import { Skeleton, SkeletonSwap } from '@/components/ui/skeleton'
import { profile } from '@/data/profile'

type GitHubUser = {
  login: string
  name: string | null
  bio: string | null
  location: string | null
  blog: string | null
  html_url: string
  followers?: number
  following?: number
  public_repos?: number
}

const TTL = 60 * 60 * 1000
const cacheKey = (login: string) => `ui-kit:github:v2:${login.toLowerCase()}`

/* Used when the API is rate-limited or offline: no invented numbers, just who it is. */
const fallback = (login: string): GitHubUser =>
  login.toLowerCase() === profile.handle
    ? {
        login: profile.handle,
        name: null,
        bio: 'Fullstack dev and security researcher.',
        location: null,
        blog: profile.socials.find((s) => s.label === 'Website')?.href ?? null,
        html_url: `https://github.com/${profile.handle}`,
      }
    : { login, name: null, bio: null, location: null, blog: null, html_url: `https://github.com/${login}` }

function readCache(login: string): GitHubUser | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(login))
    if (!raw) return null
    const { at, user } = JSON.parse(raw) as { at: number; user: GitHubUser }
    return Date.now() - at < TTL ? user : null
  } catch {
    return null
  }
}

/* One request per session per user, shared by every card (a failure is remembered too). */
const pending = new Map<string, Promise<GitHubUser | null>>()
function loadUser(login: string) {
  let p = pending.get(login)
  if (p) return p
  p = fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? (r.json() as Promise<GitHubUser>) : null))
    .then((u) => {
      if (!u?.login) return null
      const user: GitHubUser = {
        login: u.login,
        // the author is credited by handle only
        name: u.login.toLowerCase() === profile.handle ? null : u.name,
        bio: u.bio,
        location: u.location,
        blog: u.blog,
        html_url: u.html_url,
        followers: u.followers,
        following: u.following,
        public_repos: u.public_repos,
      }
      try {
        sessionStorage.setItem(cacheKey(login), JSON.stringify({ at: Date.now(), user }))
      } catch {
        /* storage full or blocked: the in-memory promise still caches it */
      }
      return user
    })
    .catch(() => null)
  pending.set(login, p)
  return p
}

const href = (blog: string) => (/^https?:\/\//i.test(blog) ? blog : `https://${blog}`)
const host = (blog: string) => blog.replace(/^https?:\/\//i, '').replace(/\/$/, '')

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-0 flex-col-reverse items-center gap-1 px-1 py-2">
      <dt className="text-[11px] leading-none font-bold text-mute">{label}</dt>
      <dd className="m-0">
        <RollingNumber value={value} from={0} separator live={false} className="ui-head text-xl leading-none text-ink" />
      </dd>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="grid gap-3.5">
      <div className="flex items-center gap-3">
        <Skeleton className="ui-pill size-14 shrink-0" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export type GitHubCardProps = { login?: string; className?: string }

/**
 * A GitHub profile card: avatar, name, bio, location and site, and rolling follower /
 * following / repo counts from the public API (cached for the session). Shows a skeleton
 * while it loads and the static profile when the API is rate-limited or offline.
 */
export function GitHubCard({ login = profile.handle, className }: GitHubCardProps) {
  const [user, setUser] = useState<GitHubUser | null>(() => readCache(login))
  const [failed, setFailed] = useState(false)
  const loading = !user && !failed

  useEffect(() => {
    if (user) return
    let live = true
    loadUser(login).then((u) => {
      if (!live) return
      if (u) setUser(u)
      else setFailed(true)
    })
    return () => {
      live = false
    }
  }, [login, user])

  const u = user ?? fallback(login)
  const stats = u.followers !== undefined && u.following !== undefined && u.public_repos !== undefined
  const blog = u.blog?.trim()

  return (
    <div className={className ?? 'w-[min(300px,calc(100vw-48px))]'}>
      <SkeletonSwap loading={loading} fallback={<CardSkeleton />} className="grid gap-3.5">
        <div className="flex items-center gap-3">
          <img
            src={`https://github.com/${encodeURIComponent(u.login)}.png?size=112`}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="ui-pill ui-border-thin size-14 shrink-0 bg-canvas object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="ui-head m-0 truncate text-lg leading-tight text-ink">{u.name ?? u.login}</p>
            <p className="m-0 truncate font-mono text-[13px] leading-snug text-mute">@{u.login}</p>
          </div>
          <Icon name="github" tone="line" size={20} className="shrink-0 self-start text-mute" />
        </div>

        {u.bio && <p className="m-0 text-sm leading-snug text-ink">{u.bio}</p>}

        {(u.location || blog) && (
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[13px] leading-snug font-semibold text-mute">
            {u.location && (
              <li className="inline-flex min-w-0 items-center gap-1.5">
                <Icon name="map" tone="line" size={14} />
                <span className="truncate">{u.location}</span>
              </li>
            )}
            {blog && (
              <li className="inline-flex min-w-0 items-center gap-1.5">
                <Icon name="home" tone="line" size={14} />
                <a
                  href={href(blog)}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-ink underline decoration-accent decoration-2 underline-offset-2 hover:text-accent focus-visible:ui-focus"
                >
                  {host(blog)}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
          </ul>
        )}

        {stats ? (
          <dl className="ui-r-sm m-0 grid grid-cols-3 divide-x divide-line bg-canvas">
            <Stat label="Followers" value={u.followers ?? 0} />
            <Stat label="Following" value={u.following ?? 0} />
            <Stat label="Repos" value={u.public_repos ?? 0} />
          </dl>
        ) : (
          <p className="ui-r-sm m-0 bg-canvas px-3 py-2 text-xs leading-snug font-semibold text-mute">Live stats are taking a break. GitHub has the latest.</p>
        )}

        <ButtonLink
          href={u.html_url}
          target="_blank"
          rel="noreferrer"
          variant="accent"
          size="sm"
          sfx={false}
          power={0.6}
          icon={<Icon name="github" tone="line" />}
          className="w-full"
        >
          View profile
          <span className="sr-only"> on GitHub (opens in a new tab)</span>
        </ButtonLink>
      </SkeletonSwap>
    </div>
  )
}
