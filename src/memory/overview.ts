import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs"
import { dirname } from "node:path"
import {
  OVERVIEW_INDEX_PATH,
  OVERVIEW_INDEX_META_PATH,
  OVERVIEW_INDEX_TTL_SECONDS,
} from "./paths"
import { writeJson } from "./meta"

export const OVERVIEW_CDN_URL =
  process.env.TICKERCODE_OVERVIEW_URL ??
  "https://cdn.ticker-code.com/cache/api/full/list/overview.json"

export type FiscalYearStatus = "current" | "stale_2y+" | "missing"
export type SegmentDataStatus = "complete" | "partial" | "unavailable"

export type OverviewNarratives = {
  summary: string
  industry: string
  strengths: string[]
  weaknesses: string[]
}

export type OverviewSegment = {
  name: string
  revenue: number | null
  revenue_share: number | null
  op_profit: number | null
  op_margin: number | null
}

export type OverviewItem = {
  code: string
  display_code: string
  company_name: string
  short_name: string | null
  sector33_code: string
  sector33_code_name: string
  market_code_name: string
  narratives: OverviewNarratives | null
  segments: OverviewSegment[]
  segment_count: number
  total_sales: number | null
  fiscal_year: string | null
  fiscal_year_status: FiscalYearStatus
  segment_data_status: SegmentDataStatus
  analysis_as_of: string | null
}

export type OverviewMeta = {
  last_fetch: string
  bytes: number
  items_count: number
  generated_at: string | null
  source: string
}

export type OverviewData = {
  meta: {
    total: number
    generated_at: string
    [k: string]: unknown
  }
  items: OverviewItem[]
}

let cachedOverview: OverviewData | null = null

export function readOverviewMeta(): OverviewMeta | null {
  if (!existsSync(OVERVIEW_INDEX_META_PATH)) return null
  try {
    return JSON.parse(readFileSync(OVERVIEW_INDEX_META_PATH, "utf8")) as OverviewMeta
  } catch {
    return null
  }
}

export function isOverviewFresh(): boolean {
  const meta = readOverviewMeta()
  if (!meta?.last_fetch) return false
  const age = (Date.now() - new Date(meta.last_fetch).getTime()) / 1000
  return age >= 0 && age < OVERVIEW_INDEX_TTL_SECONDS
}

export async function syncOverview(force = false): Promise<OverviewMeta> {
  if (!force && isOverviewFresh()) {
    const meta = readOverviewMeta()
    if (meta) return meta
  }
  const res = await fetch(OVERVIEW_CDN_URL)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch overview.json: ${res.status} ${res.statusText}`,
    )
  }
  const json = (await res.json()) as {
    success?: boolean
    data?: OverviewData
  }
  if (!json.success || !json.data) {
    throw new Error("Invalid overview.json response shape")
  }

  mkdirSync(dirname(OVERVIEW_INDEX_PATH), { recursive: true })
  writeFileSync(OVERVIEW_INDEX_PATH, JSON.stringify(json.data, null, 2))

  const meta: OverviewMeta = {
    last_fetch: new Date().toISOString(),
    bytes: statSync(OVERVIEW_INDEX_PATH).size,
    items_count: json.data.items.length,
    generated_at: json.data.meta?.generated_at ?? null,
    source: OVERVIEW_CDN_URL,
  }
  writeJson(OVERVIEW_INDEX_META_PATH, meta)
  cachedOverview = json.data
  return meta
}

export function loadOverview(): OverviewData {
  if (cachedOverview) return cachedOverview
  if (!existsSync(OVERVIEW_INDEX_PATH)) {
    throw new Error(
      "overview.json not cached yet. Run `tc overview sync` or call syncOverview() first.",
    )
  }
  cachedOverview = JSON.parse(
    readFileSync(OVERVIEW_INDEX_PATH, "utf8"),
  ) as OverviewData
  return cachedOverview
}

export async function ensureOverviewLoaded(): Promise<OverviewData> {
  if (!existsSync(OVERVIEW_INDEX_PATH) || !isOverviewFresh()) {
    await syncOverview(false)
  }
  return loadOverview()
}
