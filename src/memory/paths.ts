import { homedir } from "node:os"
import { join } from "node:path"

export const MEMORY_ROOT =
  process.env.TICKERCODE_MEMORY_DIR ?? join(homedir(), ".tickercode", "memory")

export const MINI_JSON_PATH = join(MEMORY_ROOT, "mini.json")
export const MINI_META_PATH = join(MEMORY_ROOT, "mini.meta.json")
export const INDEX_PATH = join(MEMORY_ROOT, "index.json")
export const CODE_ROOT = join(MEMORY_ROOT, "code")

export function codeDir(displayCode: string): string {
  return join(CODE_ROOT, displayCode)
}

export function endpointPath(displayCode: string, endpoint: string): string {
  return join(codeDir(displayCode), `${endpoint}.json`)
}

export function metaPath(displayCode: string): string {
  return join(codeDir(displayCode), ".meta.json")
}

export const ENDPOINTS = {
  overview: "/api/full/stock",
  financial: "/api/full/financials",
  edinet: "/api/edinet/text",
  disclosure: "/api/disclosure/recent",
  news: "/api/news/feed",
} as const

export type EndpointName = keyof typeof ENDPOINTS

export const TTL_BY_ENDPOINT: Record<EndpointName | "mini", number> = {
  mini: 4 * 3600,
  overview: 1 * 3600,
  financial: 24 * 3600,
  edinet: 7 * 24 * 3600,
  disclosure: 1 * 3600,
  news: 1 * 3600,
}
