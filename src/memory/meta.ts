import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import {
  MEMORY_ROOT,
  INDEX_PATH,
  metaPath,
  codeDir,
  TTL_BY_ENDPOINT,
  type EndpointName,
} from "./paths"

type EndpointMeta = {
  last_fetch: string
  bytes: number
}

export type StockMeta = {
  code: string
  display_code: string
  name?: string
  endpoints: Partial<Record<EndpointName, EndpointMeta>>
  updated_at: string
}

export type Index = {
  codes: string[]
  total: number
  last_sync: string | null
  mini_json: { last_fetch: string | null; count: number }
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true })
}

export function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T
  } catch {
    return null
  }
}

export function writeJson(path: string, data: unknown) {
  ensureDir(dirname(path))
  writeFileSync(path, JSON.stringify(data, null, 2))
}

export function readStockMeta(displayCode: string): StockMeta | null {
  return readJson<StockMeta>(metaPath(displayCode))
}

export function writeStockMeta(meta: StockMeta) {
  writeJson(metaPath(meta.display_code), meta)
}

export function readIndex(): Index {
  return (
    readJson<Index>(INDEX_PATH) ?? {
      codes: [],
      total: 0,
      last_sync: null,
      mini_json: { last_fetch: null, count: 0 },
    }
  )
}

export function writeIndex(index: Index) {
  writeJson(INDEX_PATH, index)
}

export function upsertIndexCode(displayCode: string) {
  const index = readIndex()
  if (!index.codes.includes(displayCode)) {
    index.codes.push(displayCode)
    index.codes.sort()
    index.total = index.codes.length
  }
  index.last_sync = new Date().toISOString()
  writeIndex(index)
}

export function isFresh(lastFetchIso: string | null | undefined, ttlSeconds: number): boolean {
  if (!lastFetchIso) return false
  const fetchedAt = new Date(lastFetchIso).getTime()
  const age = (Date.now() - fetchedAt) / 1000
  return age < ttlSeconds
}

export function endpointIsFresh(displayCode: string, endpoint: EndpointName): boolean {
  const meta = readStockMeta(displayCode)
  const epMeta = meta?.endpoints?.[endpoint]
  return isFresh(epMeta?.last_fetch, TTL_BY_ENDPOINT[endpoint])
}

export { MEMORY_ROOT, codeDir }
