export type Entry = { slug: string; name: string; category: string; description: string }
export type RegistryBrand = { name: string; package: string; docs: string }
export function readEntries(root?: string): Entry[]
export function buildRegistry(opts: { brand: RegistryBrand; root?: string; version?: string }): Record<string, string>
export function writeRegistry(out: string, opts: { brand: RegistryBrand; root?: string; version?: string }): number
