import { createHash } from "node:crypto"
import type { SearchHit } from "./overview-search"
import type { StockItem } from "../memory/mini"
import { applyFilters, type NumericCondition } from "./screen"

export type ShortlistItem = SearchHit & {
  market_capitalization: number | null
  i_forward_per: number | null
  i_pbr: number | null
  i_forward_roe: number | null
  yoy3y_sales: number | null
  yoy3y_op_profit: number | null
  stock_price: string | null
}

export type BuildShortlistInput = {
  hits: SearchHit[]
  miniByCode: Map<string, StockItem>
  numericConditions: NumericCondition[]
  includeNull?: boolean
  targetSize: number
}

export function parseMaybeNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const n = Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

export function joinHitsWithMini(
  hits: SearchHit[],
  miniByCode: Map<string, StockItem>,
): ShortlistItem[] {
  return hits.map((h) => {
    const mini = miniByCode.get(h.display_code) ?? miniByCode.get(h.code)
    return {
      ...h,
      market_capitalization:
        typeof mini?.market_capitalization === "number"
          ? mini.market_capitalization
          : parseMaybeNumber(mini?.market_capitalization),
      i_forward_per: parseMaybeNumber(mini?.i_forward_per),
      i_pbr: parseMaybeNumber(mini?.i_pbr),
      i_forward_roe: parseMaybeNumber(mini?.i_forward_roe),
      yoy3y_sales: parseMaybeNumber(mini?.yoy3y_sales),
      yoy3y_op_profit: parseMaybeNumber(mini?.yoy3y_op_profit),
      stock_price:
        typeof mini?.stock_price === "string" ? mini.stock_price : null,
    }
  })
}

export function buildShortlist(input: BuildShortlistInput): ShortlistItem[] {
  const { hits, miniByCode, numericConditions, includeNull = false, targetSize } =
    input
  const joined = joinHitsWithMini(hits, miniByCode)
  const filtered = applyFilters(
    joined as unknown as Record<string, unknown>[],
    { numeric: numericConditions, includeNull },
  ) as unknown as ShortlistItem[]
  if (targetSize > 0 && filtered.length > targetSize) {
    return filtered.slice(0, targetSize)
  }
  return filtered
}

export type SlugInput = {
  theme: string
  date?: Date
  override?: string
}

const SLUG_SAFE_RE = /[^a-z0-9-]+/g

export function themeToAsciiSlug(theme: string): string {
  return theme
    .toLowerCase()
    .replace(SLUG_SAFE_RE, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
}

export function generateSlug({ theme, date = new Date(), override }: SlugInput): string {
  if (override && override.trim()) return override.trim()
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  const hash = createHash("sha1")
    .update(theme)
    .digest("hex")
    .slice(0, 8)
  const asciiPart = themeToAsciiSlug(theme)
  const head = asciiPart.length > 0 ? `${asciiPart}-` : "theme-"
  return `${head}${y}${m}${d}-${hash}`
}
