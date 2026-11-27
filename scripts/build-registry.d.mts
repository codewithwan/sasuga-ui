export type Entry = { slug: string; name: string; category: string; description: string }
export type RegistryBrand = { name: string; package: string; docs: string }
export type Framework = { id: string; title: string; status: string; package: string; requires?: string; inProgress: string[] }
export type KitFile = { path: string; type: string; target: string }
export const PATHS: { docs: string; entries: string; html: string; core: string; roadmap: string }
export const DEFAULT_FRAMEWORK: string
export function readEntries(root?: string): Entry[]
export function readFrameworks(root?: string): Framework[]
export function kitFiles(root: string, framework: string): { core: KitFile[]; kit: KitFile[] }
export function buildRegistry(opts: { brand: RegistryBrand; root?: string; version?: string }): Record<string, string>
export function writeRegistry(out: string, opts: { brand: RegistryBrand; root?: string; version?: string }): number
