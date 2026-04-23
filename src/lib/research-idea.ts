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
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export function themeToAsciiSlug(theme: string): string {
  return theme
    .toLowerCase()
    .replace(SLUG_SAFE_RE, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
}

export function generateSlug({ theme, date = new Date(), override }: SlugInput): string {
  if (override && override.trim()) return override.trim()
  const jst = new Date(date.getTime() + JST_OFFSET_MS)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0")
  const d = String(jst.getUTCDate()).padStart(2, "0")
  const hash = createHash("sha1")
    .update(theme)
    .digest("hex")
    .slice(0, 8)
  const asciiPart = themeToAsciiSlug(theme)
  const head = asciiPart.length > 0 ? `${asciiPart}-` : "theme-"
  return `${head}${y}${m}${d}-${hash}`
}

export type SectorStat = {
  sector_code: string
  sector_name: string
  count: number
  share: number
}

export function sectorBreakdown(items: ShortlistItem[]): SectorStat[] {
  if (items.length === 0) return []
  const map = new Map<string, SectorStat>()
  for (const s of items) {
    const key = s.sector33_code
    const cur = map.get(key)
    if (cur) {
      cur.count += 1
    } else {
      map.set(key, {
        sector_code: key,
        sector_name: s.sector33_code_name,
        count: 1,
        share: 0,
      })
    }
  }
  const total = items.length
  const stats = Array.from(map.values()).map((s) => ({
    ...s,
    share: s.count / total,
  }))
  stats.sort((a, b) => b.count - a.count || a.sector_code.localeCompare(b.sector_code))
  return stats
}

// ──────────────────────────────────────────
// Markdown writers (pure)
// ──────────────────────────────────────────

export type SearchMatchMode = "any" | "all"

export function fmtKeywordsMd(
  theme: string,
  keywords: string[],
  matchMode: SearchMatchMode,
): string {
  return [
    `# 01 · Keywords`,
    "",
    `**Theme**: ${theme}`,
    "",
    `**Match mode**: \`${matchMode}\``,
    "",
    `**Keywords**:`,
    "",
    keywords.map((k) => `- \`${k}\``).join("\n"),
    "",
  ].join("\n")
}

export function fmtHitsMd(
  theme: string,
  hits: SearchHit[],
  hitsLimit?: number,
): string {
  const total = hits.length
  const truncated = hitsLimit && hitsLimit > 0 && total > hitsLimit
  const shown = truncated ? hits.slice(0, hitsLimit!) : hits
  const header = `| # | code | company | sector | fiscal | seg | matched | fields |`
  const sep = `|---|------|---------|--------|--------|-----|---------|--------|`
  const rows = shown.map((h, i) =>
    [
      `| ${i + 1}`,
      `| ${h.display_code}`,
      `| ${h.company_name}`,
      `| ${h.sector33_code_name}`,
      `| ${h.fiscal_year_status}`,
      `| ${h.segment_data_status}`,
      `| ${h.matched_keywords.join("、")}`,
      `| ${h.matched_fields.join(", ")} |`,
    ].join(" "),
  )
  const note = truncated
    ? `_Showing first ${hitsLimit} of ${total} hits. Full list in hits.json._`
    : ""
  return [
    `# 02 · Keyword Hits (${total})`,
    "",
    `Theme: ${theme}`,
    "",
    ...(note ? [note, ""] : []),
    header,
    sep,
    ...rows,
    "",
  ].join("\n")
}

function fmtNumeric(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return "—"
  return v.toFixed(digits)
}

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—"
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}兆`
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}億`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}百万`
  return String(v)
}

function fmtPct(share: number): string {
  return `${(share * 100).toFixed(1)}%`
}

function fmtSectorBreakdownMd(stats: SectorStat[]): string {
  if (stats.length === 0) return ""
  const head = `| sector | code | count | share |`
  const sep = `|--------|------|-------|-------|`
  const rows = stats.map(
    (s) => `| ${s.sector_name} | ${s.sector_code} | ${s.count} | ${fmtPct(s.share)} |`,
  )
  return [
    `## セクター分布 (${stats.length})`,
    "",
    head,
    sep,
    ...rows,
    "",
  ].join("\n")
}

