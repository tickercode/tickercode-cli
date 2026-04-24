import { writeFileSync, mkdirSync, statSync, readFileSync } from "node:fs"
import { postJson } from "../lib/api-client"
import { normalizeCode } from "../lib/code"
import { unwrap } from "../lib/format"
import {
  ENDPOINTS,
  endpointPath,
  codeDir,
  type EndpointName,
} from "./paths"
import {
  readStockMeta,
  writeStockMeta,
  upsertIndexCode,
  endpointIsFresh,
  type StockMeta,
} from "./meta"

export type FetchOptions = {
  endpoints?: EndpointName[]
  force?: boolean
}

export type FetchResult = {
  code: string
  display_code: string
  dir: string
  fetched: EndpointName[]
  skipped: EndpointName[]
  failed: { endpoint: EndpointName; error: string }[]
}

export function bodyFor(endpoint: EndpointName, code5: string): unknown {
  switch (endpoint) {
    case "disclosure":
      return { stock_code: code5, limit: 30 }
    case "news":
      return { stock_code: code5, limit: 20 }
    case "edinet":
      return { stock_code: code5 }
    default:
      return { code: code5 }
  }
}

export async function fetchStock(
  displayCodeOrFull: string,
  opts: FetchOptions = {},
): Promise<FetchResult> {
  const code5 = normalizeCode(displayCodeOrFull)
  const displayCode = code5.endsWith("0") ? code5.slice(0, 4) : code5

  const targetEndpoints = (opts.endpoints ?? (Object.keys(ENDPOINTS) as EndpointName[])) as EndpointName[]

  mkdirSync(codeDir(displayCode), { recursive: true })

  const result: FetchResult = {
    code: code5,
    display_code: displayCode,
    dir: codeDir(displayCode),
    fetched: [],
    skipped: [],
    failed: [],
  }

  const tasks = targetEndpoints.map(async (endpoint) => {
    if (!opts.force && endpointIsFresh(displayCode, endpoint)) {
      result.skipped.push(endpoint)
      return
    }
    try {
      const raw = await postJson(ENDPOINTS[endpoint], bodyFor(endpoint, code5))
      const data = unwrap(raw)
      const path = endpointPath(displayCode, endpoint)
      writeFileSync(path, JSON.stringify(data, null, 2))
      result.fetched.push(endpoint)
    } catch (err) {
      result.failed.push({ endpoint, error: (err as Error).message })
    }
  })

  await Promise.all(tasks)

  const existing = readStockMeta(displayCode)
  const now = new Date().toISOString()
  const overviewData =
    result.fetched.includes("overview") || existing?.endpoints?.overview
      ? safeReadJson(endpointPath(displayCode, "overview"))
      : null
  const name =
    (overviewData as { company_name?: string } | null)?.company_name ??
    existing?.name

  const meta: StockMeta = {
    code: code5,
    display_code: displayCode,
    name,
    endpoints: { ...(existing?.endpoints ?? {}) },
    updated_at: now,
  }

  for (const ep of result.fetched) {
    const bytes = safeSize(endpointPath(displayCode, ep))
    meta.endpoints[ep] = { last_fetch: now, bytes }
  }

  writeStockMeta(meta)
  upsertIndexCode(displayCode)

  return result
}

function safeSize(path: string): number {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

function safeReadJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return null
  }
}
