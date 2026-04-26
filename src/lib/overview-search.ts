import type {
  FiscalYearStatus,
  OverviewItem,
  SegmentDataStatus,
} from "../memory/overview"
import {
  computeFiscalYearStatus,
  computeSegmentDataStatus,
} from "./overview-status"

export type SearchMatchMode = "any" | "all"

export type SearchOptions = {
  keywords: string[]
  matchMode?: SearchMatchMode
  includeIndustry?: boolean
  includeSegmentNames?: boolean
  fiscalStatusAllow?: FiscalYearStatus[]
  segmentStatusAllow?: SegmentDataStatus[]
  sectorCodes?: string[]
  caseSensitive?: boolean
  limit?: number
  /**
   * true の場合、segment.insights か各 segment.analysis に AI 分析がある銘柄のみ通す。
   * jsonb 切替後の新機能。
   */
  requireAiAnalysis?: boolean
  /**
   * 主力 segment（revenue_share 最大）の revenue_yoy が閾値以上の銘柄のみ通す。
   * 0-1 スケール（0.1 = 10% 成長）。null は除外。
   */
  minRevenueYoy?: number
}

export type SearchHit = {
  code: string
  display_code: string
  company_name: string
  sector33_code: string
  sector33_code_name: string
  market_code_name: string
  fiscal_year: string | null
  fiscal_year_status: FiscalYearStatus
  segment_data_status: SegmentDataStatus
  analysis_as_of: string | null
  matched_keywords: string[]
  matched_fields: string[]
}

type FieldSource = { field: string; text: string }

function collectFields(
  item: OverviewItem,
  includeIndustry: boolean,
  includeSegmentNames: boolean,
): FieldSource[] {
  const out: FieldSource[] = []
  if (item.narratives) {
    if (item.narratives.summary) {
      out.push({ field: "summary", text: item.narratives.summary })
    }
    if (includeIndustry && item.narratives.industry) {
      out.push({ field: "industry", text: item.narratives.industry })
    }
    if (item.narratives.strengths && item.narratives.strengths.length > 0) {
      out.push({
        field: "strengths",
        text: item.narratives.strengths.join(" "),
      })
    }
    if (item.narratives.weaknesses && item.narratives.weaknesses.length > 0) {
      out.push({
        field: "weaknesses",
        text: item.narratives.weaknesses.join(" "),
      })
    }
  }
  const segData = item.segment
  if (segData) {
    if (includeSegmentNames && segData.segments.length > 0) {
      out.push({
        field: "segments",
        text: segData.segments.map((s) => s.name).join(" "),
      })
    }
    // AI 分析の散文もキーワード検索対象に加える（新 shape で追加された情報）
    if (segData.insights) {
      out.push({ field: "segment_insights", text: segData.insights })
    }
    const perSegAnalysis = segData.segments
      .map((s) => s.analysis ?? "")
      .filter(Boolean)
      .join(" ")
    if (perSegAnalysis) {
      out.push({ field: "segment_analysis", text: perSegAnalysis })
    }
  }
  return out
}

function matches(needle: string, haystack: string, caseSensitive: boolean): boolean {
  if (caseSensitive) return haystack.includes(needle)
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function searchOverview(
  items: OverviewItem[],
  opts: SearchOptions,
): SearchHit[] {
  const {
    keywords,
    matchMode = "any",
    includeIndustry = true,
    includeSegmentNames = true,
    fiscalStatusAllow,
    segmentStatusAllow,
    sectorCodes,
    caseSensitive = false,
    limit,
    requireAiAnalysis,
    minRevenueYoy,
  } = opts

  if (!keywords || keywords.length === 0) return []
  const normKws = keywords.map((k) => k.trim()).filter(Boolean)
  if (!normKws || normKws.length === 0) return []
  if (!Array.isArray(items)) {
    throw new Error('searchOverview: items must be an array, got ' + typeof items)
  }

  const hits: SearchHit[] = []
  for (const item of items) {
    const fyStatus = computeFiscalYearStatus(item.segment)
    const segStatus = computeSegmentDataStatus(item.segment)
    if (fiscalStatusAllow && !fiscalStatusAllow.includes(fyStatus)) {
      continue
    }
    if (segmentStatusAllow && !segmentStatusAllow.includes(segStatus)) {
      continue
    }
    if (sectorCodes && !sectorCodes.includes(item.sector33_code)) {
      continue
    }

    // requireAiAnalysis: insights か segments[].analysis に AI 分析がある銘柄のみ通す
    if (requireAiAnalysis) {
      const hasInsights =
        typeof item.segment?.insights === "string" && item.segment.insights.length > 0
      const hasPerSegment = (item.segment?.segments ?? []).some(
        (s) => typeof s.analysis === "string" && s.analysis.length > 0,
      )
      if (!hasInsights && !hasPerSegment) continue
    }

    // minRevenueYoy: 主力 segment (revenue_share 最大) の revenue_yoy >= threshold
    if (minRevenueYoy != null) {
      const segs = item.segment?.segments ?? []
      let dominant: (typeof segs)[number] | null = null
      let maxShare = -Infinity
      for (const s of segs) {
        const share = s.numbers.latest.revenue_share
        if (share != null && share > maxShare) {
          maxShare = share
          dominant = s
        }
      }
      const yoy = dominant?.numbers.latest.revenue_yoy
      if (yoy == null || yoy < minRevenueYoy) continue
    }

    const sources = collectFields(item, includeIndustry, includeSegmentNames)
    if (sources.length === 0) continue

    const matchedKeywords = new Set<string>()
    const matchedFields = new Set<string>()
    for (const kw of normKws) {
      for (const src of sources) {
        if (matches(kw, src.text, caseSensitive)) {
          matchedKeywords.add(kw)
          matchedFields.add(src.field)
        }
      }
    }

    if (matchMode === "all" && matchedKeywords.size !== normKws.length) {
      continue
    }
    if (matchedKeywords.size === 0) continue

    hits.push({
      code: item.code,
      display_code: item.display_code,
      company_name: item.company_name,
      sector33_code: item.sector33_code,
      sector33_code_name: item.sector33_code_name,
      market_code_name: item.market_code_name,
      fiscal_year: item.segment?.fiscal_year ?? null,
      fiscal_year_status: fyStatus,
      segment_data_status: segStatus,
      analysis_as_of: item.analysis_as_of,
      matched_keywords: Array.from(matchedKeywords),
      matched_fields: Array.from(matchedFields),
    })
    if (limit && hits.length >= limit) break
  }
  return hits
}

export function parseKeywordsArg(arg: string | undefined): string[] {
  if (!arg) return []
  return arg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}