export function fmtShortlistMd(
  theme: string,
  shortlist: ShortlistItem[],
  screenConditions: Array<{ field: string; op: string; value: number }>,
): string {
  const cond =
    screenConditions.length > 0
      ? `Filters: ${screenConditions
          .map((c) => `\`${c.field} ${c.op} ${c.value}\``)
          .join(" AND ")}`
      : "Filters: (none)"
  const breakdown = sectorBreakdown(shortlist)
  const header =
    `| # | code | company | sector | mcap | fwd PER | PBR | fwd ROE | 3y sales | matched |`
  const sep = `|---|------|---------|--------|------|---------|-----|---------|----------|---------|`
  const rows = shortlist.map((s, i) =>
    [
      `| ${i + 1}`,
      `| ${s.display_code}`,
      `| ${s.company_name}`,
      `| ${s.sector33_code_name}`,
      `| ${fmtYen(s.market_capitalization)}`,
      `| ${fmtNumeric(s.i_forward_per)}`,
      `| ${fmtNumeric(s.i_pbr)}`,
      `| ${fmtNumeric(s.i_forward_roe)}`,
      `| ${fmtNumeric(s.yoy3y_sales)}`,
      `| ${s.matched_keywords.join("、")} |`,
    ].join(" "),
  )
  return [
    `# 03 · Shortlist (${shortlist.length})`,
    "",
    `Theme: ${theme}`,
    "",
    cond,
    "",
    fmtSectorBreakdownMd(breakdown),
    `## 銘柄一覧`,
    "",
    header,
    sep,
    ...rows,
    "",
  ].join("\n")
}

export function fmtFinalMdSkeleton(
  theme: string,
  slug: string,
  counts: { hits: number; shortlist: number },
  shortlist: ShortlistItem[],
  topN = 10,
): string {
  const n = Math.max(1, topN)
  const codeList = shortlist
    .slice(0, n)
    .map((s) => `- [ ] ${s.display_code} ${s.company_name}`)
    .join("\n")
  return [
    `# ${theme} — 候補分析レポート`,
    "",
    `> Slug: \`${slug}\`  |  Hits: ${counts.hits}  |  Shortlist: ${counts.shortlist}  |  Generated: ${new Date().toISOString()}`,
    "",
    `## テーマの全体像`,
    "",
    `<!-- Agent: このテーマが今なぜ重要か、背景と前提を 2-3 段落で書く -->`,
    "",
    `## 選定フロー`,
    "",
    `1. Keyword: 02-hits.md (${counts.hits} 社)`,
    `2. Shortlist: 03-shortlist.md (${counts.shortlist} 社)`,
    `3. 深堀り候補 (top ${n}):`,
    "",
    codeList,
    "",
    `## 最終候補 top N`,
    "",
    `<!-- Agent: shortlist から深堀りした上で、投資テーマに純粋に当たる企業を選出し、1 段落/社 で書く -->`,
    "",
    `## スコア表`,
    "",
    `<!-- Agent: 4 軸 (テーマ整合性 / 成長性 / バリュエーション / 収益性) で 5 点満点採点 -->`,
    "",
    `## 勝ち / 負けシナリオ`,
    "",
    `<!-- Agent: テーマが追い風/逆風になるケース別に、候補群の期待値を描く -->`,
    "",
    `## リスク要因`,
    "",
    `<!-- Agent: セクター共通の逆風、個別企業の脆弱性 -->`,
    "",
    `## データソース / 基準日`,
    "",
    `- overview.json: \`cdn.ticker-code.com/cache/api/full/list/overview.json\``,
    `- mini.json: 直近指標 (i_forward_*, yoy3y_*)`,
    `- 深堀り: \`tc memory fetch\` + \`tc stock\` / \`tc financial\``,
    "",
  ].join("\n")
}
