import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from "node:fs"
import { dirname } from "node:path"
import { MINI_JSON_PATH, MINI_META_PATH, TTL_BY_ENDPOINT } from "./paths"
import { isFresh, writeJson } from "./meta"

export const MINI_CDN_URL =
  process.env.TICKERCODE_MINI_URL ??
  "https://cdn.ticker-code.com/cache/api/full/list/mini.json"

export type MiniMeta = {
  last_fetch: string
  bytes: number
  items_count: number
  tags_count: number
  source: string
}

export type StockItem = {
  code: string
  display_code: string
  company_name: string
  short_name?: string
  sector33_code?: string
  market_code?: string
  market_capitalization?: number | null
  stock_price?: string | null
  i_per?: string | null
  i_forecast_per?: string | null
  i_forecast_peg?: string | null
  i_pbr?: string | null
  i_psr?: string | null
  i_roe?: string | null
  i_roa?: string | null
  i_roic?: string | null
  i_dividend_yield?: string | null
  i_forecast_dividend_yield?: string | null
  i_gross_margin?: string | null
  i_operating_margin?: string | null
  i_net_margin?: string | null
  i_equity_ratio?: string | null
  i_ocf_yield?: string | null
  i_fcf_yield?: string | null
  yoy3y_sales?: string | null
  yoy3y_op_profit?: string | null
  yoy3y_net_profit?: string | null
  [key: string]: unknown
}

export type MiniData = {
  items: StockItem[]
  tags: unknown[]
  meta: Record<string, unknown>
}

let cachedMini: MiniData | null = null

export function readMiniMeta(): MiniMeta | null {
  if (!existsSync(MINI_META_PATH)) return null
  try {
    return JSON.parse(readFileSync(MINI_META_PATH, "utf8")) as MiniMeta
  } catch {
    return null
  }
}

export function isMiniFresh(): boolean {
  const meta = readMiniMeta()
  return isFresh(meta?.last_fetch, TTL_BY_ENDPOINT.mini)
}

export async function syncMini(force = false): Promise<MiniMeta> {
  if (!force && isMiniFresh()) {
    const meta = readMiniMeta()
    if (meta) return meta
  }
  const res = await fetch(MINI_CDN_URL)
  if (!res.ok) throw new Error(`Failed to fetch mini.json: ${res.status} ${res.statusText}`)
  const json = (await res.json()) as { success?: boolean; data?: MiniData }
  if (!json.success || !json.data) throw new Error("Invalid mini.json response shape")

  mkdirSync(dirname(MINI_JSON_PATH), { recursive: true })
  writeFileSync(MINI_JSON_PATH, JSON.stringify(json.data, null, 2))

  const meta: MiniMeta = {
    last_fetch: new Date().toISOString(),
    bytes: statSync(MINI_JSON_PATH).size,
    items_count: json.data.items.length,
    tags_count: json.data.tags.length,
    source: MINI_CDN_URL,
  }
  writeJson(MINI_META_PATH, meta)
  cachedMini = json.data
  return meta
}

export function loadMini(): MiniData {
  if (cachedMini) return cachedMini
  if (!existsSync(MINI_JSON_PATH)) {
    throw new Error(
      "mini.json not cached yet. Run `tc memory sync-mini` or call syncMini() first.",
    )
  }
  cachedMini = JSON.parse(readFileSync(MINI_JSON_PATH, "utf8")) as MiniData
  return cachedMini
}

export async function ensureMiniLoaded(): Promise<MiniData> {
  if (!existsSync(MINI_JSON_PATH) || !isMiniFresh()) {
    await syncMini(false)
  }
  return loadMini()
}

export function findByCode(displayCode: string): StockItem | null {
  const mini = loadMini()
  return (
    mini.items.find(
      (s) => s.display_code === displayCode || s.code === displayCode,
    ) ?? null
  )
}
